import { Platform } from 'react-native';

export type SourceRow = {
  source: string;
  row: string | number;
  code: string;
  program: string;
  university: string;
  establishment: string;
  type: string;
};

export type AskResponse = {
  answer: string;
  sources: SourceRow[];
};

const DEFAULT_API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8000',
  ios: 'http://localhost:8000',
  default: 'http://localhost:8000',
});

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? DEFAULT_API_BASE_URL;

export async function askQuestion(question: string): Promise<AskResponse> {
  const response = await fetch(`${API_BASE_URL}/ask`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = payload?.detail ?? 'The chatbot service returned an error.';
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }

  return payload as AskResponse;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export { API_BASE_URL };
