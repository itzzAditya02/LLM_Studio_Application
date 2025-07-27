export interface CompareRequest {
  prompt: string;
  models: string[];
}

export interface ModelResult {
  model: string;
  output: string;
}
