import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export function activate(context: vscode.ExtensionContext) {
  const provider = new LLMStudioViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("llmStudioSidebarView", provider)
  );
}

class LLMStudioViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    const webview = webviewView.webview;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    // Path to your built React app files
    const distPath = vscode.Uri.joinPath(this.context.extensionUri, "dist-webview");
    const indexPath = vscode.Uri.joinPath(distPath, "index.html");

    // Read and rewrite paths in HTML
    let html = fs.readFileSync(indexPath.fsPath, "utf8");
    html = html.replace(/(src|href)="([^"]+)"/g, (match, attr, url) => {
      if (url.startsWith("http") || url.startsWith("data:")) {
        return match;
      }
      const resourceUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, url));
      return `${attr}="${resourceUri.toString()}"`;
    });

    webview.html = html;

    webview.onDidReceiveMessage(async (message) => {
      try {
        if (message.command === "compareModels") {
          const prompt = message.prompt as string;
          const models = message.models as string[];
          const results = await fetchCompareModels(prompt, models);
          webview.postMessage({ command: "compareModelsResponse", responses: results });
        } else if (message.command === "singleModelQuery") {
          const prompt = message.prompt as string;
          const model = message.model as string;
          const result = await fetchSingleModel(prompt, model);
          webview.postMessage({ command: "singleModelResponse", ...result });
        } else if (message.command === "judge") {
          const judgeResult = await fetchJudgeResult(message);
          webview.postMessage({ command: "judgeResponse", evaluation: judgeResult });
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`Error fetching LLM responses: ${errorMsg}`);
        webview.postMessage({ command: "error", error: errorMsg });
      }
    });
  }
}

// Helper function to call your backend compare-models API
async function fetchCompareModels(prompt: string, models: string[]) {
  const resp = await fetch("http://localhost:3100/compare-models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, models }),
  });

  if (!resp.ok) {
    throw new Error(`API responded with status ${resp.status}`);
  }
  const data = await resp.json();
  return data.results; // expecting array [{ model, response, tokensUsed }]
}

// Helper to call backend single-model API
async function fetchSingleModel(prompt: string, model: string) {
  const resp = await fetch("http://localhost:3100/single-model", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model }),
  });

  if (!resp.ok) {
    throw new Error(`API responded with status ${resp.status}`);
  }
  const data = await resp.json();
  return data; // { model, response, tokensUsed }
}

// Helper to call backend judge API
async function fetchJudgeResult(message: any) {
  const resp = await fetch("http://localhost:3100/judge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: message.prompt,
      model_a: message.model_a,
      response_a: message.response_a,
      model_b: message.model_b,
      response_b: message.response_b,
    }),
  });

  if (!resp.ok) {
    throw new Error(`API responded with status ${resp.status}`);
  }
  const data = await resp.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data.evaluation;
}

export function deactivate() {}
