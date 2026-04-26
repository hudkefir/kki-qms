import { useState, useEffect, useCallback } from 'react';

export function useFetch(url, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (res.status === 401) {
        window.location.reload();
        return;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url, ...deps]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export async function apiPost(url, body) {
  const isFormData = body instanceof FormData;
  const res = await fetch(url, {
    method: 'POST',
    ...(isFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
    credentials: 'include',
    body: isFormData ? body : JSON.stringify(body),
  });
  if (res.status === 401) {
    window.location.reload();
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return res.json();
}

export async function apiPut(url, body) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    window.location.reload();
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiDelete(url) {
  const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
  if (res.status === 401) {
    window.location.reload();
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPatch(url, body) {
  const res = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}
