"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
function activate(context) {
  const provider = new LLMStudioViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("llmStudioSidebarView", provider)
  );
}
var LLMStudioViewProvider = class {
  constructor(context) {
    this.context = context;
  }
  resolveWebviewView(webviewView) {
    const webview = webviewView.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };
    const distPath = vscode.Uri.joinPath(this.context.extensionUri, "dist-webview");
    const indexPath = vscode.Uri.joinPath(distPath, "index.html");
    let html = fs.readFileSync(indexPath.fsPath, "utf8");
    html = html.replace(/(src|href)="([^"]+)"/g, (match, attr, url) => {
      if (url.startsWith("http") || url.startsWith("data:"))
        return match;
      const resourceUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, url));
      return `${attr}="${resourceUri.toString()}"`;
    });
    webview.html = html;
    const sendOpenFile = () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor)
        return;
      const fileName = path.basename(editor.document.uri.fsPath);
      const fileContent = editor.document.getText();
      webview.postMessage({
        command: "openFileInfo",
        fileName,
        fileContent
      });
    };
    sendOpenFile();
    vscode.window.onDidChangeActiveTextEditor(() => {
      sendOpenFile();
    });
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
              saveLabel: "Save LLM Response"
            });
            if (uri) {
              fs.writeFileSync(uri.fsPath, content, "utf8");
              vscode.window.showInformationMessage(`Response saved to: ${uri.fsPath}`);
              webview.postMessage({
                command: "downloadComplete",
                path: uri.fsPath
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
};
async function fetchCompareModels(prompt, models) {
  const resp = await fetch("http://localhost:3100/compare-models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, models })
  });
  if (!resp.ok)
    throw new Error(`API responded with status ${resp.status}`);
  const data = await resp.json();
  return data.results;
}
async function fetchSingleModel(prompt, model) {
  const resp = await fetch("http://localhost:3100/single-model", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model })
  });
  if (!resp.ok)
    throw new Error(`API responded with status ${resp.status}`);
  const data = await resp.json();
  return data;
}
async function fetchJudgeResult(message) {
  const resp = await fetch("http://localhost:3100/judge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: message.prompt,
      model_a: message.model_a,
      response_a: message.response_a,
      model_b: message.model_b,
      response_b: message.response_b
    })
  });
  if (!resp.ok)
    throw new Error(`API responded with status ${resp.status}`);
  const data = await resp.json();
  if (data.error)
    throw new Error(data.error);
  return data.evaluation;
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
