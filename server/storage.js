import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PERMANENT_DIR = path.resolve(__dirname, '../storage/permanent');

function ensurePermanentDir() {
  if (!fs.existsSync(PERMANENT_DIR)) {
    fs.mkdirSync(PERMANENT_DIR, { recursive: true });
  }
}

export const DEFAULT_BRAND_KIT = {
  villageName: 'Pemerintah Desa Tobadak',
  districtName: 'Kecamatan Tobadak',
  regencyName: 'Kabupaten Mamuju Tengah',
  villageLogo: '/logos/logo-kemendes.png',
  regencyLogo: '/logos/logo-mamuju-tengah.png',
  colors: {
    primary: '#1b2a78',
    secondary: '#0f1847',
    accent: '#38bdf8',
    background: '#f8fafc',
    textLight: '#ffffff',
    textDark: '#1b2a78',
  },
  fontFamily: 'Open Sans',
  headerText: 'PEMERINTAH DESA',
  footerText: 'www.tobadak.desa.id • Pemdes Tobadak',
  websiteUrl: 'www.tobadak.desa.id',
  socialHandle: 'Pemdes Tobadak',
  watermarkText: 'PEMDES TOBADAK',
  watermarkOpacity: 0.18,
  watermarkPosition: 'bottom-right',
  defaultTemplateId: 'pemdes-editorial',
};

export const DEFAULT_SETTINGS = {
  operatorName: 'Operator Desa Tobadak',
  operatorRole: 'Admin Media Pemdes Tobadak',
  aiProvider: 'auto',
  geminiApiKey: '',
  openaiApiKey: '',
  defaultPlatform: 'ig_feed',
  sessionTtlMinutes: 60,
};

export const DEFAULT_MASTER_TEMPLATES = [
  {
    id: 'pemdes-editorial',
    name: 'Branding Pemdes Elegan',
    category: 'Utama',
    description: 'Foto full-bleed dengan gradasi hijau atmosferik, logo mengambang di kiri atas, garis aksen emas di kanan atas, dan footer minimalis.',
    layout: 'pemdes-overlay',
    showHeader: true,
    showFooter: true,
    showWatermark: false,
    overlayStyle: 'gradient-bottom',
    badgeText: 'INFO DESA',
  },
  {
    id: 'berita-modern',
    name: 'Berita Desa Modern',
    category: 'Berita',
    description: 'Layout berita bersih dengan foto utama, badge kategori, dan footer identitas desa.',
    layout: 'photo-top',
    showHeader: true,
    showFooter: true,
    showWatermark: true,
    overlayStyle: 'gradient-bottom',
    badgeText: 'BERITA DESA',
  },
  {
    id: 'pengumuman-resmi',
    name: 'Pengumuman Resmi',
    category: 'Pengumuman',
    description: 'Header tegas dengan warna branding utama, cocok untuk edaran dan layanan publik.',
    layout: 'banner-official',
    showHeader: true,
    showFooter: true,
    showWatermark: true,
    overlayStyle: 'solid-card',
    badgeText: 'PENGUMUMAN',
  },
  {
    id: 'agenda-kegiatan',
    name: 'Agenda & Kegiatan',
    category: 'Agenda',
    description: 'Fokus visual penuh dengan kartu judul di bagian bawah untuk dokumentasi kegiatan.',
    layout: 'full-bleed',
    showHeader: true,
    showFooter: true,
    showWatermark: true,
    overlayStyle: 'gradient-bottom',
    badgeText: 'KEGIATAN DESA',
  },
  {
    id: 'umkm-potensi',
    name: 'Potensi & UMKM Desa',
    category: 'Ekonomi',
    description: 'Tampilan hangat dengan aksen warna cerah untuk promosi produk lokal dan wisata.',
    layout: 'split-frame',
    showHeader: true,
    showFooter: true,
    showWatermark: true,
    overlayStyle: 'accent-frame',
    badgeText: 'POTENSI DESA',
  },
  {
    id: 'infografis-ringkas',
    name: 'Ringkasan Informasi',
    category: 'Edukasi',
    description: 'Menonjolkan judul dan ringkasan berita agar mudah dibaca di feed media sosial.',
    layout: 'editorial-card',
    showHeader: true,
    showFooter: true,
    showWatermark: false,
    overlayStyle: 'clean-light',
    badgeText: 'INFO WARGA',
  },
];

function readJson(filename, fallback) {
  ensurePermanentDir();
  const filePath = path.join(PERMANENT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
    return structuredClone(fallback);
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return structuredClone(fallback);
  }
}

function writeJson(filename, data) {
  ensurePermanentDir();
  const filePath = path.join(PERMANENT_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

export function getBrandKit() {
  const stored = readJson('brand-kit.json', DEFAULT_BRAND_KIT);
  // Auto-migrate any legacy placeholder brand kit to Desa Tobadak
  if (
    !stored.villageName ||
    /sukamaju/i.test(stored.villageName) ||
    /sukamaju/i.test(stored.footerText || '')
  ) {
    return writeJson('brand-kit.json', DEFAULT_BRAND_KIT);
  }
  const merged = { ...DEFAULT_BRAND_KIT, ...stored };
  if (
    !merged.villageLogo ||
    !merged.regencyLogo ||
    merged.regencyLogo === '/logos/logo-mamuju-tengah.jpg'
  ) {
    merged.villageLogo = merged.villageLogo || DEFAULT_BRAND_KIT.villageLogo;
    merged.regencyLogo =
      merged.regencyLogo === '/logos/logo-mamuju-tengah.jpg' || !merged.regencyLogo
        ? DEFAULT_BRAND_KIT.regencyLogo
        : merged.regencyLogo;
    return writeJson('brand-kit.json', merged);
  }
  return merged;
}

export function saveBrandKit(data) {
  const merged = {
    ...getBrandKit(),
    ...data,
    colors: {
      ...DEFAULT_BRAND_KIT.colors,
      ...(data?.colors || {}),
    },
  };
  return writeJson('brand-kit.json', merged);
}

export function getSettings() {
  const stored = readJson('settings.json', DEFAULT_SETTINGS);
  if (!stored.operatorName || stored.operatorName === 'Operator Desa') {
    const upgraded = {
      ...DEFAULT_SETTINGS,
      ...stored,
      operatorName: DEFAULT_SETTINGS.operatorName,
      operatorRole: DEFAULT_SETTINGS.operatorRole,
    };
    return writeJson('settings.json', upgraded);
  }
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(data) {
  const merged = { ...getSettings(), ...data };
  return writeJson('settings.json', merged);
}

export function getMasterTemplates() {
  return readJson('templates.json', DEFAULT_MASTER_TEMPLATES);
}

export function saveMasterTemplates(templates) {
  return writeJson('templates.json', templates);
}

// ============================================================================
// TEMPORARY SESSION CACHE (Ephemeral, in-memory only, auto-expires via TTL)
// ============================================================================
const ephemeralSessions = new Map();

export function setSessionCache(sessionId, key, value, ttlMinutes = 60) {
  if (!sessionId) return;
  const now = Date.now();
  const existing = ephemeralSessions.get(sessionId) || {
    createdAt: now,
    data: {},
  };
  existing.expiresAt = now + Math.max(5, ttlMinutes) * 60 * 1000;
  existing.data[key] = value;
  ephemeralSessions.set(sessionId, existing);
}

export function getSessionCache(sessionId) {
  if (!sessionId) return null;
  const entry = ephemeralSessions.get(sessionId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    ephemeralSessions.delete(sessionId);
    return null;
  }
  return entry;
}

export function clearSessionCache(sessionId) {
  if (!sessionId) return false;
  return ephemeralSessions.delete(sessionId);
}

// Periodic cleanup of expired temporary sessions
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of ephemeralSessions.entries()) {
    if (now > entry.expiresAt) {
      ephemeralSessions.delete(id);
    }
  }
}, 60_000).unref();
