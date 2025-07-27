import React, { useState, useEffect } from "react";

// Acquire VS Code API for messaging with extension
const vscode = (window as any).acquireVsCodeApi?.();

interface ModelOption {
  value: string;
  label: string;
}

interface ModelResult {
  model: string;
  response: string;
  tokensUsed: number;
}

const MODEL_OPTIONS: ModelOption[] = [
  { value: "llama3.1-8b", label: "LLaMA 3.1 - 8B" },
  { value: "llama-3.3-70b", label: "LLaMA 3.3 - 70B" },
  { value: "qwen-3-32b", label: "Qwen 3 - 32B" },
  { value: "mistral-openrouter", label: "Mistral (OpenRouter)" },
];

export default function App() {
  const [prompt, setPrompt] = useState<string>("");
  const [singleModel, setSingleModel] = useState<string>("");
  const [compareModels, setCompareModels] = useState<string[]>([]);
  const [results, setResults] = useState<ModelResult[]>([]);
  const [judgeResult, setJudgeResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const message = event.data;
      switch (message.command) {
        case "compareModelsResponse":
          setResults(message.responses);
          setLoading(false);
          break;
        case "singleModelResponse":
          setResults([message]);
          setLoading(false);
          break;
        case "judgeResponse":
          setJudgeResult(message.evaluation);
          setLoading(false);
          break;
        case "error":
          alert(`Error: ${message.error}`);
          setLoading(false);
          break;
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const runSingleModel = () => {
    if (!vscode) {
      alert("This app must run inside VS Code!");
      return;
    }
    if (!singleModel) {
      alert("Select exactly one model for single query.");
      return;
    }
    if (!prompt.trim()) {
      alert("Please enter a prompt.");
      return;
    }
    setLoading(true);
    setJudgeResult(null);
    setResults([]);

    vscode.postMessage({
      command: "singleModelQuery",
      prompt,
      model: singleModel,
    });
  };

  const runCompareModels = () => {
    if (!vscode) {
      alert("This app must run inside VS Code!");
      return;
    }
    if (compareModels.length !== 2) {
      alert("Select exactly two models to compare.");
      return;
    }
    if (!prompt.trim()) {
      alert("Please enter a prompt.");
      return;
    }
    setLoading(true);
    setJudgeResult(null);
    setResults([]);

    vscode.postMessage({
      command: "compareModels",
      prompt,
      models: compareModels,
    });
  };

  const runJudge = () => {
    if (!vscode) {
      alert("This app must run inside VS Code!");
      return;
    }
    if (results.length < 2) {
      alert("Need at least two results to judge.");
      return;
    }
    setLoading(true);

    vscode.postMessage({
      command: "judge",
      prompt,
      model_a: results[0].model,
      response_a: results[0].response,
      model_b: results[1].model,
      response_b: results[1].response,
    });
  };

  const clearAll = () => {
    setPrompt("");
    setSingleModel("");
    setCompareModels([]);
    setResults([]);
    setJudgeResult(null);
  };

  const downloadResponse = (model: string, response: string) => {
    const element = document.createElement("a");
    const file = new Blob([response], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${model}_response.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontWeight: 700, fontSize: 28, marginBottom: 20 }}>
        LLM Studio — Unified AI Assistant
      </h1>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt here..."
        rows={5}
        style={{
          width: "100%",
          fontSize: 16,
          padding: 12,
          borderRadius: 6,
          border: "1px solid #ddd",
          marginBottom: 20,
          resize: "vertical",
          boxSizing: "border-box",
          color: "white",
          backgroundColor: "#1e1e1e",
          caretColor: "#fff",
        }}
        disabled={loading}
      />

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <label style={{ fontWeight: 600 }}>Single Model:</label>
          <br />
          <select
            value={singleModel}
            onChange={(e) => setSingleModel(e.target.value)}
            disabled={loading}
            style={{
              marginTop: 6,
              padding: 6,
              borderRadius: 4,
              border: "1px solid #ccc",
              minWidth: 200,
              backgroundColor: "white",
              color: "#111",
            }}
          >
            <option value="">-- Select a model --</option>
            {MODEL_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontWeight: 600 }}>Compare Models (select 2):</label>
          <br />
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 6,
            }}
          >
            {MODEL_OPTIONS.map(({ value, label }) => {
              const disabledOption = compareModels.length >= 2 && !compareModels.includes(value);
              return (
                <label key={value} style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    value={value}
                    checked={compareModels.includes(value)}
                    disabled={disabledOption || loading}
                    onChange={(e) => {
                      const selected = e.target.checked
                        ? [...compareModels, value]
                        : compareModels.filter((m) => m !== value);
                      if (selected.length <= 2) setCompareModels(selected);
                    }}
                    style={{ marginRight: 6 }}
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 30 }}>
        {[{
          onClick: runSingleModel,
          disabled: loading || prompt.trim() === "" || !singleModel,
          label: loading ? "Running..." : "Run Single Model"
        }, {
          onClick: runCompareModels,
          disabled: loading || prompt.trim() === "" || compareModels.length !== 2,
          label: loading ? "Comparing..." : "Compare Models"
        }, {
          onClick: runJudge,
          disabled: loading || results.length < 2,
          label: loading ? "Judging..." : "Judge Comparison"
        }, {
          onClick: clearAll,
          disabled: loading,
          label: "Clear All"
        }].map(({ onClick, disabled, label }, i) => (
          <button
            key={i}
            onClick={onClick}
            disabled={disabled}
            style={{
              flex: "1 1 150px",
              padding: "10px 20px",
              backgroundColor: "#1A73E8",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontWeight: "600",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.6 : 1,
              transition: "background-color 0.2s ease"
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {results.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: results.length === 1 ? "1fr" : "1fr 1fr",
            gap: 20,
            marginBottom: 30
          }}
        >
          {results.map(({ model, response, tokensUsed }) => (
            <div
              key={model}
              style={{
                border: "1px solid #ddd",
                borderRadius: 6,
                padding: 16,
                backgroundColor: "#FAFAFA",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong>{model}</strong>
                <button
                  onClick={() => downloadResponse(model, response)}
                  style={{
                    backgroundColor: "#1A73E8",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 12,
                    cursor: "pointer"
                  }}
                >
                  Download
                </button>
              </div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
                Tokens used: {tokensUsed}
              </div>
              <pre
                style={{
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "'Consolas', 'Courier New', monospace",
                  fontSize: 14,
                  color: "#111"
                }}
              >
                {response}
              </pre>
            </div>
          ))}
        </div>
      )}

      {judgeResult && (
        <div
          style={{
            borderLeft: "6px solid #1A73E8",
            backgroundColor: "#E3F2FD",
            padding: 20,
            borderRadius: 6,
            fontSize: 14,
            color: "#0D47A1",
            whiteSpace: "pre-wrap"
          }}
        >
          <strong style={{ display: "block", marginBottom: 10 }}>Judge Evaluation:</strong>
          {judgeResult}
        </div>
      )}
    </div>
  );
}
