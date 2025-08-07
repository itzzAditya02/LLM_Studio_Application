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
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [attachedFileContent, setAttachedFileContent] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

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
    if (!vscode || !singleModel || !prompt.trim()) return;
    setLoading(true);
    setJudgeResult(null);
    setResults([]);
    vscode.postMessage({
      command: "singleModelQuery",
      prompt: prompt + (attachedFileContent ? `\n\nAttached File:\n${attachedFileContent}` : ""),
      model: singleModel,
    });
  };

  const runCompareModels = () => {
    if (!vscode || compareModels.length !== 2 || !prompt.trim()) return;
    setLoading(true);
    setJudgeResult(null);
    setResults([]);
    vscode.postMessage({
      command: "compareModels",
      prompt: prompt + (attachedFileContent ? `\n\nAttached File:\n${attachedFileContent}` : ""),
      models: compareModels,
    });
  };

  const runJudge = () => {
    if (!vscode || results.length < 2) return;
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
    setAttachedFileName(null);
    setAttachedFileContent(null);
  };

  const downloadResponse = (model: string, response: string) => {
  if (!vscode) return;
  vscode.postMessage({
    command: "downloadResponse",
    fileName: `${model}_response.txt`,
    content: response,
  });
};

  const renderDiff = () => {
    if (results.length !== 2) return null;
    const [a, b] = results.map((r) => r.response.split("\n"));
    const maxLen = Math.max(a.length, b.length);
    return (
      <div style={{ marginBottom: 30 }}>
        <h3 style={{ marginBottom: 10 }}>🔍 Diff View</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {Array.from({ length: maxLen }).map((_, i) => (
            <React.Fragment key={i}>
              <div
                style={{
                  backgroundColor: a[i] !== b[i] ? "#ffefef" : "#f5f5f5",
                  padding: 6,
                  fontFamily: "monospace",
                }}
              >
                {a[i] || ""}
              </div>
              <div
                style={{
                  backgroundColor: a[i] !== b[i] ? "#efffff" : "#f5f5f5",
                  padding: 6,
                  fontFamily: "monospace",
                }}
              >
                {b[i] || ""}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const suggestions = [
    "Explain this code snippet:",
    "Optimize this function:",
    "Fix the bug in this logic:",
    "Convert this to Python/JS/C++:",
  ];

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontWeight: 700, fontSize: 28, marginBottom: 20 }}>
        LLM Studio — Unified AI Assistant
      </h1>

      <textarea
        value={prompt}
        onChange={(e) => {
          setPrompt(e.target.value);
          setShowSuggestions(e.target.value.length < 4);
        }}
        placeholder="Enter your prompt here..."
        rows={5}
        style={{
          width: "100%",
          fontSize: 16,
          padding: 12,
          borderRadius: 6,
          border: "1px solid #ddd",
          marginBottom: 10,
          resize: "vertical",
          boxSizing: "border-box",
          color: "white",
          backgroundColor: "#1e1e1e",
          caretColor: "#fff",
        }}
        disabled={loading}
      />

      {showSuggestions && (
        <div style={{ marginBottom: 15 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>💡 Suggestions:</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {suggestions.map((sugg) => (
              <button
                key={sugg}
                onClick={() => setPrompt(sugg)}
                style={{
                  padding: "4px 10px",
                  background: "#f0f0f0",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {sugg}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 600 }}>📎 Attach File (optional):</label>
        <input
          type="file"
          accept=".txt,.js,.ts,.py,.cpp,.c,.json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              const text = await file.text();
              setAttachedFileName(file.name);
              setAttachedFileContent(text);
            }
          }}
          disabled={loading}
        />
        {attachedFileName && (
          <div style={{ fontSize: 12, marginTop: 4 }}>Attached: {attachedFileName}</div>
        )}
      </div>

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
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
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
        <div style={{
          display: "grid",
          gridTemplateColumns: results.length === 1 ? "1fr" : "1fr 1fr",
          gap: 20,
          marginBottom: 30
        }}>
          {results.map(({ model, response, tokensUsed }) => (
            <div key={model} style={{
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: 16,
              backgroundColor: "#FAFAFA",
              display: "flex",
              flexDirection: "column"
            }}>
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
              <pre style={{
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "'Consolas', 'Courier New', monospace",
                fontSize: 14,
                color: "#111"
              }}>{response}</pre>
            </div>
          ))}
        </div>
      )}

      {renderDiff()}

      {judgeResult && (
        <div style={{
          borderLeft: "6px solid #1A73E8",
          backgroundColor: "#E3F2FD",
          padding: 20,
          borderRadius: 6,
          fontSize: 14,
          color: "#0D47A1",
          whiteSpace: "pre-wrap"
        }}>
          <strong style={{ display: "block", marginBottom: 10 }}>Judge Evaluation:</strong>
          {judgeResult}
        </div>
      )}
    </div>
  );
}
