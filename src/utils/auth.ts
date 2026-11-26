const AUTH_TOKEN_KEY = 'studio_auth_token';
const LOCAL_USERS_KEY = 'studio_local_users';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
}

interface LocalStoredUser extends AuthUser {
  password: string;
}

export function getAuthToken(): string {
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

export async function safeParseJson<T = Record<string, unknown>>(
  res: Response
): Promise<{ ok: boolean; data: T | null }> {
  const text = await res.text();
  if (!text) return { ok: false, data: null };
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, data: null };
  }
}

function getLocalUsers(): LocalStoredUser[] {
  const defaultAdmin: LocalStoredUser = {
    id: 'user-admin-1',
    name: 'Operator Desa Tobadak',
    username: 'admin',
    email: 'admin@tobadak.desa.id',
    role: 'Admin Media Pemdes Tobadak',
    password: 'tobadak2026',
  };
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify([defaultAdmin]));
      return [defaultAdmin];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [defaultAdmin];
  } catch {
    return [defaultAdmin];
  }
}

function toPublicUser(u: LocalStoredUser): AuthUser {
  return { id: u.id, name: u.name, username: u.username, email: u.email, role: u.role };
}

export async function loginAccount(
  identifier: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const parsed = await safeParseJson<{ token?: string; user?: AuthUser; error?: string }>(res);
  if (parsed.ok && parsed.data) {
    if (!res.ok) throw new Error(parsed.data.error || 'Username/email atau password salah.');
    if (parsed.data.token && parsed.data.user) {
      return { token: parsed.data.token, user: parsed.data.user };
    }
  }

  // Fallback for static hosting (e.g. Netlify) without Express backend
  const idClean = identifier.trim().toLowerCase();
  const users = getLocalUsers();
  const found = users.find(
    (u) => u.username.toLowerCase() === idClean || u.email.toLowerCase() === idClean
  );
  if (!found || found.password !== password) {
    throw new Error('Username/email atau password salah.');
  }
  const token = `local:${found.id}`;
  return { token, user: toPublicUser(found) };
}

export async function registerAccount(input: {
  name: string;
  username: string;
  email: string;
  password: string;
}): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const parsed = await safeParseJson<{ token?: string; user?: AuthUser; error?: string }>(res);
  if (parsed.ok && parsed.data) {
    if (!res.ok) throw new Error(parsed.data.error || 'Pendaftaran gagal.');
    if (parsed.data.token && parsed.data.user) {
      return { token: parsed.data.token, user: parsed.data.user };
    }
  }

  // Fallback for static hosting (e.g. Netlify)
  const cleanUsername = input.username.trim().toLowerCase();
  const cleanEmail = input.email.trim().toLowerCase();
  if (input.password.length < 6) {
    throw new Error('Password minimal 6 karakter.');
  }
  const users = getLocalUsers();
  if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
    throw new Error('Username sudah terdaftar.');
  }
  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    throw new Error('Email sudah terdaftar.');
  }
  const newUser: LocalStoredUser = {
    id: `user-${Date.now()}`,
    name: input.name.trim(),
    username: cleanUsername,
    email: cleanEmail,
    role: 'Operator Konten Desa',
    password: input.password,
  };
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify([...users, newUser]));
  return { token: `local:${newUser.id}`, user: toPublicUser(newUser) };
}

export async function verifySessionUser(): Promise<AuthUser | null> {
  const token = getAuthToken();
  if (!token) return null;
  if (token.startsWith('local:')) {
    const userId = token.slice(6);
    const found = getLocalUsers().find((u) => u.id === userId);
    return found ? toPublicUser(found) : null;
  }
  const res = await authFetch('/api/auth/me');
  const parsed = await safeParseJson<{ authenticated?: boolean; user?: AuthUser }>(res);
  if (res.ok && parsed.ok && parsed.data?.user) {
    return parsed.data.user;
  }
  return null;
}
