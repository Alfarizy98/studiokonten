import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PERMANENT_DIR = path.resolve(__dirname, '../storage/permanent');
const USERS_FILE = path.join(PERMANENT_DIR, 'users.json');
const TOKENS_FILE = path.join(PERMANENT_DIR, 'auth-tokens.json');
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function ensureDir() {
  if (!fs.existsSync(PERMANENT_DIR)) {
    fs.mkdirSync(PERMANENT_DIR, { recursive: true });
  }
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  const [salt, keyHex] = String(storedHash || '').split(':');
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

function readUsers() {
  ensureDir();
  if (!fs.existsSync(USERS_FILE)) {
    const defaultUsers = [
      {
        id: 'user-admin-1',
        name: 'Operator Desa Tobadak',
        username: 'admin',
        email: 'admin@tobadak.desa.id',
        role: 'Admin Media Pemdes Tobadak',
        passwordHash: hashPassword('tobadak2026'),
        createdAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), 'utf-8');
    return defaultUsers;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  ensureDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function readTokens() {
  ensureDir();
  if (!fs.existsSync(TOKENS_FILE)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeTokens(tokens) {
  ensureDir();
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

function issueToken(userId) {
  const tokens = readTokens();
  const now = Date.now();
  for (const [t, entry] of Object.entries(tokens)) {
    if (!entry || entry.expiresAt <= now) delete tokens[t];
  }
  const token = crypto.randomBytes(32).toString('hex');
  tokens[token] = { userId, expiresAt: now + TOKEN_TTL_MS };
  writeTokens(tokens);
  return token;
}

export function loginUser({ identifier, password }) {
  const idClean = String(identifier || '').trim().toLowerCase();
  const pass = String(password || '');
  if (!idClean || !pass) {
    return { ok: false, status: 400, error: 'Username/email dan password wajib diisi.' };
  }

  const users = readUsers();
  const user = users.find(
    (u) => u.username.toLowerCase() === idClean || u.email.toLowerCase() === idClean
  );
  if (!user || !verifyPassword(pass, user.passwordHash)) {
    return { ok: false, status: 401, error: 'Username/email atau password salah.' };
  }

  const token = issueToken(user.id);
  return { ok: true, token, user: sanitizeUser(user) };
}

export function registerUser({ name, username, email, password }) {
  const cleanName = String(name || '').trim();
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const pass = String(password || '');

  if (!cleanName || !cleanUsername || !cleanEmail || !pass) {
    return { ok: false, status: 400, error: 'Semua kolom wajib diisi.' };
  }
  if (!/^[a-z0-9._-]{3,30}$/.test(cleanUsername)) {
    return {
      ok: false,
      status: 400,
      error: 'Username hanya boleh huruf, angka, titik, garis bawah, atau strip (3-30 karakter).',
    };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { ok: false, status: 400, error: 'Format email tidak valid.' };
  }
  if (pass.length < 6) {
    return { ok: false, status: 400, error: 'Password minimal 6 karakter.' };
  }

  const users = readUsers();
  if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
    return { ok: false, status: 409, error: 'Username sudah terdaftar.' };
  }
  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return { ok: false, status: 409, error: 'Email sudah terdaftar.' };
  }

  const newUser = {
    id: `user-${Date.now()}`,
    name: cleanName,
    username: cleanUsername,
    email: cleanEmail,
    role: 'Operator Konten Desa',
    passwordHash: hashPassword(pass),
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  writeUsers(users);

  const token = issueToken(newUser.id);
  return { ok: true, token, user: sanitizeUser(newUser) };
}

export function getUserByToken(token) {
  if (!token) return null;
  const tokens = readTokens();
  const entry = tokens[token];
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    delete tokens[token];
    writeTokens(tokens);
    return null;
  }
  const users = readUsers();
  const user = users.find((u) => u.id === entry.userId);
  return user ? sanitizeUser(user) : null;
}

export function revokeToken(token) {
  if (!token) return;
  const tokens = readTokens();
  if (tokens[token]) {
    delete tokens[token];
    writeTokens(tokens);
  }
}

export function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return '';
}

export function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
  }
  req.authUser = user;
  next();
}
