import React, { useEffect, useState } from 'react';
import {
  Film,
  Plus,
  Trash2,
  Upload,
  Play,
  Pause,
  Download,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { BrandKit, ReelsMediaSlide, ReelsState } from '../types';
import { exportReelsToMp4 } from '../utils/reelsExporter';
import { downloadBlob } from '../utils/downloadPackage';
import { resolveCorsSafeImageUrl } from '../utils/posterRenderer';

interface Props {
  reels: ReelsState;
  onChangeReels: (next: ReelsState) => void;
  brandKit: BrandKit;
  renderedBlob: Blob | null;
  renderedExt: 'mp4' | 'webm';
  onRenderedVideo: (blob: Blob, ext: 'mp4' | 'webm') => void;
}

export const ReelsStudio: React.FC<Props> = ({
  reels,
  onChangeReels,
  brandKit,
  renderedBlob,
  renderedExt,
  onRenderedVideo,
}) => {
  const [previewIdx, setPreviewIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  // Slideshow preview player
  useEffect(() => {
    if (!playing || reels.slides.length === 0) return;
    const current = reels.slides[previewIdx] || reels.slides[0];
    const ms = Math.max(1500, (current?.durationSec || 4) * 1000);
    const timer = setTimeout(() => {
      setPreviewIdx((prev) => (prev + 1) % reels.slides.length);
    }, ms);
    return () => clearTimeout(timer);
  }, [playing, previewIdx, reels.slides]);

  const handleUploadMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newSlides: ReelsMediaSlide[] = files.map((file, i) => {
      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);
      return {
        id: `slide-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        mediaUrl: url,
        mediaType: isVideo ? 'video' : 'image',
        headline: 'Sorotan Kegiatan Desa',
        subtitle: file.name.replace(/\.[^.]+$/, ''),
        durationSec: 4,
      };
    });

    onChangeReels({
      ...reels,
      slides: [...reels.slides, ...newSlides],
    });
    e.target.value = '';
  };

  const handleSlideMediaReplace = (
    slideId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const url = URL.createObjectURL(file);
    updateSlide(slideId, {
      mediaUrl: url,
      mediaType: isVideo ? 'video' : 'image',
    });
    e.target.value = '';
  };

  const updateSlide = (id: string, patch: Partial<ReelsMediaSlide>) => {
    onChangeReels({
      ...reels,
      slides: reels.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  };

  const removeSlide = (id: string) => {
    onChangeReels({
      ...reels,
      slides: reels.slides.filter((s) => s.id !== id),
    });
    setPreviewIdx(0);
  };

  const addEmptySlide = () => {
    onChangeReels({
      ...reels,
      slides: [
        ...reels.slides,
        {
          id: `slide-${Date.now()}`,
          mediaUrl: '',
          mediaType: 'image',
          headline: 'Informasi Penting Warga',
          subtitle: 'Tambahkan keterangan singkat di sini',
          durationSec: 4,
        },
      ],
    });
  };

  const handleExportMp4 = async () => {
    if (reels.slides.length === 0) return;
    setExporting(true);
    setProgress(0);
    setStatusText('Memulai proses render...');
    try {
      const result = await exportReelsToMp4(reels, brandKit, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });
      onRenderedVideo(result.blob, result.ext);
      downloadBlob(result.blob, `reels-desa-tobadak.${result.ext}`);
    } catch (err) {
      console.error(err);
      setStatusText('Gagal mengekspor video. Coba lagi.');
    } finally {
      setExporting(false);
    }
  };

  const activeSlide = reels.slides[previewIdx] || reels.slides[0];

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left Editor */}
      <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Reels Generator (9:16 • 1080×1920)
            </span>
            <h2 className="text-lg font-bold text-white">
              Editor Slideshow & Video Reels
            </h2>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500">
            <Upload className="h-3.5 w-3.5" />
            Upload Foto / Video
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleUploadMedia}
              className="hidden"
            />
          </label>
        </div>

        {/* Template & Intro/Outro */}
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { id: 'berita-cepat', label: 'Berita Cepat' },
            { id: 'sorotan-kegiatan', label: 'Sorotan Kegiatan' },
            { id: 'pengumuman-singkat', label: 'Pengumuman Singkat' },
          ].map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() =>
                onChangeReels({
                  ...reels,
                  templateStyle: tpl.id as ReelsState['templateStyle'],
                })
              }
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${reels.templateStyle === tpl.id
                  ? 'border-emerald-500 bg-emerald-500/15 text-white'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
            >
              {tpl.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <input
                type="checkbox"
                checked={reels.showIntro}
                onChange={(e) =>
                  onChangeReels({ ...reels, showIntro: e.target.checked })
                }
                className="accent-emerald-500"
              />
              Intro Branding Desa (2.5 dtk)
            </label>
            <input
              type="text"
              value={reels.introHook}
              onChange={(e) =>
                onChangeReels({ ...reels, introHook: e.target.value })
              }
              placeholder="Kalimat pembuka / hook..."
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <input
                type="checkbox"
                checked={reels.showOutro}
                onChange={(e) =>
                  onChangeReels({ ...reels, showOutro: e.target.checked })
                }
                className="accent-emerald-500"
              />
              Outro Branding Desa (2.5 dtk)
            </label>
            <input
              type="text"
              value={reels.outroCta}
              onChange={(e) =>
                onChangeReels({ ...reels, outroCta: e.target.value })
              }
              placeholder="Ajakan penutup / CTA..."
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
            />
          </div>
        </div>

        {/* Slides List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Daftar Slide ({reels.slides.length})
            </span>
            <button
              type="button"
              onClick={addEmptySlide}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Slide
            </button>
          </div>

          <div className="max-h-[380px] space-y-2.5 overflow-y-auto pr-1">
            {reels.slides.map((slide, idx) => (
              <div
                key={slide.id}
                onClick={() => setPreviewIdx(idx)}
                className={`flex gap-3 rounded-xl border p-3 transition ${previewIdx === idx
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/70'
                  }`}
              >
                <label
                  title="Klik untuk mengganti foto/video slide ini"
                  onClick={(e) => e.stopPropagation()}
                  className="group relative flex h-20 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-slate-800 ring-1 ring-slate-700 hover:ring-emerald-500"
                >
                  {slide.mediaUrl ? (
                    slide.mediaType === 'video' ? (
                      <video
                        src={slide.mediaUrl}
                        className="h-full w-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={resolveCorsSafeImageUrl(slide.mediaUrl)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )
                  ) : (
                    <Film className="h-5 w-5 text-slate-500 group-hover:text-emerald-400" />
                  )}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => handleSlideMediaReplace(slide.id, e)}
                    className="hidden"
                  />
                </label>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase text-emerald-400">
                      Slide {idx + 1} • {slide.mediaType === 'video' ? 'Video' : 'Foto'}
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-slate-400">
                        Durasi:
                        <input
                          type="number"
                          min={2}
                          max={15}
                          value={slide.durationSec}
                          onChange={(e) =>
                            updateSlide(slide.id, {
                              durationSec: Math.max(2, Number(e.target.value) || 4),
                            })
                          }
                          className="ml-1 w-12 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-center text-xs text-white"
                        />
                        dtk
                      </label>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSlide(slide.id);
                        }}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={slide.headline}
                    onChange={(e) =>
                      updateSlide(slide.id, { headline: e.target.value })
                    }
                    placeholder="Teks judul slide..."
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white"
                  />
                  <input
                    type="text"
                    value={slide.subtitle}
                    onChange={(e) =>
                      updateSlide(slide.id, { subtitle: e.target.value })
                    }
                    placeholder="Subtitle / keterangan..."
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Preview & Export */}
      <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-5">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-bold text-white">
              Preview Reels (9:16)
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:border-slate-500"
            >
              {playing ? (
                <>
                  <Pause className="h-3.5 w-3.5" /> Jeda
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" /> Putar Preview
                </>
              )}
            </button>
            <button
              type="button"
              disabled={exporting || reels.slides.length === 0}
              onClick={handleExportMp4}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export MP4
            </button>
          </div>
        </div>

        {/* Simulated 9:16 Phone Frame */}
        <div className="flex flex-1 flex-col items-center justify-center">
          <div
            className="relative flex aspect-[9/16] w-full max-w-[300px] flex-col justify-between overflow-hidden rounded-3xl border-4 border-slate-800 bg-slate-950 shadow-2xl"
            style={{
              background: `linear-gradient(160deg, ${brandKit.colors.primary}, ${brandKit.colors.secondary})`,
            }}
          >
            {activeSlide?.mediaUrl &&
              (activeSlide.mediaType === 'video' ? (
                <video
                  src={activeSlide.mediaUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <img
                  src={resolveCorsSafeImageUrl(activeSlide.mediaUrl)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ))}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

            {/* Top Pemdes Floating Header */}
            <div className="relative z-10 m-3.5 flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {brandKit.regencyLogo && (
                  <img
                    src={brandKit.regencyLogo}
                    alt=""
                    className="h-7 w-7 object-contain drop-shadow"
                  />
                )}
                {brandKit.villageLogo && (
                  <img
                    src={brandKit.villageLogo}
                    alt=""
                    className="h-7 w-7 object-contain drop-shadow"
                  />
                )}
              </div>
              <div
                className="border-l-2 pl-2 text-left"
                style={{ borderColor: brandKit.colors.accent }}
              >
                <div className="text-[10px] font-extrabold uppercase leading-none text-white">
                  PEMERINTAH
                </div>
                <div className="mt-0.5 text-[9px] font-semibold uppercase leading-none text-slate-200">
                  {brandKit.villageName.replace(/^Pemerintah\s+/i, '')}
                </div>
              </div>
            </div>

            {/* Bottom Subtitle Overlay */}
            <div className="relative z-10 p-4">
              <div
                className="border-l-4 pl-3"
                style={{ borderColor: brandKit.colors.accent }}
              >
                <div className="text-base font-extrabold leading-tight text-white">
                  {activeSlide?.headline || 'Judul Slide Reels'}
                </div>
                <div className="mt-1 text-xs text-slate-200">
                  {activeSlide?.subtitle || 'Subtitle informasi desa'}
                </div>
              </div>
              <div className="mt-3 flex gap-1">
                {reels.slides.map((s, i) => (
                  <div
                    key={s.id}
                    className={`h-1 flex-1 rounded-full ${i === previewIdx ? 'bg-emerald-400' : 'bg-white/30'
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {exporting && (
            <div className="mt-4 w-full max-w-[300px] space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>{statusText}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {renderedBlob && !exporting && (
            <div className="mt-3 text-xs text-emerald-400">
              Video siap ({(renderedBlob.size / 1024 / 1024).toFixed(2)} MB •{' '}
              {renderedExt.toUpperCase()})
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
