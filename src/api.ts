import axios from "axios";

// === Request Types ===
export interface CompareRequest {
  prompt: string;
  models: string[];
}

export interface SingleModelRequest {
  prompt: string;
  model: string;
}

export interface JudgeRequest {
  prompt: string;
  model_a: string;
  response_a: string;
  model_b: string;
  response_b: string;
}

// === Response Type ===
export interface ModelResult {
  model: string;
  response: string;
  tokensUsed: number;
}

const BASE_URL = "http://localhost:3100";  // Update this if backend is hosted elsewhere

// === API Functions ===
export async function fetchModelComparisons(req: CompareRequest): Promise<ModelResult[]> {
  const res = await axios.post(`${BASE_URL}/compare-models`, req);
  return res.data.results;
}

export async function fetchSingleModelResult(req: SingleModelRequest): Promise<ModelResult> {
  const res = await axios.post(`${BASE_URL}/single-model`, req);
  return res.data;
}

export async function fetchJudgeResponse(req: JudgeRequest): Promise<string> {
  const res = await axios.post(`${BASE_URL}/judge`, req);
  return res.data.evaluation || res.data.error || "";
}
