
export const API_BASE = "http://localhost:8080/api";
export const API = `${API_BASE}/books`;

const KEY = "bookmgmt_session";

export const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
};
export const saveSession = (session) => localStorage.setItem(KEY, JSON.stringify(session));
export const clearSession = () => localStorage.removeItem(KEY);


export async function authFetch(url, options = {}) {
  const session = getSession();
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    },
  });
  if (res.status === 401) {
    clearSession();
    window.location.reload();
  }
  return res;
}

// POST to /api/auth/<path> (login or register). Throws Error with the backend's message.
export async function authRequest(path, body) {
  const res = await fetch(`${API_BASE}/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* response had no JSON body */
  }
  if (!res.ok) throw new Error(data.message || "Something went wrong. Please try again.");
  return data;
}