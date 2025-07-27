import axios from "axios";

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

export interface ModelResult {
  model: string;
  response: string;
  tokensUsed: number;
}

const BASE_URL = "http://localhost:3100";  // Update if your backend runs elsewhere

export async function fetchModelComparisons(req: CompareRequest): Promise<ModelResult[]> {
  const response = await axios.post(`${BASE_URL}/compare-models`, req);
  return response.data.results;
}

export async function fetchSingleModelResult(req: SingleModelRequest): Promise<ModelResult> {
  const response = await axios.post(`${BASE_URL}/single-model`, req);
  return response.data;
}

export async function fetchJudgeResponse(req: JudgeRequest): Promise<string> {
  const response = await axios.post(`${BASE_URL}/judge`, req);
  return response.data.evaluation || response.data.error || "";
}
