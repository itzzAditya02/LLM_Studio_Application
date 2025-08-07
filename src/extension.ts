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

    const distPath = vscode.Uri.joinPath(this.context.extensionUri, "dist-webview");
    const indexPath = vscode.Uri.joinPath(distPath, "index.html");

    let html = fs.readFileSync(indexPath.fsPath, "utf8");
    html = html.replace(/(src|href)="([^"]+)"/g, (match, attr, url) => {
      if (url.startsWith("http") || url.startsWith("data:")) return match;
      const resourceUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, url));
      return `${attr}="${resourceUri.toString()}"`;
    });

    webview.html = html;

    // 🔥 Send open file info when webview loads
    const sendOpenFile = () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const fileName = path.basename(editor.document.uri.fsPath);
      const fileContent = editor.document.getText();

      webview.postMessage({
        command: "openFileInfo",
        fileName,
        fileContent,
      });
    };

    sendOpenFile(); // Initial send on load

    // Re-send if user changes active file
    vscode.window.onDidChangeActiveTextEditor(() => {
      sendOpenFile();
    });

    // Handle messages FROM the webview
    webview.onDidReceiveMessage(async (message) => {
      try {
        switch (message.command) {
          case "compareModels": {
            const { prompt, models } = message;
            const results = await fetchCompareModels(prompt, models);
            webview.postMessage({ command: "compareModelsResponse", responses: results });
            break;
          }

          case "singleModelQuery": {
            const { prompt, model } = message;
            const result = await fetchSingleModel(prompt, model);
            webview.postMessage({ command: "singleModelResponse", ...result });
            break;
          }

          case "judge": {
            const judgeResult = await fetchJudgeResult(message);
            webview.postMessage({ command: "judgeResponse", evaluation: judgeResult });
            break;
          }

          case "uploadAttachedFile": {
            const { fileName, content } = message;
            console.log(`Received file: ${fileName}`);
            break;
          }

          case "downloadResponse": {
            const { model, content } = message;

            const defaultUri = vscode.Uri.file(
              path.join(require("os").homedir(), `${model.replace(/\s+/g, "_")}_response.txt`)
            );

            const uri = await vscode.window.showSaveDialog({
              defaultUri,
              filters: { Text: ["txt"] },
              saveLabel: "Save LLM Response",
            });

            if (uri) {
              fs.writeFileSync(uri.fsPath, content, "utf8");
              vscode.window.showInformationMessage(`Response saved to: ${uri.fsPath}`);
              webview.postMessage({
                command: "downloadComplete",
                path: uri.fsPath,
              });
            } else {
              vscode.window.showWarningMessage("Save cancelled.");
            }

            break;
          }

          default:
            vscode.window.showWarningMessage(`Unknown command received: ${message.command}`);
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`Error: ${errorMsg}`);
        webview.postMessage({ command: "error", error: errorMsg });
      }
    });
  }
}

// === Backend API helpers ===

async function fetchCompareModels(prompt: string, models: string[]) {
  const resp = await fetch("http://localhost:3100/compare-models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, models }),
  });
  if (!resp.ok) throw new Error(`API responded with status ${resp.status}`);
  const data = await resp.json();
  return data.results;
}

async function fetchSingleModel(prompt: string, model: string) {
  const resp = await fetch("http://localhost:3100/single-model", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model }),
  });
  if (!resp.ok) throw new Error(`API responded with status ${resp.status}`);
  const data = await resp.json();
  return data;
}

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
  if (!resp.ok) throw new Error(`API responded with status ${resp.status}`);
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data.evaluation;
}

export function deactivate() {}
