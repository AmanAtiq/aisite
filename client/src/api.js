// Local Vite development proxies `/api` to the Express server. In production,
// VITE_API_URL can point at a separately deployed API (for example on Vercel).
const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export function generate({ projectId, prompt }) {
  return fetch(`${BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, prompt }),
  }).then(handle);
}

export function listProjects() {
  return fetch(`${BASE}/projects`).then(handle);
}

export function getProject(id) {
  return fetch(`${BASE}/projects/${id}`).then(handle);
}

export function exportUrl(id) {
  return `${BASE}/projects/${id}/export`;
}

export function rollback(projectId) {
  return fetch(`${BASE}/projects/${projectId}/rollback`, {
    method: "POST",
  }).then(handle);
}

export function redo(projectId) {
  return fetch(`${BASE}/projects/${projectId}/redo`, {
    method: "POST",
  }).then(handle);
}

export function restore(projectId, version) {
  return fetch(`${BASE}/projects/${projectId}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version }),
  }).then(handle);
}
