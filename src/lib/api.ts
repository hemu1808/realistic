/**
 * Centralized API configuration — no hardcoded URLs.
 * All components import from here.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = {
  health:          () => fetch(`${API_BASE_URL}/api/health`).then(r => r.json()),
  assets:          () => fetch(`${API_BASE_URL}/api/assets`).then(r => r.json()),
  presets:         () => fetch(`${API_BASE_URL}/api/presets`).then(r => r.json()),
  jobs:            (limit = 100) => fetch(`${API_BASE_URL}/api/jobs?limit=${limit}`).then(r => r.json()),
  upload:          (formData: FormData) =>
                     fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData }).then(r => r.json()),
  executeWorkflow: (payload: any) =>
                     fetch(`${API_BASE_URL}/api/workflow/execute`, {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify(payload),
                     }).then(r => r.json().then(data => ({ ok: r.ok, data }))),
  streamJob:       (jobId: string) => new EventSource(`${API_BASE_URL}/api/workflow/stream/${jobId}`),
};
