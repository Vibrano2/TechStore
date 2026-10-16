import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { adminLogin, getAdminToken } from '../../services/adminApi';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // If already authenticated as admin, go straight to dashboard
    if (getAdminToken()) {
      navigate('/intern/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Bitte geben Sie Benutzername und Passwort ein.');
      return;
    }

    setIsLoading(true);
    try {
      await adminLogin({
        username: username.trim(),
        password: password.trim(),
        remember,
      });
      navigate('/intern/dashboard', { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Background Accent Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl shadow-black/40 mb-4 text-blue-500">
            <Shield size={28} className="animate-pulse" />
          </div>
          <div className="inline-block px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-mono tracking-wider text-slate-400 uppercase mb-2">
            TechnikWelt • Internes System
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Admin & Kontrollzentrum
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto">
            Geschützter Verwaltungsbereich für Bestellungen, Finanzen und Warenbestand.
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl shadow-black/60 p-6 sm:p-8 backdrop-blur-md">
          {errorMessage && (
            <div className="mb-6 p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Administrator / E-Mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin oder info@technikwelt.shop"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Passwort
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span>Angemeldet bleiben</span>
              </label>

              <span className="text-[11px] text-slate-500 font-mono">
                SSL 256-Bit
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Wird autorisiert...</span>
                </>
              ) : (
                <>
                  <span>Im Kontrollzentrum anmelden</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Streng vertraulich. Sämtliche Zugriffe und Aktionen werden revisionssicher (GoBD-konform) protokolliert.
            </p>
          </div>
        </div>

        {/* Back to Shop Link */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline-offset-4 hover:underline"
          >
            ← Zurück zum öffentlichen Storefront
          </a>
        </div>
      </div>
    </div>
  );
};
export default AdminLogin;
