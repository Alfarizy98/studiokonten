import React, { useState } from 'react';
import {
  Download,
  FileArchive,
  FileText,
  Image as ImageIcon,
  Film,
  Copy,
  Check,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  AiGeneratedContent,
  BrandKit,
  PLATFORM_PRESETS,
  PosterState,
  ReelsState,
} from '../types';
import {
  buildCaptionTxt,
  canvasToBlob,
  downloadBlob,
  downloadZipPackage,
} from '../utils/downloadPackage';
import { exportReelsToMp4 } from '../utils/reelsExporter';

interface Props {
  posterCanvasRef: React.RefObject<HTMLCanvasElement>;
  poster: PosterState;
  reels: ReelsState;
  reelsBlob: Blob | null;
  reelsExt: 'mp4' | 'webm';
  onRenderedVideo: (blob: Blob, ext: 'mp4' | 'webm') => void;
  aiContent: AiGeneratedContent | null;
  brandKit: BrandKit;
}

export const ExportStudio: React.FC<Props> = ({
  posterCanvasRef,
  poster,
  reels,
  reelsBlob,
  reelsExt,
  onRenderedVideo,
  aiContent,
  brandKit,
}) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const preset = PLATFORM_PRESETS[poster.platform];
  const baseSlug = (poster.title || 'konten-desa-tobadak')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40);

  const handleDownloadImage = async (format: 'png' | 'jpg') => {
    const canvas = posterCanvasRef.current;
    if (!canvas) return;
    setBusy(format);
    try {
      const blob = await canvasToBlob(canvas, format);
      downloadBlob(blob, `${baseSlug}-${poster.platform}.${format}`);
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadTxt = () => {
    const txt = buildCaptionTxt(aiContent, poster, brandKit);
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${baseSlug}-caption.txt`);
  };

  const handleDownloadMp4 = async () => {
    if (reelsBlob) {
      downloadBlob(reelsBlob, `${baseSlug}-reels.${reelsExt}`);
      return;
    }
    if (reels.slides.length === 0) return;
    setBusy('mp4');
    try {
      const result = await exportReelsToMp4(reels, brandKit);
      onRenderedVideo(result.blob, result.ext);
      downloadBlob(result.blob, `${baseSlug}-reels.${result.ext}`);
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadZip = async () => {
    setBusy('zip');
    try {
      let videoBlob = reelsBlob;
      let ext = reelsExt;
      if (!videoBlob && reels.slides.length > 0) {
        const res = await exportReelsToMp4(reels, brandKit);
        videoBlob = res.blob;
        ext = res.ext;
        onRenderedVideo(videoBlob, ext);
      }
      await downloadZipPackage({
        posterCanvas: posterCanvasRef.current,
        reelsBlob: videoBlob,
        reelsExt: ext,
        aiContent,
        posterState: poster,
        brandKit,
        baseFilename: baseSlug,
      });
    } finally {
      setBusy(null);
    }
  };

  const copyBlock = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Download Grid */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Tahap Akhir • Download & Post Manual
            </span>
            <h2 className="text-xl font-bold text-white">
              Unduh Hasil Produksi Konten
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Resolusi Poster: {preset.label} ({preset.aspectLabel}) • Video Reels:
              1080 × 1920 px (9:16)
            </p>
          </div>
          <button
            type="button"
            disabled={busy === 'zip'}
            onClick={handleDownloadZip}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
          >
            {busy === 'zip' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileArchive className="h-4 w-4" />
            )}
            Unduh Paket Lengkap (.ZIP)
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            disabled={busy === 'png'}
            onClick={() => handleDownloadImage('png')}
            className="flex flex-col items-start rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-left transition hover:border-emerald-500"
          >
            <ImageIcon className="mb-3 h-6 w-6 text-emerald-400" />
            <div className="font-bold text-white">Download PNG</div>
            <div className="mt-1 text-xs text-slate-400">
              Kualitas tajam tanpa kompresi ({preset.aspectLabel})
            </div>
          </button>

          <button
            type="button"
            disabled={busy === 'jpg'}
            onClick={() => handleDownloadImage('jpg')}
            className="flex flex-col items-start rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-left transition hover:border-emerald-500"
          >
            <Download className="mb-3 h-6 w-6 text-sky-400" />
            <div className="font-bold text-white">Download JPG</div>
            <div className="mt-1 text-xs text-slate-400">
              Ukuran ringan siap unggah WhatsApp / Web / FB
            </div>
          </button>

          <button
            type="button"
            disabled={busy === 'mp4' || reels.slides.length === 0}
            onClick={handleDownloadMp4}
            className="flex flex-col items-start rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-left transition hover:border-emerald-500 disabled:opacity-40"
          >
            {busy === 'mp4' ? (
              <Loader2 className="mb-3 h-6 w-6 animate-spin text-amber-400" />
            ) : (
              <Film className="mb-3 h-6 w-6 text-amber-400" />
            )}
            <div className="font-bold text-white">
              Download {reelsExt.toUpperCase()}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {reelsBlob
                ? 'Video Reels sudah dirender & siap unduh'
                : 'Render & unduh video Reels 1080×1920'}
            </div>
          </button>

          <button
            type="button"
            onClick={handleDownloadTxt}
            className="flex flex-col items-start rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-left transition hover:border-emerald-500"
          >
            <FileText className="mb-3 h-6 w-6 text-violet-400" />
            <div className="font-bold text-white">Download Caption TXT</div>
            <div className="mt-1 text-xs text-slate-400">
              Caption IG, FB, ringkasan, hashtag & konsep Reels
            </div>
          </button>
        </div>
      </div>

      {/* Quick Copy & Manual Posting Checklist */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h3 className="font-bold text-white">Salin Cepat Caption Siap Posting</h3>
          <div className="space-y-3">
            {[
              {
                key: 'ig',
                label: 'Caption Instagram',
                text:
                  aiContent?.captionInstagram ||
                  `${poster.title}\n\n${poster.subtitle}`,
              },
              {
                key: 'fb',
                label: 'Caption Facebook',
                text:
                  aiContent?.captionFacebook ||
                  `${poster.title}\n\n${poster.subtitle}`,
              },
            ].map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-slate-800 bg-slate-950 p-3.5"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400">
                    {item.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyBlock(item.key, item.text)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-200 hover:text-emerald-400"
                  >
                    {copied === item.key ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" /> Tersalin
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Salin Teks
                      </>
                    )}
                  </button>
                </div>
                <p className="whitespace-pre-line text-xs leading-relaxed text-slate-300">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h3 className="mb-3 font-bold text-white">
            Panduan Posting Manual (Non-Otomatis)
          </h3>
          <ul className="space-y-3 text-sm text-slate-300">
            {[
              'Unduh file Poster (PNG/JPG), Reels (MP4), atau Paket ZIP ke perangkat Anda.',
              'Salin Caption Instagram atau Caption Facebook yang sudah disesuaikan.',
              'Buka aplikasi Instagram, Facebook, WhatsApp Status, atau Website Desa secara manual lalu unggah file hasil unduhan.',
              'Setelah selesai, klik "Hapus Sesi" di pojok kanan atas untuk membersihkan seluruh file & data sementara.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs leading-relaxed">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
