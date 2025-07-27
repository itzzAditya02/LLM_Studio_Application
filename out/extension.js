"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = __importStar(require("vscode"));
function activate(context) {
    const provider = new LLMViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("llmSidebar", provider));
}
exports.activate = activate;
class LLMViewProvider {
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
    }
    resolveWebviewView(webviewView) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };
        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (msg) => {
            if (msg.type === "prompt") {
                const prompt = msg.value;
                // Dummy LLM reply – replace with your backend API later
                const reply = await this.getLLMResponse(prompt);
                webviewView.webview.postMessage({ type: "response", value: reply });
            }
        });
    }
    async getLLMResponse(prompt) {
        return `🤖 You said: "${prompt}"`;
    }
    getHtmlForWebview(webview) {
        const style = `
      body {
        font-family: sans-serif;
        margin: 0;
        padding: 0;
        background-color: #1e1e1e;
        color: #ffffff;
        display: flex;
        flex-direction: column;
        height: 100vh;
      }
      .chat-container {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
      }
      .chat-bubble {
        background: #2d2d30;
        margin-bottom: 0.5rem;
        padding: 0.75rem 1rem;
        border-radius: 12px;
        max-width: 90%;
      }
      .user {
        align-self: flex-end;
        background: #007acc;
      }
      .assistant {
        align-self: flex-start;
      }
      .input-container {
        display: flex;
        padding: 0.5rem;
        border-top: 1px solid #444;
      }
      input {
        flex: 1;
        background: #333;
        border: none;
        padding: 0.5rem;
        color: #fff;
        border-radius: 6px;
      }
      button {
        margin-left: 0.5rem;
        padding: 0.5rem 1rem;
        background: #0a84ff;
        border: none;
        color: white;
        border-radius: 6px;
        cursor: pointer;
      }
    `;
        const script = `
      const vscode = acquireVsCodeApi();

      function sendMessage() {
        const input = document.getElementById("prompt");
        const chat = document.getElementById("chat");

        const userMessage = input.value.trim();
        if (!userMessage) return;

        chat.innerHTML += '<div class="chat-bubble user">' + userMessage + '</div>';
        input.value = "";

        vscode.postMessage({ type: "prompt", value: userMessage });
      }

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (message.type === "response") {
          const chat = document.getElementById("chat");
          chat.innerHTML += '<div class="chat-bubble assistant">' + message.value + '</div>';
        }
      });
    `;
        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <style>${style}</style>
      </head>
      <body>
        <div class="chat-container" id="chat"></div>
        <div class="input-container">
          <input id="prompt" placeholder="Ask anything..." />
          <button onclick="sendMessage()">Send</button>
        </div>
        <script>${script}</script>
      </body>
      </html>
    `;
    }
}
