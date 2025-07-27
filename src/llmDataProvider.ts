import * as vscode from 'vscode';
import { compareModels } from './api';
import { LLMModelResult, CompareRequest } from './types';

export class LLMTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly output?: string
  ) {
    super(label, collapsibleState);
    this.tooltip = this.output;
    this.description = this.output?.substring(0, 100).replace(/\n/g, ' ') + '...';
  }
}

export class LLMDataProvider implements vscode.TreeDataProvider<LLMTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<LLMTreeItem | undefined | void> =
    new vscode.EventEmitter<LLMTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<LLMTreeItem | undefined | void> =
    this._onDidChangeTreeData.event;

  private modelResults: LLMModelResult[] = [];

  async runModelComparison(prompt: string, models: string[]) {
    try {
      const request: CompareRequest = { prompt, models };
      const response = await compareModels(request);
      this.modelResults = Object.entries(response).map(([model, output]) => ({
        model,
        output,
      }));
      this._onDidChangeTreeData.fire(); // refresh TreeView
    } catch (error) {
      vscode.window.showErrorMessage(`Model comparison failed: ${error}`);
    }
  }

  getTreeItem(element: LLMTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: LLMTreeItem): Thenable<LLMTreeItem[]> {
    if (!this.modelResults.length) {
      return Promise.resolve([]);
    }

    if (!element) {
      // Top-level: model names
      return Promise.resolve(
        this.modelResults.map(
          (r) =>
            new LLMTreeItem(
              r.model,
              vscode.TreeItemCollapsibleState.Collapsed
            )
        )
      );
    }

    // Child-level: model output
    const modelOutput = this.modelResults.find((r) => r.model === element.label);
    return Promise.resolve([
      new LLMTreeItem(
        modelOutput?.output ?? 'No output',
        vscode.TreeItemCollapsibleState.None,
        modelOutput?.output
      ),
    ]);
  }
}
