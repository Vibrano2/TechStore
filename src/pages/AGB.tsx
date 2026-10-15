import React from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, ArrowLeft, Shield, Truck, RefreshCw } from 'lucide-react';
import { useSEO } from '../utils/useSEO';

export const AGB: React.FC = () => {
  useSEO({
    title: 'Allgemeine Geschäftsbedingungen (AGB)',
    description: 'Allgemeine Geschäftsbedingungen der TechnikWelt GmbH für Bestellungen im Online-Shop technikwelt.shop.',
    canonical: '/agb'
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
            Vertragsbedingungen
          </span>
          <h1 className="text-3xl font-extrabold text-navy-900 mt-3 tracking-tight">Allgemeine Geschäftsbedingungen (AGB)</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Gültig für alle Bestellungen über technikwelt.shop • Stand: Oktober 2026
          </p>
        </div>

        <section className="space-y-2 text-sm text-neutral-700 leading-relaxed">
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <FileCheck size={18} className="text-electric-500" /> § 1 Geltungsbereich und Vertragspartner
          </h2>
          <p>
            (1) Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge über die Lieferung von Waren, die ein Verbraucher oder Unternehmer über unseren Online-Shop <strong>technikwelt.shop</strong> mit der:
          </p>
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 my-2 text-xs">
            <strong>TechnikWelt GmbH</strong>, Maximilianstraße 35, 80539 München<br />
            Registergericht: Amtsgericht München, HRB 284910<br />
            Geschäftsführer: Dr. Markus Lindemann • USt-IdNr.: DE 362 891 042
          </div>
          <p>schließt.</p>
        </section>

        <section className="space-y-2 text-sm text-neutral-700 leading-relaxed">
          <h2 className="text-lg font-bold text-navy-900">§ 2 Vertragsschluss</h2>
          <p>
            (1) Die Präsentation der Produkte im Online-Shop stellt kein rechtlich bindendes Angebot, sondern eine Aufforderung zur Bestellung dar.
          </p>
          <p>
            (2) Durch Anklicken des Buttons „Zahlungspflichtig bestellen“ geben Sie eine verbindliche Bestellung der im Warenkorb enthaltenen Waren ab. Die Bestätigung des Zugangs Ihrer Bestellung erfolgt per E-Mail unmittelbar nach dem Absenden der Bestellung.
          </p>
        </section>

        <section className="space-y-2 text-sm text-neutral-700 leading-relaxed">
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <Truck size={18} className="text-electric-500" /> § 3 Preise, Versandkosten und Zahlung
          </h2>
          <p>
            (1) Alle angegebenen Preise sind Endpreise in Euro (EUR) und enthalten die gesetzliche deutsche Mehrwertsteuer (19% MwSt.).
          </p>
          <p>
            (2) Der Versand innerhalb Deutschlands ist ab 49 € Bestellwert kostenfrei. Unter 49 € betragen die Standard-Versandkosten 4,90 € mit DHL Paket.
          </p>
          <p>
            (3) Als Zahlungsmethoden stehen Ihnen Kreditkarte (Visa, Mastercard), PayPal, Klarna (Rechnung / Sofortüberweisung) und Apple Pay zur Verfügung.
          </p>
        </section>

        <section className="space-y-2 text-sm text-neutral-700 leading-relaxed">
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <RefreshCw size={18} className="text-electric-500" /> § 4 Gesetzliches Widerrufsrecht (30 Tage)
          </h2>
          <p>
            Verbrauchern steht das gesetzliche Widerrufsrecht zu. TechnikWelt gewährt Verbrauchern freiwillig ein verlängertes Rückgaberecht von insgesamt <strong>30 Tagen</strong> ab Erhalt der Ware. Die Rücksendung über unser Retourenportal mit DHL ist für Sie kostenlos.
          </p>
        </section>

        <section className="space-y-2 text-sm text-neutral-700 leading-relaxed">
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <Shield size={18} className="text-electric-500" /> § 5 Gesetzliche Gewährleistung (§ 439 BGB)
          </h2>
          <p>
            (1) Es gelten die gesetzlichen Mängelhaftungsrechte nach §§ 437 ff. BGB. Die gesetzliche Verjährungsfrist für Mängelansprüche beträgt für Verbraucher <strong>24 Monate</strong> ab Übergabe der Ware.
          </p>
          <p>
            (2) Bei Reklamationen oder Defekten können Sie über Ihr Kundenkonto oder per E-Mail an service@technikwelt.shop eine kostenfreie Reparatur oder Ersatzlieferung anfordern.
          </p>
        </section>
      </div>
    </div>
  );
};
