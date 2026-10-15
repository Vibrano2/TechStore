import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, ArrowRight, HelpCircle } from 'lucide-react';
import { useSEO } from '../utils/useSEO';

export const NotFound: React.FC = () => {
  useSEO({
    title: '404 - Seite nicht gefunden',
    description: 'Die von Ihnen aufgerufene Seite konnte leider nicht gefunden werden. Entdecken Sie unsere Kategorien oder kehren Sie zur Startseite zurück.',
  });

  return (
    <div className="container-custom py-16 sm:py-24 text-center max-w-2xl mx-auto">
      <div className="w-16 h-16 bg-blue-50 text-electric-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xs border border-blue-100">
        <HelpCircle size={36} />
      </div>

      <span className="text-xs font-bold uppercase tracking-wider text-status-error bg-red-50 px-3 py-1 rounded-md">
        Fehler 404
      </span>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-900 mt-4 mb-3 tracking-tight">
        Seite nicht gefunden
      </h1>
      <p className="text-sm sm:text-base text-neutral-500 mb-8 max-w-lg mx-auto leading-relaxed">
        Die gesuchte Seite existiert leider nicht oder wurde verschoben. Nutzen Sie unsere Suche oder stöbern Sie in unseren beliebtesten Produktkategorien.
      </p>

      <div className="flex flex-wrap justify-center gap-3 mb-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-navy-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-navy-900/90 transition-colors shadow-sm text-sm"
        >
          <Home size={16} /> Zur Startseite
        </Link>
        <Link
          to="/category/all"
          className="inline-flex items-center gap-2 bg-white text-navy-900 border border-neutral-300 font-semibold px-6 py-3 rounded-xl hover:bg-neutral-50 transition-colors shadow-sm text-sm"
        >
          <Search size={16} /> Alle Produkte durchsuchen
        </Link>
      </div>

      <div className="border-t border-neutral-200 pt-8 text-left">
        <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4 text-center">
          Beliebte Kategorien
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Link
            to="/category/smartphones"
            className="p-3 bg-white rounded-xl border border-neutral-200 hover:border-electric-500 text-xs font-semibold text-navy-900 flex items-center justify-between group transition-colors"
          >
            Smartphones <ArrowRight size={12} className="text-neutral-400 group-hover:text-electric-500" />
          </Link>
          <Link
            to="/category/computer"
            className="p-3 bg-white rounded-xl border border-neutral-200 hover:border-electric-500 text-xs font-semibold text-navy-900 flex items-center justify-between group transition-colors"
          >
            Laptops & PCs <ArrowRight size={12} className="text-neutral-400 group-hover:text-electric-500" />
          </Link>
          <Link
            to="/category/e-mobility"
            className="p-3 bg-white rounded-xl border border-neutral-200 hover:border-electric-500 text-xs font-semibold text-navy-900 flex items-center justify-between group transition-colors"
          >
            E-Mobilität <ArrowRight size={12} className="text-neutral-400 group-hover:text-electric-500" />
          </Link>
          <Link
            to="/angebote"
            className="p-3 bg-white rounded-xl border border-neutral-200 hover:border-electric-500 text-xs font-semibold text-status-error flex items-center justify-between group transition-colors"
          >
            Sonderangebote <ArrowRight size={12} className="text-status-error" />
          </Link>
        </div>
      </div>
    </div>
  );
};
