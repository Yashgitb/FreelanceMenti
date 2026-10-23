export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function authHeader(): Record<string, string> {
  try {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (_) {
    return {};
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const opts: RequestOptions = { ...(options || {}) };

  const isForm = opts.body instanceof FormData;

  // Build headers: don't overwrite headers passed by caller
  const headers: Record<string, string> = { ...authHeader(), ...(opts.headers as Record<string, string> || {}) };

  // Only set JSON content-type when not sending FormData and not already set
  if (!isForm) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  let body: BodyInit | null | undefined;
  if (opts.body !== undefined) {
    if (opts.body instanceof FormData || typeof opts.body === 'string' || opts.body instanceof Blob || opts.body instanceof ArrayBuffer || opts.body === null) {
      body = opts.body as BodyInit | null;
    } else {
      try {
        body = JSON.stringify(opts.body);
      } catch (e) {
        body = opts.body as any;
      }
    }
  }

  const fetchOptions: RequestInit = {
    credentials: 'include',
    ...opts,
    headers,
    body,
  };

  const res = await fetch(`${API_BASE_URL}${path}`, fetchOptions);
  if (!res.ok) {
    const txt = await res.text();
    let message = txt || 'Request failed';
    try {
      const json = JSON.parse(txt);
      if (json.message) {
        message = typeof json.message === 'string' ? json.message : JSON.stringify(json.message);
      } else if (json.error) {
        message = typeof json.error === 'string' ? json.error : JSON.stringify(json.error);
      }
    } catch {
      // Response is plain text, keep message as txt
    }
    throw new Error(message);
  }
  const contentType = res.headers.get('content-type') || '';
  return (contentType.includes('application/json') ? res.json() : res.text()) as Promise<T>;
}

export const http = {
  get: <T = any>(path: string, opts?: RequestOptions) => request<T>(path, { method: 'GET', ...opts }),
  post: <T = any>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { method: 'POST', body, ...opts }),
  put: <T = any>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { method: 'PUT', body, ...opts }),
  patch: <T = any>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { method: 'PATCH', body, ...opts }),
  del: <T = any>(path: string, opts?: RequestOptions) => request<T>(path, { method: 'DELETE', ...opts }),
  delete: <T = any>(path: string, opts?: RequestOptions) => request<T>(path, { method: 'DELETE', ...opts }),
};


