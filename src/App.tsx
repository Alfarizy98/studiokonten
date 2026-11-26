import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Palette,
  Settings,
  Trash2,
  Newspaper,
  Image as ImageIcon,
  Film,
  Download,
  Clock,
  LogOut,
  Loader2,
} from 'lucide-react';
import {
  AiGeneratedContent,
  AppSettings,
  BrandKit,
  ContentGoal,
  CrawledArticle,
  MasterTemplate,
  PosterState,
  ReelsState,
  StudioStep,
} from './types';
import { SourceAndAiPanel } from './components/SourceAndAiPanel';
import { DesignStudio } from './components/DesignStudio';
import { ReelsStudio } from './components/ReelsStudio';
import { ExportStudio } from './components/ExportStudio';
import { BrandKitModal } from './components/BrandKitModal';
import { SettingsModal } from './components/SettingsModal';
import { LoginPage } from './components/LoginPage';
import {
  AuthUser,
  authFetch,
  clearAuthToken,
  getAuthToken,
} from './utils/auth';
import {
  clearImageCache,
  renderPosterToCanvas,
} from './utils/posterRenderer';

const INITIAL_BRAND_KIT: BrandKit = {
  villageName: 'Pemerintah Desa Tobadak',
  districtName: 'Kecamatan Tobadak',
  regencyName: 'Kabupaten Mamuju Tengah',
  villageLogo: '/logos/logo-kemendes.png',
  regencyLogo: '/logos/logo-mamuju-tengah.png',
  colors: {
    primary: '#14532d',
    secondary: '#052e16',
    accent: '#eab308',
    background: '#f8fafc',
    textLight: '#ffffff',
    textDark: '#0f172a',
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

const PEMDES_EDITORIAL_TEMPLATE: MasterTemplate = {
  id: 'pemdes-editorial',
  name: 'Branding Pemdes Elegan',
  category: 'Utama',
  description:
    'Foto full-bleed dengan gradasi hijau atmosferik, logo mengambang di kiri atas, garis aksen emas di kanan atas, dan footer minimalis.',
  layout: 'pemdes-overlay',
  showHeader: true,
  showFooter: true,
  showWatermark: false,
  overlayStyle: 'gradient-bottom',
  badgeText: 'INFO DESA',
};

const INITIAL_SETTINGS: AppSettings = {
  operatorName: 'Operator Desa Tobadak',
  operatorRole: 'Admin Media Pemdes Tobadak',
  aiProvider: 'auto',
  geminiApiKey: '',
  openaiApiKey: '',
  defaultPlatform: 'ig_feed',
  sessionTtlMinutes: 60,
};

function getOrCreateSessionId(): string {
  const existing = sessionStorage.getItem('studio_session_id');
  if (existing) return existing;
  const id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem('studio_session_id', id);
  return id;
}

function createInitialPoster(brandKit: BrandKit, settings: AppSettings): PosterState {
  return {
    platform: settings.defaultPlatform || 'ig_feed',
    templateId: brandKit.defaultTemplateId || 'pemdes-editorial',
    badgeText: 'INFO DESA',
    title: 'Informasi & Layanan Terbaru Desa Tobadak',
    subtitle: 'Ambil artikel terbaru dari tobadak.desa.id atau tulis materi manual untuk mulai membuat konten.',
    dateLabel: new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    photoUrl: '',
    fontFamily: brandKit.fontFamily || 'Plus Jakarta Sans',
    primaryColor: brandKit.colors.primary,
    accentColor: brandKit.colors.accent,
    overlayOpacity: 0.78,
    showHeader: true,
    showFooter: true,
    showWatermark: false,
  };
}

function createInitialReels(): ReelsState {
  return {
    templateStyle: 'berita-cepat',
    showIntro: true,
    showOutro: true,
    introHook: 'Warga Desa Tobadak, simak informasi terbaru hari ini!',
    outroCta: 'Ikuti terus informasi resmi Pemdes Tobadak!',
    slides: [
      {
        id: 'init-1',
        mediaUrl: '',
        mediaType: 'image',
        headline: 'Update Informasi Desa Tobadak',
        subtitle: 'Transparan, cepat, dan terpercaya untuk seluruh warga.',
        durationSec: 4,
      },
    ],
  };
}

export function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [sessionId, setSessionId] = useState<string>(() => getOrCreateSessionId());
  const [step, setStep] = useState<StudioStep>('source');
  const [contentGoal, setContentGoal] = useState<ContentGoal>('paket');

  // PERMANENT DATA
  const [brandKit, setBrandKit] = useState<BrandKit>(INITIAL_BRAND_KIT);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [templates, setTemplates] = useState<MasterTemplate[]>([]);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // TEMPORARY SESSION DATA (Never saved to permanent DB)
  const [crawledArticles, setCrawledArticles] = useState<CrawledArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<CrawledArticle | null>(null);
  const [aiContent, setAiContent] = useState<AiGeneratedContent | null>(null);
  const [poster, setPoster] = useState<PosterState>(() =>
    createInitialPoster(INITIAL_BRAND_KIT, INITIAL_SETTINGS)
  );
  const [reels, setReels] = useState<ReelsState>(() => createInitialReels());
  const [reelsBlob, setReelsBlob] = useState<Blob | null>(null);
  const [reelsExt, setReelsExt] = useState<'mp4' | 'webm'>('mp4');
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number>(
    () => Date.now() + 60 * 60 * 1000
  );
  const [minutesLeft, setMinutesLeft] = useState<number>(60);

  const exportCanvasRef = useRef<HTMLCanvasElement>(null);

  // Verify existing auth token on startup
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setAuthChecking(false);
      return;
    }
    authFetch('/api/auth/me')
      .then(async (r) => {
        if (!r.ok) throw new Error('Unauthorized');
        const data = await r.json();
        setAuthUser(data.user || null);
      })
      .catch(() => {
        clearAuthToken();
        setAuthUser(null);
      })
      .finally(() => setAuthChecking(false));
  }, []);

  // Load permanent config once authenticated
  useEffect(() => {
    if (!authUser) return;
    Promise.all([
      authFetch('/api/permanent/brand-kit').then((r) => r.json()),
      authFetch('/api/permanent/settings').then((r) => r.json()),
      authFetch('/api/permanent/templates').then((r) => r.json()),
    ])
      .then(([bk, st, tpls]) => {
        let resolvedBrandKit = INITIAL_BRAND_KIT;
        if (bk) {
          const isLegacy =
            !bk.villageName ||
            /sukamaju/i.test(bk.villageName) ||
            /sukamakmur/i.test(bk.districtName || '') ||
            /sejahtera/i.test(bk.regencyName || '');

          if (isLegacy) {
            resolvedBrandKit = INITIAL_BRAND_KIT;
            authFetch('/api/permanent/brand-kit', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(INITIAL_BRAND_KIT),
            }).catch(() => { });
          } else {
            const regLogo =
              !bk.regencyLogo || bk.regencyLogo === '/logos/logo-mamuju-tengah.jpg'
                ? INITIAL_BRAND_KIT.regencyLogo
                : bk.regencyLogo;
            resolvedBrandKit = {
              ...INITIAL_BRAND_KIT,
              ...bk,
              villageLogo: bk.villageLogo || INITIAL_BRAND_KIT.villageLogo,
              regencyLogo: regLogo,
            };
            if (regLogo !== bk.regencyLogo) {
              authFetch('/api/permanent/brand-kit', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resolvedBrandKit),
              }).catch(() => { });
            }
          }
          setBrandKit(resolvedBrandKit);
        }

        if (st) {
          const resolvedSettings =
            !st.operatorName || st.operatorName === 'Operator Desa'
              ? { ...st, operatorName: INITIAL_SETTINGS.operatorName, operatorRole: INITIAL_SETTINGS.operatorRole }
              : st;
          setSettings(resolvedSettings);
          setSessionExpiresAt(Date.now() + (resolvedSettings.sessionTtlMinutes || 60) * 60 * 1000);
        }

        const loadedTemplates: MasterTemplate[] = Array.isArray(tpls) ? tpls : [];
        const hasEditorial = loadedTemplates.some((t) => t.id === 'pemdes-editorial');
        const finalTemplates = hasEditorial
          ? loadedTemplates
          : [PEMDES_EDITORIAL_TEMPLATE, ...loadedTemplates];
        setTemplates(finalTemplates);

        setPoster((prev) => ({
          ...prev,
          platform: st?.defaultPlatform || prev.platform,
          templateId: resolvedBrandKit.defaultTemplateId || 'pemdes-editorial',
          fontFamily: resolvedBrandKit.fontFamily || prev.fontFamily,
          primaryColor: resolvedBrandKit.colors?.primary || prev.primaryColor,
          accentColor: resolvedBrandKit.colors?.accent || prev.accentColor,
        }));
      })
      .catch((err) => console.error('Gagal memuat konfigurasi permanen:', err));
  }, [authUser]);

  // Keep offscreen export canvas synced for PNG/JPG/ZIP export from any tab
  useEffect(() => {
    const canvas = exportCanvasRef.current;
    if (!canvas) return;
    const tpl = templates.find((t) => t.id === poster.templateId) || templates[0];
    renderPosterToCanvas(canvas, poster, brandKit, tpl);
  }, [poster, brandKit, templates]);

  // Session TTL countdown & auto-clear
  useEffect(() => {
    const timer = setInterval(() => {
      const diffMs = sessionExpiresAt - Date.now();
      if (diffMs <= 0) {
        handleClearSession(true);
      } else {
        setMinutesLeft(Math.ceil(diffMs / 60000));
      }
    }, 15000);
    return () => clearInterval(timer);
  });

  const handleClearSession = async (auto = false) => {
    try {
      await authFetch(`/api/session/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      });
    } catch {
      // Ignore network error on cleanup
    }
    // Revoke temporary blob URLs from Reels slides & clear image cache
    reels.slides.forEach((s) => {
      if (s.mediaUrl && s.mediaUrl.startsWith('blob:')) {
        URL.revokeObjectURL(s.mediaUrl);
      }
    });
    clearImageCache();
    sessionStorage.removeItem('studio_session_id');
    const newId = getOrCreateSessionId();
    setSessionId(newId);
    setCrawledArticles([]);
    setSelectedArticle(null);
    setAiContent(null);
    setPoster(createInitialPoster(brandKit, settings));
    setReels(createInitialReels());
    setReelsBlob(null);
    setSessionExpiresAt(Date.now() + (settings.sessionTtlMinutes || 60) * 60 * 1000);
    setMinutesLeft(settings.sessionTtlMinutes || 60);
    setStep('source');
    if (auto) {
      alert('Batas waktu sesi sementara berakhir. Semua file & data sementara telah dibersihkan.');
    }
  };

  const handleSaveBrandKit = async (next: BrandKit) => {
    const res = await authFetch('/api/permanent/brand-kit', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    const saved = await res.json();
    setBrandKit(saved);
    setPoster((prev) => ({
      ...prev,
      fontFamily: saved.fontFamily,
      primaryColor: saved.colors.primary,
      accentColor: saved.colors.accent,
    }));
  };

  const handleSaveSettings = async (next: AppSettings) => {
    const res = await authFetch('/api/permanent/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    const saved = await res.json();
    setSettings(saved);
    setSessionExpiresAt(Date.now() + (saved.sessionTtlMinutes || 60) * 60 * 1000);
  };

  const handleSaveMasterTemplate = async (tpl: MasterTemplate) => {
    const res = await authFetch('/api/permanent/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tpl),
    });
    const updated = await res.json();
    if (Array.isArray(updated)) {
      setTemplates(updated);
      setPoster((prev) => ({ ...prev, templateId: tpl.id }));
    }
  };

  const handleApplyAiToStudio = (data: {
    title: string;
    subtitle: string;
    dateLabel: string;
    photoUrl: string;
    badgeText?: string;
    ai: AiGeneratedContent;
  }) => {
    setPoster((prev) => ({
      ...prev,
      title: data.title,
      subtitle: data.subtitle,
      dateLabel: data.dateLabel || prev.dateLabel,
      photoUrl: data.photoUrl || prev.photoUrl,
      badgeText: data.badgeText || prev.badgeText,
    }));

    if (data.ai?.reelsConcept) {
      setReels((prev) => ({
        ...prev,
        introHook: data.ai.reelsConcept.hook || prev.introHook,
        outroCta: data.ai.reelsConcept.outroCta || prev.outroCta,
        slides: data.ai.reelsConcept.slides.map((s, idx) => ({
          id: `ai-slide-${idx}-${Date.now()}`,
          mediaUrl: data.photoUrl || prev.slides[idx]?.mediaUrl || '',
          mediaType: 'image',
          headline: s.headline,
          subtitle: s.subtitle,
          durationSec: s.durationSec || 4,
        })),
      }));
      setReelsBlob(null);
    }
  };

  const handleLogout = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout network error
    }
    clearAuthToken();
    setAuthUser(null);
  };

  const navSteps: { id: StudioStep; label: string; icon: React.ReactNode }[] = [
    { id: 'source', label: '1. Sumber & AI Writer', icon: <Newspaper className="h-4 w-4" /> },
    { id: 'design', label: '2. Design Poster', icon: <ImageIcon className="h-4 w-4" /> },
    { id: 'reels', label: '3. Reels Generator', icon: <Film className="h-4 w-4" /> },
    { id: 'export', label: '4. Download & Post', icon: <Download className="h-4 w-4" /> },
  ];

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#093b6e] text-white">
        <div className="flex items-center gap-2.5 text-sm font-semibold">
          <Loader2 className="h-5 w-5 animate-spin text-[#ffc91b]" />
          Memeriksa sesi login...
        </div>
      </div>
    );
  }

  if (!authUser) {
    return <LoginPage onLoginSuccess={(user) => setAuthUser(user)} />;
  }

  return (
    <div className="djp-theme min-h-screen bg-[#f4f6f9] text-[#1d2649]">
      {/* Top Studio Header — Gaya Portal pajak.go.id (DJP Navy #093b6e + Gold #ffc91b) */}
      <header className="sticky top-0 z-30 border-b-4 border-[#ffc91b] bg-[#093b6e] text-white shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ffc91b] text-[#093b6e] shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold uppercase tracking-wide text-white">
                Studio Konten Desa Tobadak
              </h1>
              <p className="text-xs text-[#dadff1]">
                Kec. Tobadak, Kab. Mamuju Tengah • {authUser.name} ({authUser.email})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              title="Data produksi hanya disimpan sementara selama sesi kerja"
              className="hidden items-center gap-1.5 rounded-md border border-white/20 bg-[#052240] px-3 py-1.5 text-xs text-white sm:flex"
            >
              <Clock className="h-3.5 w-3.5 text-[#ffc91b]" />
              <span>Sesi: {minutesLeft} mnt</span>
            </div>

            <button
              type="button"
              onClick={() => setBrandModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/25 bg-[#212c5f] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#0088cc]"
            >
              <Palette className="h-3.5 w-3.5 text-[#ffc91b]" />
              Brand Kit
            </button>

            <button
              type="button"
              onClick={() => setSettingsModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/25 bg-[#212c5f] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#0088cc]"
            >
              <Settings className="h-3.5 w-3.5 text-[#dadff1]" />
              Pengaturan
            </button>

            <button
              type="button"
              onClick={() => handleClearSession(false)}
              className="inline-flex items-center gap-1.5 rounded-md border border-rose-300/40 bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus Sesi
            </button>

            <button
              type="button"
              onClick={handleLogout}
              title={`Keluar (${authUser.email})`}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/25 bg-[#052240] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <LogOut className="h-3.5 w-3.5 text-[#ffc91b]" />
              Keluar
            </button>
          </div>
        </div>

        {/* Workflow Stepper — Gaya #mainNav pajak.go.id (Active tab Gold #ffc91b) */}
        <div className="bg-[#052240]/90">
          <div className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto px-4 py-2">
            {navSteps.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(item.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${step === item.id
                    ? 'bg-[#ffc91b] text-[#093b6e] shadow-sm'
                    : 'text-[#dadff1] hover:bg-[#0088cc] hover:text-white'
                  }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {step === 'source' && (
          <SourceAndAiPanel
            sessionId={sessionId}
            brandKit={brandKit}
            contentGoal={contentGoal}
            onChangeGoal={setContentGoal}
            crawledArticles={crawledArticles}
            onCrawledArticles={setCrawledArticles}
            selectedArticle={selectedArticle}
            onSelectArticle={setSelectedArticle}
            aiContent={aiContent}
            onAiContentChange={setAiContent}
            onApplyToStudio={handleApplyAiToStudio}
            onGoToNextStep={() =>
              setStep(contentGoal === 'reels' ? 'reels' : 'design')
            }
          />
        )}

        {step === 'design' && (
          <DesignStudio
            poster={poster}
            onChangePoster={setPoster}
            brandKit={brandKit}
            templates={templates}
            onSaveMasterTemplate={handleSaveMasterTemplate}
            canvasRef={exportCanvasRef}
          />
        )}

        {step === 'reels' && (
          <ReelsStudio
            reels={reels}
            onChangeReels={(next) => {
              setReels(next);
              setReelsBlob(null);
            }}
            brandKit={brandKit}
            renderedBlob={reelsBlob}
            renderedExt={reelsExt}
            onRenderedVideo={(blob, ext) => {
              setReelsBlob(blob);
              setReelsExt(ext);
            }}
          />
        )}

        {step === 'export' && (
          <ExportStudio
            posterCanvasRef={exportCanvasRef}
            poster={poster}
            reels={reels}
            reelsBlob={reelsBlob}
            reelsExt={reelsExt}
            onRenderedVideo={(blob, ext) => {
              setReelsBlob(blob);
              setReelsExt(ext);
            }}
            aiContent={aiContent}
            brandKit={brandKit}
          />
        )}

        {/* Hidden offscreen canvas kept mounted when not on Design tab */}
        {step !== 'design' && (
          <canvas ref={exportCanvasRef} className="hidden" />
        )}
      </main>

      {/* Permanent Config Modals */}
      <BrandKitModal
        open={brandModalOpen}
        onClose={() => setBrandModalOpen(false)}
        brandKit={brandKit}
        templates={templates}
        onSave={handleSaveBrandKit}
      />
      <SettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

export default App;
