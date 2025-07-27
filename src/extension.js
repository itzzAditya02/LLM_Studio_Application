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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
function activate(context) {
    console.log('LLM Studio extension activated');
    let disposable = vscode.commands.registerCommand('llmStudio.runPrompt', async () => {
        // 1. Ask user for prompt input
        const prompt = await vscode.window.showInputBox({
            prompt: "Enter your prompt",
            placeHolder: "Ask anything..."
        });
        if (!prompt) {
            vscode.window.showErrorMessage("Prompt is required");
            return;
        }
        // 2. Let user select models from list (multiple)
        const models = await vscode.window.showQuickPick(["llama3.1-8b", "llama-3.3-70b", "qwen-3-32b", "mistral-openrouter"], { canPickMany: true, placeHolder: "Select model(s) to run" });
        if (!models || models.length === 0) {
            vscode.window.showErrorMessage("Select at least one model");
            return;
        }
        // 3. Call your backend with prompt + models
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Running models...",
                cancellable: false,
            }, async () => {
                const response = await axios_1.default.post("http://localhost:3100/compare-models", {
                    prompt,
                    models,
                });
                // Assert the response data type
                const outputs = response.data;
                // 4. Display outputs in Output Channel
                const outputChannel = vscode.window.createOutputChannel("LLM Studio Results");
                outputChannel.clear();
                outputChannel.show(true);
                for (const [model, output] of Object.entries(outputs)) {
                    outputChannel.appendLine(`=== ${model.toUpperCase()} ===`);
                    outputChannel.appendLine(output);
                    outputChannel.appendLine("\n");
                }
            });
        }
        catch (err) {
            vscode.window.showErrorMessage("Backend error: " + (err.message || err));
        }
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map