import React, { useEffect, useState } from 'react';
import { X, Upload, Save, ShieldCheck } from 'lucide-react';
import { BrandKit, MasterTemplate } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  brandKit: BrandKit;
  templates: MasterTemplate[];
  onSave: (next: BrandKit) => Promise<void>;
}

export const BrandKitModal: React.FC<Props> = ({
  open,
  onClose,
  brandKit,
  templates,
  onSave,
}) => {
  const [form, setForm] = useState<BrandKit>(brandKit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(brandKit);
  }, [open, brandKit]);

  if (!open) return null;

  const handleLogoUpload = (
    field: 'villageLogo' | 'regencyLogo',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm({ ...form, [field]: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              DATA PERMANEN • IDENTITAS VISUAL DESA
            </div>
            <h2 className="text-lg font-bold text-white">Brand Kit Desa</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Nama Pemerintah Desa
              </label>
              <input
                type="text"
                value={form.villageName}
                onChange={(e) => setForm({ ...form, villageName: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Kecamatan</label>
              <input
                type="text"
                value={form.districtName}
                onChange={(e) => setForm({ ...form, districtName: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Kabupaten</label>
              <input
                type="text"
                value={form.regencyName}
                onChange={(e) => setForm({ ...form, regencyName: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Logos */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { key: 'regencyLogo' as const, label: 'Logo Kabupaten Mamuju Tengah' },
              { key: 'villageLogo' as const, label: 'Logo Kemendes / Desa' },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-900">
                  {form[item.key] ? (
                    <img
                      src={form[item.key]}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-500">Kosong</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-white">
                    {item.label}
                  </div>
                  <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[11px] text-emerald-400 hover:underline">
                    <Upload className="h-3 w-3" /> Unggah Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(item.key, e)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Colors & Font */}
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { key: 'primary' as const, label: 'Warna Utama' },
              { key: 'secondary' as const, label: 'Warna Sekunder' },
              { key: 'accent' as const, label: 'Warna Aksen' },
            ].map((c) => (
              <div key={c.key}>
                <label className="mb-1 block text-xs text-slate-400">
                  {c.label}
                </label>
                <input
                  type="color"
                  value={form.colors[c.key]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      colors: { ...form.colors, [c.key]: e.target.value },
                    })
                  }
                  className="h-9 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-xs text-slate-400">Font Standar</label>
              <select
                value={form.fontFamily}
                onChange={(e) => setForm({ ...form, fontFamily: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-white"
              >
                <option value="Open Sans">Open Sans (pajak.go.id)</option>
                <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                <option value="Poppins">Poppins</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Inter">Inter</option>
                <option value="Merriweather">Merriweather</option>
              </select>
            </div>
          </div>

          {/* Header, Footer & Watermark */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Website Desa (Footer)
              </label>
              <input
                type="text"
                value={form.websiteUrl || ''}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                placeholder="https://tobadak.desa.id"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Nama Akun Medsos (Footer)
              </label>
              <input
                type="text"
                value={form.socialHandle || ''}
                onChange={(e) => setForm({ ...form, socialHandle: e.target.value })}
                placeholder="Pemdes Tobadak"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Teks Header Standar
              </label>
              <input
                type="text"
                value={form.headerText}
                onChange={(e) => setForm({ ...form, headerText: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Teks Footer Cadangan
              </label>
              <input
                type="text"
                value={form.footerText}
                onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Teks Watermark
              </label>
              <input
                type="text"
                value={form.watermarkText}
                onChange={(e) =>
                  setForm({ ...form, watermarkText: e.target.value })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Posisi Watermark
              </label>
              <select
                value={form.watermarkPosition}
                onChange={(e) =>
                  setForm({
                    ...form,
                    watermarkPosition: e.target
                      .value as BrandKit['watermarkPosition'],
                  })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              >
                <option value="bottom-right">Kanan Bawah</option>
                <option value="bottom-left">Kiri Bawah</option>
                <option value="top-right">Kanan Atas</option>
                <option value="center">Tengah (Diagonal)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Template Standar
              </label>
              <select
                value={form.defaultTemplateId}
                onChange={(e) =>
                  setForm({ ...form, defaultTemplateId: e.target.value })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Menyimpan...' : 'Simpan Brand Kit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
