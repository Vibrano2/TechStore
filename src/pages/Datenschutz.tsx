import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, FileText, ArrowLeft, Mail } from 'lucide-react';
import { useSEO } from '../utils/useSEO';

export const Datenschutz: React.FC = () => {
  useSEO({
    title: 'Datenschutzerklärung | DSGVO',
    description: 'Informationen zur Verarbeitung personenbezogener Daten im Online-Shop der TechnikWelt GmbH gemäß Art. 13, 14 DSGVO.',
    canonical: '/datenschutz'
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
            Datenschutz & Privatsphäre (DSGVO)
          </span>
          <h1 className="text-3xl font-extrabold text-navy-900 mt-3 tracking-tight">Datenschutzerklärung</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Stand: Oktober 2026 • Gültig für technikwelt.shop
          </p>
        </div>

        {/* 1. Verantwortlicher */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <Shield size={18} className="text-electric-500" />
            1. Name und Kontaktdaten des Verantwortlichen
          </h2>
          <div className="text-sm text-neutral-700 leading-relaxed bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
            <p className="font-semibold text-navy-900">TechnikWelt GmbH</p>
            <p>Maximilianstraße 35, 80539 München, Deutschland</p>
            <p className="mt-1">Geschäftsführer: Dr. Markus Lindemann</p>
            <p>E-Mail: <a href="mailto:datenschutz@technikwelt.shop" className="text-electric-600 hover:underline">datenschutz@technikwelt.shop</a></p>
            <p>Telefon: +49 (0) 89 2154 7890</p>
          </div>
        </section>

        {/* 2. Erhebung und Speicherung */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <Lock size={18} className="text-electric-500" />
            2. Erhebung und Speicherung personenbezogener Daten sowie Art und Zweck der Verwendung
          </h2>
          <div className="text-sm text-neutral-700 leading-relaxed space-y-3">
            <p>
              Beim Aufrufen unserer Website <strong>technikwelt.shop</strong> werden durch den auf Ihrem Endgerät zum Einsatz kommenden Browser automatisch Informationen an den Server unserer Website gesendet. Diese Informationen werden temporär in einem sog. Logfile gespeichert (u. a. IP-Adresse, Datum und Uhrzeit des Zugriffs, Name und URL der abgerufenen Datei, Browser und Betriebssystem).
            </p>
            <p>
              Die genannten Daten werden durch uns verarbeitet zur Gewährleistung eines reibungslosen Verbindungsaufbaus der Website, Gewährleistung einer komfortablen Nutzung sowie Auswertung der Systemsicherheit und -stabilität (Rechtsgrundlage: Art. 6 Abs. 1 S. 1 lit. f DSGVO).
            </p>
          </div>
        </section>

        {/* 3. Bestellungen & Kundenkonto */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <FileText size={18} className="text-electric-500" />
            3. Datenverarbeitung bei Bestellungen und Registrierung
          </h2>
          <div className="text-sm text-neutral-700 leading-relaxed space-y-2">
            <p>
              Wenn Sie in unserem Online-Shop Waren bestellen oder ein Kundenkonto anlegen, erheben wir Ihren Namen, Ihre Liefer- und Rechnungsanschrift, E-Mail-Adresse sowie Zahlungsdaten. Die Verarbeitung erfolgt zur Erfüllung des Kaufvertrags gemäß <strong>Art. 6 Abs. 1 S. 1 lit. b DSGVO</strong>.
            </p>
            <p>
              Zur Zustellung Ihrer Pakete übermitteln wir Ihre Anschrift an unseren Versandpartner <strong>DHL Paket GmbH</strong> (Sträßchensweg 10, 53113 Bonn).
            </p>
          </div>
        </section>

        {/* 4. Cookies & Consent */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <Eye size={18} className="text-electric-500" />
            4. Cookies & Lokale Speicherung
          </h2>
          <div className="text-sm text-neutral-700 leading-relaxed space-y-2">
            <p>
              Wir setzen technisch notwendige Speichermechanismen (z. B. für den Warenkorb, Merkzettel und Anmeldestatus) ein. Rechtsgrundlage ist § 25 Abs. 2 TDDDG i.V.m. Art. 6 Abs. 1 lit. f DSGVO. Zusätzliche optionale Dienste werden erst nach Ihrer ausdrücklichen Einwilligung im Cookie-Banner aktiviert (Art. 6 Abs. 1 lit. a DSGVO).
            </p>
          </div>
        </section>

        {/* 5. Betroffenenrechte */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <Mail size={18} className="text-electric-500" />
            5. Ihre Rechte als betroffene Person
          </h2>
          <div className="text-sm text-neutral-700 leading-relaxed space-y-2">
            <p>Sie haben nach der DSGVO das Recht auf:</p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600">
              <li>Auskunft über Ihre von uns verarbeiteten personenbezogenen Daten (Art. 15 DSGVO)</li>
              <li>Berichtigung unrichtiger oder Vervollständigung Ihrer Daten (Art. 16 DSGVO)</li>
              <li>Löschung Ihrer bei uns gespeicherten Daten (Art. 17 DSGVO)</li>
              <li>Einschränkung der Datenverarbeitung (Art. 18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
              <li>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
            </ul>
            <p className="pt-2">
              Zur Ausübung Ihrer Rechte genügt eine E-Mail an: <a href="mailto:datenschutz@technikwelt.shop" className="text-electric-600 font-semibold hover:underline">datenschutz@technikwelt.shop</a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
