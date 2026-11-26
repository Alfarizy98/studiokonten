import React, { useEffect, useState } from 'react';
import { X, Save, ShieldCheck } from 'lucide-react';
import { AppSettings, PLATFORM_PRESETS, PlatformId } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (next: AppSettings) => Promise<void>;
}

export const SettingsModal: React.FC<Props> = ({
  open,
  onClose,
  settings,
  onSave,
}) => {
  const [form, setForm] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(settings);
  }, [open, settings]);

  if (!open) return null;

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
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              DATA PERMANEN • AKUN & PENGATURAN
            </div>
            <h2 className="text-lg font-bold text-white">Pengaturan Aplikasi</h2>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Nama Operator
              </label>
              <input
                type="text"
                value={form.operatorName}
                onChange={(e) =>
                  setForm({ ...form, operatorName: e.target.value })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Jabatan</label>
              <input
                type="text"
                value={form.operatorRole}
                onChange={(e) =>
                  setForm({ ...form, operatorRole: e.target.value })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Provider AI Content Writer
            </label>
            <select
              value={form.aiProvider}
              onChange={(e) =>
                setForm({
                  ...form,
                  aiProvider: e.target.value as AppSettings['aiProvider'],
                })
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            >
              <option value="auto">Otomatis (Gunakan API Key jika ada, atau Generator Lokal)</option>
              <option value="gemini">Google Gemini (gemini-2.5-flash)</option>
              <option value="openai">OpenAI (gpt-4o-mini)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Gemini API Key (Opsional)
            </label>
            <input
              type="password"
              value={form.geminiApiKey}
              onChange={(e) =>
                setForm({ ...form, geminiApiKey: e.target.value })
              }
              placeholder="AIza..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              OpenAI API Key (Opsional)
            </label>
            <input
              type="password"
              value={form.openaiApiKey}
              onChange={(e) =>
                setForm({ ...form, openaiApiKey: e.target.value })
              }
              placeholder="sk-..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Platform Default
              </label>
              <select
                value={form.defaultPlatform}
                onChange={(e) =>
                  setForm({
                    ...form,
                    defaultPlatform: e.target.value as PlatformId,
                  })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              >
                {(Object.keys(PLATFORM_PRESETS) as PlatformId[]).map((pid) => (
                  <option key={pid} value={pid}>
                    {PLATFORM_PRESETS[pid].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Batas Waktu Sesi Sementara (Menit)
              </label>
              <input
                type="number"
                min={5}
                max={240}
                value={form.sessionTtlMinutes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sessionTtlMinutes: Math.max(5, Number(e.target.value) || 60),
                  })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
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
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
