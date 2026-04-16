// Centralized API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

const headers: Record<string, string> = {
  'X-API-Key': API_KEY,
};

async function apiFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `API error ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () =>
    apiFetch(`${API_BASE_URL}/api/health`, { headers }),

  assets: () =>
    apiFetch(`${API_BASE_URL}/api/assets`, { headers }),

  presets: () =>
    apiFetch(`${API_BASE_URL}/api/presets`, { headers }),

  jobs: (limit = 100) =>
    apiFetch(`${API_BASE_URL}/api/jobs?limit=${limit}`, { headers }),

  upload: (formData: FormData) =>
    // Don't set Content-Type — browser auto-sets multipart boundary
    apiFetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { 'X-API-Key': API_KEY },
      body: formData,
    }),

  executeWorkflow: (payload: { nodes: any[]; edges: any[] }) =>
    fetch(`${API_BASE_URL}/api/workflow/execute`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(r => r.json().then(data => ({ ok: r.ok, data }))),

  // SSE uses a short-lived stream token (returned by executeWorkflow) instead of the API key
  streamJob: (jobId: string, streamToken: string) =>
    new EventSource(`${API_BASE_URL}/api/workflow/stream/${jobId}?token=${encodeURIComponent(streamToken)}`),
};
