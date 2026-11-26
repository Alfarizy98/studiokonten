import React, { useEffect, useRef } from 'react';
import {
  Download,
  Upload,
  BookmarkPlus,
  LayoutTemplate,
  Type,
  Palette,
  Eye,
} from 'lucide-react';
import {
  BrandKit,
  MasterTemplate,
  PLATFORM_PRESETS,
  PlatformId,
  PosterState,
} from '../types';
import { renderPosterToCanvas } from '../utils/posterRenderer';
import { canvasToBlob, downloadBlob } from '../utils/downloadPackage';

interface Props {
  poster: PosterState;
  onChangePoster: (next: PosterState) => void;
  brandKit: BrandKit;
  templates: MasterTemplate[];
  onSaveMasterTemplate: (tpl: MasterTemplate) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const FONT_OPTIONS = [
  'Open Sans',
  'Plus Jakarta Sans',
  'Poppins',
  'Montserrat',
  'Inter',
  'Merriweather',
];

export const DesignStudio: React.FC<Props> = ({
  poster,
  onChangePoster,
  brandKit,
  templates,
  onSaveMasterTemplate,
  canvasRef,
}) => {
  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = canvasRef || localCanvasRef;

  const currentTemplate =
    templates.find((t) => t.id === poster.templateId) || templates[0];

  useEffect(() => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    renderPosterToCanvas(canvas, poster, brandKit, currentTemplate);
  }, [poster, brandKit, currentTemplate, activeCanvasRef]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChangePoster({ ...poster, photoUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTemplateSelect = (tpl: MasterTemplate) => {
    onChangePoster({
      ...poster,
      templateId: tpl.id,
      badgeText: tpl.badgeText || poster.badgeText,
      showHeader: tpl.showHeader,
      showFooter: tpl.showFooter,
      showWatermark: tpl.showWatermark,
    });
  };

  const handleQuickDownload = async (format: 'png' | 'jpg') => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas, format);
    const slug = (poster.title || 'poster-desa-tobadak')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 40);
    downloadBlob(blob, `${slug}-${poster.platform}.${format}`);
  };

  const handleSaveAsMaster = () => {
    const name = window.prompt('Nama template master baru:', `${currentTemplate?.name || 'Template'} Custom`);
    if (!name) return;
    onSaveMasterTemplate({
      id: `tpl-${Date.now()}`,
      name: name.trim(),
      category: 'Custom',
      description: 'Template master tersimpan permanen dari Design Studio.',
      layout: currentTemplate?.layout || 'photo-top',
      showHeader: poster.showHeader,
      showFooter: poster.showFooter,
      showWatermark: poster.showWatermark,
      overlayStyle: currentTemplate?.overlayStyle || 'gradient-bottom',
      badgeText: poster.badgeText || 'INFO DESA',
    });
  };

  const preset = PLATFORM_PRESETS[poster.platform];

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left Controls */}
      <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Design Generator
            </span>
            <h2 className="text-lg font-bold text-white">Editor Poster</h2>
          </div>
          <button
            type="button"
            onClick={handleSaveAsMaster}
            title="Simpan konfigurasi template ke penyimpanan permanen"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500"
          >
            <BookmarkPlus className="h-3.5 w-3.5 text-emerald-400" />
            Simpan Master
          </button>
        </div>

        {/* Platform / Resolution */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-300">
            Resolusi Platform Tujuan
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PLATFORM_PRESETS) as PlatformId[]).map((pid) => {
              const p = PLATFORM_PRESETS[pid];
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => onChangePoster({ ...poster, platform: pid })}
                  className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                    poster.platform === pid
                      ? 'border-emerald-500 bg-emerald-500/15 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold">{p.label}</div>
                  <div className="text-[11px] opacity-75">{p.aspectLabel}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Master Template Selector */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <LayoutTemplate className="h-3.5 w-3.5 text-emerald-400" />
            Template Desain Master
          </label>
          <div className="grid grid-cols-2 gap-2">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleTemplateSelect(tpl)}
                className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                  poster.templateId === tpl.id
                    ? 'border-emerald-500 bg-emerald-500/15 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold">{tpl.name}</div>
                <div className="text-[11px] opacity-75">{tpl.category}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Text & Photo */}
        <div className="space-y-3 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Type className="h-3.5 w-3.5 text-emerald-400" />
            Teks & Foto
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block text-[11px] text-slate-400">
                Badge Kategori
              </label>
              <input
                type="text"
                value={poster.badgeText}
                onChange={(e) =>
                  onChangePoster({ ...poster, badgeText: e.target.value })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-400">
                Label Tanggal
              </label>
              <input
                type="text"
                value={poster.dateLabel}
                onChange={(e) =>
                  onChangePoster({ ...poster, dateLabel: e.target.value })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-slate-400">
              Judul Poster
            </label>
            <textarea
              rows={2}
              value={poster.title}
              onChange={(e) =>
                onChangePoster({ ...poster, title: e.target.value })
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-slate-400">
              Subjudul / Ringkasan
            </label>
            <textarea
              rows={2}
              value={poster.subtitle}
              onChange={(e) =>
                onChangePoster({ ...poster, subtitle: e.target.value })
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950 px-3 py-2.5 text-xs font-medium text-slate-200 hover:border-emerald-500">
            <Upload className="h-4 w-4 text-emerald-400" />
            Ganti Foto Poster (Sementara)
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Font, Colors & Elements */}
        <div className="space-y-3 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Palette className="h-3.5 w-3.5 text-emerald-400" />
            Font, Warna & Elemen
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="mb-1 block text-[11px] text-slate-400">
                Warna Utama
              </label>
              <input
                type="color"
                value={poster.primaryColor}
                onChange={(e) =>
                  onChangePoster({ ...poster, primaryColor: e.target.value })
                }
                className="h-9 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
              />
            </div>
            <div className="col-span-1">
              <label className="mb-1 block text-[11px] text-slate-400">
                Warna Aksen
              </label>
              <input
                type="color"
                value={poster.accentColor}
                onChange={(e) =>
                  onChangePoster({ ...poster, accentColor: e.target.value })
                }
                className="h-9 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
              />
            </div>
            <div className="col-span-1">
              <label className="mb-1 block text-[11px] text-slate-400">Font</label>
              <select
                value={poster.fontFamily}
                onChange={(e) =>
                  onChangePoster({ ...poster, fontFamily: e.target.value })
                }
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-white"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-[11px] text-slate-400">
              <span>Gelap Overlay Foto</span>
              <span>{Math.round(poster.overlayOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={0.95}
              step={0.05}
              value={poster.overlayOpacity}
              onChange={(e) =>
                onChangePoster({
                  ...poster,
                  overlayOpacity: parseFloat(e.target.value),
                })
              }
              className="w-full accent-emerald-500"
            />
          </div>

          <div className="flex flex-wrap gap-4 pt-1 text-xs text-slate-300">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={poster.showHeader}
                onChange={(e) =>
                  onChangePoster({ ...poster, showHeader: e.target.checked })
                }
                className="accent-emerald-500"
              />
              Header Logo
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={poster.showFooter}
                onChange={(e) =>
                  onChangePoster({ ...poster, showFooter: e.target.checked })
                }
                className="accent-emerald-500"
              />
              Footer Desa
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={poster.showWatermark}
                onChange={(e) =>
                  onChangePoster({ ...poster, showWatermark: e.target.checked })
                }
                className="accent-emerald-500"
              />
              Watermark
            </label>
          </div>
        </div>
      </div>

      {/* Right Preview */}
      <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Redaksi Pemdes Tobadak • Live Preview
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <Eye className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-bold text-white">
                {preset.label} ({preset.aspectLabel})
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleQuickDownload('png')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              <Download className="h-3.5 w-3.5" />
              Unduh PNG
            </button>
            <button
              type="button"
              onClick={() => handleQuickDownload('jpg')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"
            >
              <Download className="h-3.5 w-3.5" />
              Unduh JPG
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-950 to-slate-900/90 p-5">
          <canvas
            ref={activeCanvasRef}
            className="max-h-[640px] max-w-full rounded-xl shadow-[0_24px_60px_rgba(0,0,0,0.65)] ring-1 ring-white/10"
            style={{ aspectRatio: `${preset.width} / ${preset.height}` }}
          />
        </div>
      </div>
    </div>
  );
};
