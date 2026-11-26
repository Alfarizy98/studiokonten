import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  clearSessionCache,
  getBrandKit,
  getMasterTemplates,
  getSessionCache,
  getSettings,
  saveBrandKit,
  saveMasterTemplates,
  saveSettings,
  setSessionCache,
} from './storage.js';
import { crawlVillageWebsite, isBlockedInternalHost } from './crawler.js';
import { generateAiContent } from './aiWriter.js';
import {
  extractBearerToken,
  getUserByToken,
  loginUser,
  registerUser,
  requireAuth,
  revokeToken,
} from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: 'ai-content-generator-studio', persistentContentDb: false });
});

// ============================================================================
// AUTHENTICATION ROUTES (Login via Username or Email, Register, Session Check)
// ============================================================================
app.post('/api/auth/login', (req, res) => {
  const result = loginUser(req.body || {});
  if (!result.ok) {
    return res.status(result.status || 401).json({ error: result.error });
  }
  res.json({ token: result.token, user: result.user });
});

app.post('/api/auth/register', (req, res) => {
  const result = registerUser(req.body || {});
  if (!result.ok) {
    return res.status(result.status || 400).json({ error: result.error });
  }
  res.json({ token: result.token, user: result.user });
});

app.get('/api/auth/me', (req, res) => {
  const token = extractBearerToken(req);
  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({ authenticated: true, user });
});

app.post('/api/auth/logout', (req, res) => {
  const token = extractBearerToken(req);
  revokeToken(token);
  res.json({ ok: true });
});

// Protect all studio data & AI endpoints behind authentication
app.use('/api/permanent', requireAuth);
app.use('/api/crawl', requireAuth);
app.use('/api/session', requireAuth);
app.use('/api/ai', requireAuth);

// ============================================================================
// PERMANENT DATA ROUTES (Brand Kit, Settings/Account, Master Templates ONLY)
// ============================================================================
app.get('/api/permanent/brand-kit', (_req, res) => {
  res.json(getBrandKit());
});

app.put('/api/permanent/brand-kit', (req, res) => {
  const updated = saveBrandKit(req.body || {});
  res.json(updated);
});

app.get('/api/permanent/settings', (_req, res) => {
  res.json(getSettings());
});

app.put('/api/permanent/settings', (req, res) => {
  const updated = saveSettings(req.body || {});
  res.json(updated);
});

app.get('/api/permanent/templates', (_req, res) => {
  res.json(getMasterTemplates());
});

app.post('/api/permanent/templates', (req, res) => {
  const current = getMasterTemplates();
  const tpl = req.body;
  if (!tpl || !tpl.name) {
    return res.status(400).json({ error: 'Nama template wajib diisi.' });
  }
  const newTpl = {
    ...tpl,
    id: tpl.id || `tpl-${Date.now()}`,
  };
  const idx = current.findIndex((t) => t.id === newTpl.id);
  if (idx >= 0) current[idx] = newTpl;
  else current.push(newTpl);
  saveMasterTemplates(current);
  res.json(current);
});

app.delete('/api/permanent/templates/:id', (req, res) => {
  const current = getMasterTemplates();
  const filtered = current.filter((t) => t.id !== req.params.id);
  saveMasterTemplates(filtered);
  res.json(filtered);
});

// ============================================================================
// TEMPORARY SESSION ROUTES (Ephemeral Crawl & AI Generation, no DB archive)
// ============================================================================
app.post('/api/crawl', async (req, res) => {
  const { url, sessionId } = req.body || {};
  const settings = getSettings();
  try {
    const result = await crawlVillageWebsite(url);
    if (sessionId) {
      setSessionCache(
        sessionId,
        'crawledArticles',
        result.articles,
        settings.sessionTtlMinutes
      );
    }
    res.json({
      method: result.method,
      articles: result.articles,
      ephemeral: true,
      ttlMinutes: settings.sessionTtlMinutes,
    });
  } catch (err) {
    res.status(400).json({
      error: err?.message || 'Gagal melakukan crawling website desa.',
    });
  }
});

app.get('/api/session/:sessionId', (req, res) => {
  const entry = getSessionCache(req.params.sessionId);
  if (!entry) return res.json({ active: false, data: {} });
  res.json({
    active: true,
    expiresAt: entry.expiresAt,
    data: entry.data,
  });
});

app.delete('/api/session/:sessionId', (req, res) => {
  clearSessionCache(req.params.sessionId);
  res.json({ cleared: true });
});

app.post('/api/ai/generate', async (req, res) => {
  try {
    const settings = getSettings();
    const brandKit = getBrandKit();
    const result = await generateAiContent(
      {
        ...req.body,
        villageName: req.body?.villageName || brandKit.villageName,
        regencyName: req.body?.regencyName || brandKit.regencyName,
      },
      settings
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err?.message || 'Gagal menghasilkan konten AI.',
    });
  }
});

// Image proxy so crawled external images can be rendered on Canvas without CORS taint
app.get('/api/proxy-image', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).send('Missing url');
  }
  try {
    const parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol) || isBlockedInternalHost(parsed.hostname)) {
      return res.status(400).send('Invalid or blocked URL');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const upstream = await fetch(parsed.href, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StudioKontenDesaTobadak/1.0)' },
    });
    clearTimeout(timer);

    if (!upstream.ok) {
      return res.status(upstream.status).send('Image fetch failed');
    }
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return res.status(400).send('Not an image');
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  } catch {
    res.status(502).send('Proxy error');
  }
});

// Serve built frontend in production if dist/ exists
const distDir = path.resolve(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Studio Konten Desa Tobadak server running on http://localhost:${PORT}`);
});
