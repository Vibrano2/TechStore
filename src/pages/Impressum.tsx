import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Mail, Phone, MapPin, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useSEO } from '../utils/useSEO';

export const Impressum: React.FC = () => {
  useSEO({
    title: 'Impressum | Gesetzliche Anbieterkennzeichnung',
    description: 'Gesetzliche Anbieterkennzeichnung der TechnikWelt GmbH gemäß § 5 DDG und § 18 Abs. 2 MStV.',
    canonical: '/impressum'
  });

  return (
    <div className="container-custom py-10 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-electric-500 transition-colors">
          <ArrowLeft size={14} /> Zurück zur Startseite
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 p-8 sm:p-10 shadow-xs space-y-8">
        <div className="border-b border-neutral-100 pb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-electric-600 bg-electric-50 px-2.5 py-1 rounded-md">
            Gesetzliche Anbieterkennzeichnung (§ 5 DDG)
          </span>
          <h1 className="text-3xl font-extrabold text-navy-900 mt-3 tracking-tight">Impressum</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG) und § 18 Abs. 2 MStV
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <Building2 size={18} className="text-electric-500" />
            Dienstanbieter
          </h2>
          <div className="text-sm text-neutral-700 leading-relaxed bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
            <p className="font-semibold text-navy-900 text-base">TechnikWelt GmbH</p>
            <p className="mt-1">Vertreten durch den Geschäftsführer: <strong>Dr. Markus Lindemann</strong></p>
            <p className="flex items-center gap-1.5 mt-2 text-neutral-600">
              <MapPin size={14} className="text-neutral-400" /> Maximilianstraße 35, 80539 München, Deutschland
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <Mail size={18} className="text-electric-500" />
            Kontakt
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-neutral-700">
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
              <span className="text-xs text-neutral-400 block font-medium uppercase">Telefon Support</span>
              <p className="font-semibold text-navy-900 mt-0.5 flex items-center gap-1.5">
                <Phone size={14} className="text-electric-500" /> +49 (0) 89 2154 7890
              </p>
              <span className="text-[11px] text-neutral-400 mt-1 block">Mo. - Fr. 09:00 - 18:00 Uhr</span>
            </div>
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
              <span className="text-xs text-neutral-400 block font-medium uppercase">E-Mail Kontakt</span>
              <p className="font-semibold text-navy-900 mt-0.5 flex items-center gap-1.5">
                <Mail size={14} className="text-electric-500" /> info@technikwelt.shop
              </p>
              <span className="text-[11px] text-neutral-400 mt-1 block">Antwort innerhalb von 24h</span>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <ShieldCheck size={18} className="text-electric-500" />
            Handelsregister & Umsatzsteuer-Identifikationsnummer
          </h2>
          <div className="text-sm text-neutral-700 leading-relaxed space-y-2 bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
            <p>
              <strong>Registergericht:</strong> Amtsgericht München, HRB 284910
            </p>
            <p>
              <strong>Umsatzsteuer-Identifikationsnummer (§ 27 a UStG):</strong> DE 362 891 042
            </p>
            <p>
              <strong>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:</strong> Dr. Markus Lindemann, Maximilianstraße 35, 80539 München
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy-900">Verbraucherstreitbeilegung (Art. 14 Abs. 1 ODR-VO)</h2>
          <div className="text-xs text-neutral-600 leading-relaxed space-y-2">
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit, die Sie unter folgendem Link finden:{' '}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-electric-600 hover:underline">
                https://ec.europa.eu/consumers/odr
              </a>.
            </p>
            <p>
              Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
