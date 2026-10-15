import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Wrench, RefreshCw } from 'lucide-react';
import { useSEO } from '../utils/useSEO';

export const Warranty: React.FC = () => {
  useSEO({
    title: 'Garantie & Gesetzliche Gewährleistung (§ 439 BGB)',
    description: '24 Monate gesetzliche Gewährleistung auf alle Produkte bei TechnikWelt sowie herstellerseitige Garantieleistungen und Reparaturabwicklung.',
    canonical: '/warranty'
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
            Verbraucherschutz & Qualität
          </span>
          <h1 className="text-3xl font-extrabold text-navy-900 mt-3 tracking-tight">Garantie & Gewährleistung</h1>
          <p className="text-sm text-neutral-500 mt-1">
            24 Monate gesetzliche Gewährleistung nach § 439 BGB auf all unsere Neuwaren
          </p>
        </div>

        {/* Highlight Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
            <ShieldCheck size={22} className="text-electric-500 mb-2" />
            <h2 className="font-bold text-sm text-navy-900">24 Monate Schutz</h2>
            <p className="text-xs text-neutral-500 mt-1">Voller gesetzlicher Mängelschutz für alle Verbraucher in Deutschland.</p>
          </div>
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
            <Wrench size={22} className="text-electric-500 mb-2" />
            <h2 className="font-bold text-sm text-navy-900">Kostenfreie Reparatur</h2>
            <p className="text-xs text-neutral-500 mt-1">Fachgerechte Reparatur durch autorisierte Servicepartner des Herstellers.</p>
          </div>
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
            <RefreshCw size={22} className="text-electric-500 mb-2" />
            <h2 className="font-bold text-sm text-navy-900">Ersatzlieferung</h2>
            <p className="text-xs text-neutral-500 mt-1">Sollte eine Reparatur fehlschlagen, erhalten Sie ein Neugerät oder Kaufpreiserstattung.</p>
          </div>
        </div>

        <section className="space-y-3 text-sm text-neutral-700 leading-relaxed">
          <h2 className="text-lg font-bold text-navy-900">Gesetzliche Gewährleistung nach § 439 BGB</h2>
          <p>
            Als Fachhändler in Deutschland gewährleisten wir, dass alle gelieferten Waren zum Zeitpunkt der Übergabe frei von Sach- und Rechtsmängeln sind.
          </p>
          <p>
            Im Gewährleistungsfall haben Sie gemäß <strong>§ 439 BGB</strong> die Wahl, ob die Nacherfüllung durch Beseitigung des Mangels (Nachbesserung/Reparatur) oder durch Lieferung einer mangelfreien Sache (Ersatzlieferung) erfolgen soll. Die erforderlichen Aufwendungen, insbesondere Transport-, Wege-, Arbeits- und Materialkosten, tragen wir.
          </p>
        </section>

        <section className="space-y-3 text-sm text-neutral-700 leading-relaxed">
          <h2 className="text-lg font-bold text-navy-900">Herstellergarantie</h2>
          <p>
            Zusätzlich zur gesetzlichen Gewährleistung gewähren viele unserer Markenhersteller (z. B. Apple, Sony, Samsung, Acer) eigenständige Herstellergarantien von meist 12 bis 36 Monaten. Diese Garantien schränken Ihre gesetzlichen Gewährleistungsrechte in keiner Weise ein.
          </p>
        </section>

        <section className="space-y-3 text-sm text-neutral-700 leading-relaxed bg-neutral-50 p-5 rounded-xl border border-neutral-200">
          <h2 className="text-base font-bold text-navy-900">So melden Sie einen Garantiefall</h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-xs text-neutral-600">
            <li>Öffnen Sie Ihr <strong>Kundenkonto</strong> und wählen Sie die betroffene Bestellung aus.</li>
            <li>Klicken Sie auf <strong>„Garantie / Reparatur anfordern“</strong> oder schreiben Sie an service@technikwelt.shop.</li>
            <li>Sie erhalten umgehend ein kostenfreies DHL-Versandlabel für die Einsendung zum autorisierten Prüfzentrum.</li>
          </ol>
        </section>
      </div>
    </div>
  );
};
