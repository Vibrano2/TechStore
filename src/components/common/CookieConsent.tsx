import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'technikwelt_cookie_consent_choice';

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // Show consent banner after a short delay for smooth page load
      const timer = setTimeout(() => setIsVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ essential: true, analytics: true, timestamp: Date.now() }));
    setIsVisible(false);
  };

  const handleAcceptEssential = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ essential: true, analytics: false, timestamp: Date.now() }));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      role="dialog" 
      aria-label="Cookie-Einstellungen"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-2xl animate-fadeIn"
    >
      <div className="container-custom max-w-5xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-electric-50 text-electric-600 flex items-center justify-center shrink-0 mt-0.5">
            <Cookie size={22} />
          </div>
          <div className="text-xs text-neutral-600 leading-relaxed max-w-2xl">
            <p className="font-bold text-navy-900 text-sm mb-1 flex items-center gap-1.5">
              <span>Privatsphäre & Cookie-Einstellungen</span>
              <span className="text-[10px] font-semibold text-status-success bg-green-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <ShieldCheck size={11} /> DSGVO-konform
              </span>
            </p>
            <p>
              Wir nutzen technisch notwendige Cookies, um grundlegende Funktionen unseres Online-Shops (wie den Warenkorb und Ihre Merkliste) zu gewährleisten. Sie können entscheiden, ob Sie der Nutzung zustimmen oder nur technisch notwendige Cookies zulassen möchten. Weitere Details finden Sie in unserer{' '}
              <Link to="/datenschutz" className="text-electric-600 font-semibold underline hover:text-electric-700">
                Datenschutzerklärung
              </Link>{' '}
              und im{' '}
              <Link to="/impressum" className="text-electric-600 font-semibold underline hover:text-electric-700">
                Impressum
              </Link>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
          <button
            onClick={handleAcceptEssential}
            className="flex-1 md:flex-none px-4 py-2.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors whitespace-nowrap"
          >
            Nur Notwendige
          </button>
          <button
            onClick={handleAcceptAll}
            className="flex-1 md:flex-none px-5 py-2.5 text-xs font-semibold text-white bg-navy-900 hover:bg-navy-900/90 rounded-xl transition-colors shadow-sm whitespace-nowrap"
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
};
