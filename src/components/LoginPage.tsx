import React, { useState } from 'react';
import {
  Sparkles,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { AuthUser, setAuthToken } from '../utils/auth';

interface Props {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginPage: React.FC<Props> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register' && password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { identifier, password }
          : { name, username, email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Autentikasi gagal.');
      }
      setAuthToken(data.token);
      onLoginSuccess(data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#093b6e] bg-gradient-to-br from-[#052240] via-[#093b6e] to-[#1b2a78] px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl">
        {/* Top Banner */}
        <div className="border-b-4 border-[#ffc91b] bg-[#093b6e] px-6 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ffc91b] text-[#093b6e] shadow-md">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold uppercase tracking-wide">
                Studio Konten Desa Tobadak
              </h1>
              <p className="text-xs text-[#dadff1]">
                Portal Operator & Humas Pemerintah Desa
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 p-1.5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
              mode === 'login'
                ? 'bg-[#093b6e] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#093b6e]'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            Masuk Studio
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
              mode === 'register'
                ? 'bg-[#093b6e] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#093b6e]'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Daftar Akun
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {mode === 'login' ? (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Username atau Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@tobadak.desa.id atau admin"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-[#093b6e] focus:outline-none focus:ring-2 focus:ring-[#093b6e]/20"
                />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Operator Media Desa"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-[#093b6e] focus:outline-none focus:ring-2 focus:ring-[#093b6e]/20"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="operator1"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#093b6e] focus:outline-none focus:ring-2 focus:ring-[#093b6e]/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@tobadak.desa.id"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#093b6e] focus:outline-none focus:ring-2 focus:ring-[#093b6e]/20"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 focus:border-[#093b6e] focus:outline-none focus:ring-2 focus:ring-[#093b6e]/20"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Konfirmasi Password
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#093b6e] focus:outline-none focus:ring-2 focus:ring-[#093b6e]/20"
              />
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#093b6e] py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#1b2a78] disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === 'login' ? (
              <LogIn className="h-4 w-4 text-[#ffc91b]" />
            ) : (
              <UserPlus className="h-4 w-4 text-[#ffc91b]" />
            )}
            {loading
              ? 'Memproses...'
              : mode === 'login'
                ? 'Masuk ke Studio'
                : 'Buat Akun & Masuk'}
          </button>

          {mode === 'login' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-semibold text-[#093b6e]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Akun Operator Default
              </div>
              <div className="mt-1 space-y-0.5">
                <div>
                  Email / Username: <code className="font-semibold">admin@tobadak.desa.id</code>{' '}
                  atau <code className="font-semibold">admin</code>
                </div>
                <div>
                  Password: <code className="font-semibold">tobadak2026</code>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
