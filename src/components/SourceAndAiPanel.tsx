import React, { useState } from 'react';
import {
  Globe,
  Sparkles,
  FileText,
  Upload,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  Newspaper,
  Wand2,
  ArrowRight,
  CalendarHeart,
  UserCheck,
} from 'lucide-react';
import {
  AiGeneratedContent,
  BrandKit,
  ContentGoal,
  CrawledArticle,
} from '../types';
import { authFetch, safeParseJson } from '../utils/auth';

interface Props {
  sessionId: string;
  brandKit: BrandKit;
  contentGoal: ContentGoal;
  onChangeGoal: (goal: ContentGoal) => void;
  crawledArticles: CrawledArticle[];
  onCrawledArticles: (articles: CrawledArticle[]) => void;
  selectedArticle: CrawledArticle | null;
  onSelectArticle: (article: CrawledArticle) => void;
  aiContent: AiGeneratedContent | null;
  onAiContentChange: (ai: AiGeneratedContent) => void;
  onApplyToStudio: (data: {
    title: string;
    subtitle: string;
    dateLabel: string;
    photoUrl: string;
    badgeText?: string;
    ai: AiGeneratedContent;
  }) => void;
  onGoToNextStep: () => void;
}

const COMMEMORATIVE_PRESETS = [
  {
    label: 'Hari Guru Nasional',
    title: 'Hari Guru Nasional 2026',
    message:
      'Terima kasih atas dedikasi dan pengabdian para guru yang terus mencerdaskan generasi penerus bangsa di desa kita.',
  },
  {
    label: 'Hari Raya Nyepi',
    title: 'Hari Raya Nyepi Tahun Baru Saka',
    message:
      'Selamat melaksanakan Catur Brata Penyepian bagi umat Hindu. Semoga kedamaian dan ketenteraman senantiasa menyertai kita semua.',
  },
  {
    label: 'Hari Natal',
    title: 'Hari Raya Natal',
    message:
      'Selamat Hari Natal bagi umat Kristiani. Semoga kasih, damai, dan sukacita Natal membawa berkat bagi seluruh warga desa.',
  },
  {
    label: 'Idul Fitri',
    title: 'Hari Raya Idul Fitri 1447 H',
    message:
      'Minal aidin wal faizin, mohon maaf lahir dan batin. Semoga kita kembali fitri dan semakin erat dalam kebersamaan.',
  },
  {
    label: 'HUT RI',
    title: 'HUT Kemerdekaan Republik Indonesia',
    message:
      'Dirgahayu Republik Indonesia! Mari terus kobarkan semangat gotong royong untuk desa maju dan Indonesia sejahtera.',
  },
  {
    label: 'Hari Sumpah Pemuda',
    title: 'Hari Sumpah Pemuda',
    message:
      'Bersatu, bangkit, dan berkarya! Pemuda desa adalah motor penggerak inovasi dan masa depan pembangunan desa.',
  },
  {
    label: 'Hari Ibu',
    title: 'Selamat Hari Ibu',
    message:
      'Penghargaan setinggi-tingginya untuk seluruh ibu hebat yang menjadi tiang keluarga dan penggerak kehidupan bermasyarakat.',
  },
];

const SAMPLE_VILLAGE_ARTICLES: CrawledArticle[] = [
  {
    id: 'sample-1',
    title: 'Musyawarah Desa Penetapan APBDes Tahun Anggaran 2026 Berjalan Lancar',
    date: '2026-11-20',
    imageUrl: '',
    excerpt:
      'Pemerintah Desa Tobadak bersama BPD dan tokoh masyarakat menggelar Musyawarah Desa untuk menetapkan prioritas pembangunan infrastruktur dan pemberdayaan UMKM.',
    content:
      'Pemerintah Desa Tobadak bersama Badan Permusyawaratan Desa (BPD), perangkat desa, serta tokoh masyarakat menggelar Musyawarah Desa (Musdes) Penetapan APBDes Tahun Anggaran 2026 di Balai Desa Tobadak, Kecamatan Tobadak, Kabupaten Mamuju Tengah. Fokus utama tahun ini meliputi perbaikan jalan usaha tani, penguatan ketahanan pangan desa, serta dukungan modal dan digitalisasi bagi pelaku UMKM lokal.',
    sourceUrl: 'https://tobadak.desa.id/berita/musdes-apbdes-2026',
  },
  {
    id: 'sample-2',
    title: 'Posyandu Balita & Lansia Rutin Bulan November Digelar di Desa Tobadak',
    date: '2026-11-18',
    imageUrl: '',
    excerpt:
      'Kader Posyandu bersama Bidan Desa melaksanakan pemeriksaan kesehatan rutin, pemberian makanan tambahan (PMT), serta edukasi gizi keluarga.',
    content:
      'Kegiatan Posyandu Balita dan Lansia rutin kembali dilaksanakan di Desa Tobadak, Kecamatan Tobadak. Warga mendapatkan layanan penimbangan balita, pemeriksaan tekanan darah bagi lansia, konsultasi gizi, serta Pemberian Makanan Tambahan (PMT) bergizi berbahan pangan lokal.',
    sourceUrl: 'https://tobadak.desa.id/berita/posyandu-november',
  },
];

export const SourceAndAiPanel: React.FC<Props> = ({
  sessionId,
  brandKit,
  contentGoal,
  onChangeGoal,
  crawledArticles,
  onCrawledArticles,
  selectedArticle,
  onSelectArticle,
  aiContent,
  onAiContentChange,
  onApplyToStudio,
  onGoToNextStep,
}) => {
  const [sourceTab, setSourceTab] = useState<'crawl' | 'manual' | 'ucapan'>('crawl');
  const rawWebsite = brandKit.websiteUrl || 'www.tobadak.desa.id';
  const targetCrawlUrl = /^https?:\/\//i.test(rawWebsite)
    ? rawWebsite
    : `https://${rawWebsite}`;
  const [crawlMethod, setCrawlMethod] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState('');

  const [manualTitle, setManualTitle] = useState('');
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [manualContent, setManualContent] = useState('');
  const [manualPhoto, setManualPhoto] = useState('');
  const [leaderName, setLeaderName] = useState('Kepala Desa Tobadak');
  const [tone, setTone] = useState('informatif-ramah');

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCrawl = async () => {
    setCrawling(true);
    setCrawlError('');
    try {
      const res = await authFetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetCrawlUrl, sessionId }),
      });
      const parsed = await safeParseJson<{ method?: string; articles?: CrawledArticle[]; error?: string }>(res);
      if (!parsed.ok || !parsed.data) {
        throw new Error('Backend crawler tidak tersedia di mode static hosting. Gunakan "Muat Contoh Artikel" atau Input Manual.');
      }
      const data = parsed.data;
      if (!res.ok) throw new Error(data.error || 'Gagal crawl website.');
      setCrawlMethod(data.method || 'Crawler');
      onCrawledArticles(data.articles || []);
    } catch (err: unknown) {
      setCrawlError(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat crawling.'
      );
    } finally {
      setCrawling(false);
    }
  };

  const handlePickArticle = (article: CrawledArticle) => {
    onSelectArticle(article);
    setManualTitle(article.title);
    setManualDate((article.date || '').slice(0, 10) || new Date().toISOString().slice(0, 10));
    setManualContent(article.content || article.excerpt);
    setManualPhoto(article.imageUrl || '');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setManualPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAi = async () => {
    const isGreetingMode = sourceTab === 'ucapan';
    const title = manualTitle.trim() || selectedArticle?.title || '';
    const content = manualContent.trim() || selectedArticle?.content || '';
    if (!title && !content) {
      setGenError(
        isGreetingMode
          ? 'Pilih atau isi nama Hari Besar / Peringatan terlebih dahulu.'
          : 'Pilih artikel atau isi judul/materi terlebih dahulu.'
      );
      return;
    }

    setGenerating(true);
    setGenError('');
    try {
      const res = await authFetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          date: manualDate,
          villageName: brandKit.villageName,
          regencyName: brandKit.regencyName,
          tone,
          contentType: isGreetingMode ? 'ucapan-hari-besar' : contentGoal,
          leaderName: isGreetingMode ? leaderName.trim() : '',
        }),
      });
      const parsed = await safeParseJson<AiGeneratedContent & { error?: string }>(res);
      let data: AiGeneratedContent;
      if (!parsed.ok || !parsed.data) {
        // Static-host fallback (e.g. Netlify without Node server)
        const shortVillage = (brandKit.villageName || 'Desa Tobadak').replace(/^Pemerintah\s+/i, '');
        const cleanBody = content || (isGreetingMode
          ? `${leaderName.trim() || `Kepala ${shortVillage}`} beserta jajaran ${brandKit.villageName} mengucapkan Selamat ${title}.`
          : `${title}. Informasi resmi dari ${brandKit.villageName}.`);
        data = {
          provider: 'Browser Local Generator',
          posterTitle: isGreetingMode && !/^selamat\b/i.test(title) ? `Selamat ${title}` : title,
          posterSubtitle: cleanBody.slice(0, 105),
          newsSummary: cleanBody,
          captionInstagram: `${title.toUpperCase()}\n\n${cleanBody}\n\n#PemdesTobadak #InfoDesa #DesaMaju`,
          captionFacebook: `[${shortVillage.toUpperCase()}] ${title}\n\n${cleanBody}\n\n#PemdesTobadak #InfoDesa`,
          hashtags: '#PemdesTobadak #InfoDesa #KabarDesa #DesaMaju',
          photoCaption: `${title} — ${brandKit.villageName}`,
          reelsConcept: {
            hook: `${title} — ${shortVillage}`,
            durationSec: 15,
            slides: [
              { headline: title, subtitle: shortVillage, durationSec: 4 },
              { headline: 'Informasi Utama', subtitle: cleanBody.slice(0, 90), durationSec: 5 },
              { headline: 'Bagikan Info Ini', subtitle: `Ikuti terus info resmi ${shortVillage}`, durationSec: 4 },
            ],
            outroCta: `Ikuti terus info resmi ${shortVillage}!`,
          },
        };
      } else {
        if (!res.ok) throw new Error(parsed.data.error || 'Gagal generate konten.');
        data = parsed.data;
      }
      onAiContentChange(data);
      onApplyToStudio({
        title: data.posterTitle || title,
        subtitle: data.posterSubtitle || data.newsSummary || '',
        dateLabel: manualDate
          ? new Date(manualDate).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : '',
        photoUrl: manualPhoto || selectedArticle?.imageUrl || '',
        badgeText: isGreetingMode ? 'UCAPAN RESMI' : undefined,
        ai: data,
      });
    } catch (err: unknown) {
      setGenError(
        err instanceof Error ? err.message : 'Gagal menghubungi AI Writer.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Pilih Jenis Konten */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Langkah 1
            </span>
            <h2 className="text-lg font-bold text-white">Pilih Jenis Konten</h2>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
            Sesi Sementara • Tidak Disimpan ke DB
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              id: 'poster' as ContentGoal,
              title: 'Poster / Feed',
              desc: 'Desain PNG/JPG + Caption IG & FB',
            },
            {
              id: 'reels' as ContentGoal,
              title: 'Video Reels',
              desc: 'Slideshow MP4 vertikal + Intro/Outro',
            },
            {
              id: 'paket' as ContentGoal,
              title: 'Paket Lengkap',
              desc: 'Poster + Reels + Caption dalam 1 ZIP',
            },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeGoal(item.id)}
              className={`rounded-xl border p-4 text-left transition ${
                contentGoal === item.id
                  ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-white">{item.title}</div>
              <div className="mt-1 text-xs text-slate-400">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Sumber Materi (Crawler vs Manual) */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Langkah 2
              </span>
              <h2 className="text-lg font-bold text-white">Sumber Konten</h2>
            </div>
            <div className="flex rounded-lg bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setSourceTab('crawl')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  sourceTab === 'crawl'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                Crawler Website
              </button>
              <button
                type="button"
                onClick={() => setSourceTab('manual')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  sourceTab === 'manual'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Input Manual
              </button>
              <button
                type="button"
                onClick={() => {
                  setSourceTab('ucapan');
                  setTone('ucapan-hangat');
                }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  sourceTab === 'ucapan'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarHeart className="h-3.5 w-3.5" />
                Ucapan / Hari Besar
              </button>
            </div>
          </div>

          {sourceTab === 'crawl' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/90 p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">
                      Sumber Website Desa Otomatis
                    </div>
                    <div className="text-sm font-bold text-white">
                      {targetCrawlUrl.replace(/^https?:\/\//, '')}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCrawl}
                  disabled={crawling}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {crawling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  {crawling ? 'Mengambil Artikel...' : 'Ambil Artikel Terbaru'}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Mendukung WordPress REST API, RSS Feed, & HTML Artikel.</span>
                <button
                  type="button"
                  onClick={() => {
                    setCrawlMethod('Contoh Artikel Sesi');
                    onCrawledArticles(SAMPLE_VILLAGE_ARTICLES);
                  }}
                  className="font-medium text-emerald-400 hover:underline"
                >
                  Muat Contoh Artikel
                </button>
              </div>

              {crawlError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {crawlError}
                </div>
              )}

              {crawledArticles.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Ditemukan {crawledArticles.length} artikel{' '}
                      {crawlMethod ? `(${crawlMethod})` : ''}
                    </span>
                    <span className="text-amber-400">Cache sesi sementara</span>
                  </div>
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {crawledArticles.map((art) => {
                      const active = selectedArticle?.id === art.id;
                      return (
                        <button
                          key={art.id}
                          type="button"
                          onClick={() => handlePickArticle(art)}
                          className={`flex w-full gap-3 rounded-xl border p-3 text-left transition ${
                            active
                              ? 'border-emerald-500 bg-emerald-500/10'
                              : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                          }`}
                        >
                          {art.imageUrl ? (
                            <img
                              src={`/api/proxy-image?url=${encodeURIComponent(art.imageUrl)}`}
                              alt=""
                              className="h-16 w-16 shrink-0 rounded-lg object-cover bg-slate-800"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-500">
                              <Newspaper className="h-6 w-6" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="line-clamp-2 text-sm font-semibold text-white">
                                {art.title}
                              </h4>
                              {active && (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                              )}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                              {art.excerpt}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {sourceTab === 'ucapan' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-100">
                <div className="font-semibold text-emerald-300">
                  Mode Ucapan Hari Besar & Foto Kepala Desa
                </div>
                <p className="mt-1 text-slate-300">
                  Pilih peringatan hari besar, isi nama Kepala Desa, lalu upload foto beliau sebagai
                  konten utama. AI akan membuatkan ucapan resmi, caption IG/FB, dan konsep Reels.
                </p>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium text-slate-300">
                  Pilih Cepat Hari Besar / Peringatan:
                </div>
                <div className="flex flex-wrap gap-2">
                  {COMMEMORATIVE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setManualTitle(preset.title);
                        setManualContent(preset.message);
                        setTone('ucapan-hangat');
                      }}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                        manualTitle === preset.title
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs text-slate-300">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                    Nama & Jabatan (Foto Utama)
                  </label>
                  <input
                    type="text"
                    value={leaderName}
                    onChange={(e) => setLeaderName(e.target.value)}
                    placeholder="Contoh: H. Ahmad — Kepala Desa Tobadak"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Foto Kepala Desa / Tokoh
                  </label>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-500/50 bg-slate-950 px-3 py-2 text-xs font-semibold text-emerald-300 hover:border-emerald-400 hover:bg-slate-900">
                    <Upload className="h-3.5 w-3.5" />
                    {manualPhoto ? 'Ganti Foto Kepala Desa' : 'Upload Foto Kepala Desa'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {manualPhoto && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                  <img
                    src={manualPhoto}
                    alt="Preview Foto Kepala Desa"
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                  <div className="flex-1 text-xs">
                    <div className="font-semibold text-white">Foto Utama Siap Dipakai</div>
                    <div className="text-slate-400">
                      Otomatis masuk ke Design Poster & Reels setelah Generate AI.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManualPhoto('')}
                    className="rounded-lg px-2 py-1 text-xs text-rose-400 hover:bg-rose-500/10"
                  >
                    Hapus
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Manual / Active Content Editor */}
          <div className="space-y-3 border-t border-slate-800 pt-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {sourceTab === 'ucapan' ? 'Detail Ucapan Hari Besar' : 'Materi yang Akan Diolah'}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-400">
                  {sourceTab === 'ucapan'
                    ? 'Nama Peringatan / Hari Besar'
                    : 'Judul Berita / Kegiatan'}
                </label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder={
                    sourceTab === 'ucapan'
                      ? 'Contoh: Hari Guru Nasional 2026 / Hari Raya Nyepi'
                      : 'Contoh: Penyaluran BLT Dana Desa Tahap IV'
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Tanggal</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">
                {sourceTab === 'ucapan'
                  ? 'Pesan / Harapan Khusus (Opsional)'
                  : 'Isi Artikel / Poin Informasi'}
              </label>
              <textarea
                rows={4}
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                placeholder={
                  sourceTab === 'ucapan'
                    ? 'Tulis pesan khusus dari Kepala Desa (atau biarkan kosong setelah pilih preset untuk dibuatkan otomatis oleh AI)...'
                    : 'Tempel isi berita atau tulis poin-poin penting kegiatan desa...'
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-slate-600">
                <Upload className="h-3.5 w-3.5 text-emerald-400" />
                {manualPhoto ? 'Ganti Foto Utama' : 'Upload Foto (Sementara)'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>

              <div className="flex items-center gap-2">
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="informatif-ramah">Gaya: Informatif & Ramah</option>
                  <option value="resmi-formal">Gaya: Resmi Pemerintah</option>
                  <option value="ucapan-hangat">Gaya: Ucapan & Apresiasi</option>
                  <option value="antusias-promosi">Gaya: Promosi UMKM / Wisata</option>
                </select>
                <button
                  type="button"
                  onClick={handleGenerateAi}
                  disabled={generating}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate AI
                </button>
              </div>
            </div>

            {genError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                {genError}
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Content Writer Results */}
        <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                AI Content Writer
              </span>
              <h2 className="text-lg font-bold text-white">
                Hasil Generate Naskah & Caption
              </h2>
            </div>
            {aiContent?.provider && (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                {aiContent.provider}
              </span>
            )}
          </div>

          {!aiContent ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 p-8 text-center">
              <Wand2 className="mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">
                Belum ada konten yang di-generate pada sesi ini
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Pilih artikel dari website desa atau isi materi manual di sebelah kiri,
                lalu klik <strong>Generate AI</strong> untuk membuat judul poster,
                ringkasan, caption IG/FB, hashtag, dan konsep Reels.
              </p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto pr-1">
              {[
                {
                  key: 'posterTitle',
                  label: 'Judul Poster',
                  value: aiContent.posterTitle,
                  rows: 2,
                },
                {
                  key: 'newsSummary',
                  label: 'Ringkasan Berita',
                  value: aiContent.newsSummary,
                  rows: 2,
                },
                {
                  key: 'captionInstagram',
                  label: 'Caption Instagram',
                  value: aiContent.captionInstagram,
                  rows: 5,
                },
                {
                  key: 'captionFacebook',
                  label: 'Caption Facebook',
                  value: aiContent.captionFacebook,
                  rows: 4,
                },
                {
                  key: 'photoCaption',
                  label: 'Keterangan Foto',
                  value: aiContent.photoCaption,
                  rows: 2,
                },
                {
                  key: 'hashtags',
                  label: 'Hashtag',
                  value: aiContent.hashtags,
                  rows: 2,
                },
              ].map((field) => (
                <div key={field.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      {field.label}
                    </label>
                    <button
                      type="button"
                      onClick={() => copyText(field.key, field.value)}
                      className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      {copiedKey === field.key ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Disalin
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Salin
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={field.rows}
                    value={field.value}
                    onChange={(e) =>
                      onAiContentChange({
                        ...aiContent,
                        [field.key]: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs leading-relaxed text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              ))}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onGoToNextStep}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Lanjut Edit & Preview
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
