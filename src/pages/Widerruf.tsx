import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, ArrowLeft, FileText, CheckCircle2, Send, ShieldCheck } from 'lucide-react';
import { useSEO } from '../utils/useSEO';

export const Widerruf: React.FC = () => {
  useSEO({
    title: 'Widerrufsbelehrung & Elektronischer Widerruf | TechnikWelt',
    description: 'Gesetzliche Widerrufsbelehrung (14 Tage gem. § 355 BGB), elektronische Widerrufsfunktion und freiwilliges 30-Tage-Rückgaberecht bei TechnikWelt.',
    canonical: '/widerruf'
  });

  // Electronic withdrawal function state (§ 312k BGB)
  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [itemsToRevoke, setItemsToRevoke] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleElectronicRevocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber || !customerEmail || !customerName) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="container-custom py-10 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-electric-500 transition-colors">
          <ArrowLeft size={14} /> Zurück zur Startseite
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 p-8 sm:p-10 shadow-xs space-y-10">
        <div className="border-b border-neutral-100 pb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-electric-600 bg-electric-50 px-2.5 py-1 rounded-md">
            Verbraucherschutz & Widerrufsrecht (§ 355 BGB & § 312k BGB)
          </span>
          <h1 className="text-3xl font-extrabold text-navy-900 mt-3 tracking-tight">Widerrufsbelehrung</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Informationen zum gesetzlichen 14-tägigen Widerrufsrecht, elektronischen Widerruf und unserem freiwilligen 30-Tage-Rückgaberecht
          </p>
        </div>

        {/* SECTION 1: Statutory 14-Day Right of Withdrawal */}
        <section className="space-y-4 text-sm text-neutral-700 leading-relaxed">
          <div className="border-b border-neutral-200 pb-2">
            <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
              <RotateCcw size={20} className="text-electric-500" />
              1. Gesetzliche Widerrufsbelehrung (14 Tage)
            </h2>
            <span className="text-xs text-neutral-500 font-medium">
              Gesetzliche Pflichtinformation gemäß Anlage 1 zu Art. 246a § 1 Abs. 2 Satz 2 EGBGB
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-navy-900 text-base">Widerrufsrecht</h3>
            <p>
              Sie haben das Recht, binnen <strong>vierzehn Tagen</strong> ohne Angabe von Gründen diesen Vertrag zu widerrufen.
            </p>
            <p>
              Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter, der nicht der Beförderer ist, die letzte Ware in Besitz genommen haben bzw. hat.
            </p>
            <p>
              Um Ihr Widerrufsrecht auszuüben, müssen Sie uns:
            </p>
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-xs font-medium text-navy-900 space-y-1">
              <p className="font-bold text-sm">TechnikWelt GmbH</p>
              <p>Maximilianstraße 35, 80539 München, Deutschland</p>
              <p>Telefon: +49 (0) 89 2154 7890 (Mo. - Fr. 09:00 - 18:00 Uhr)</p>
              <p>E-Mail: <a href="mailto:widerruf@technikwelt.shop" className="text-electric-600 hover:underline">widerruf@technikwelt.shop</a></p>
            </div>
            <p>
              mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief, eine E-Mail oder über die nachfolgende elektronische Widerrufsfunktion) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
            </p>
            <p>
              Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-navy-900 text-base">Folgen des Widerrufs</h3>
            <p>
              Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist.
            </p>
            <p>
              Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.
            </p>
            <p>
              Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis Sie den Nachweis erbracht haben, dass Sie die Waren zurückgesandt haben, je nachdem, welches der frühere Zeitpunkt ist.
            </p>
            <p>
              Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem Sie uns über den Widerruf dieses Vertrags unterrichten, an unser Retourenzentrum zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf der Frist von vierzehn Tagen absenden.
            </p>
            <p className="bg-green-50 text-green-900 p-3 rounded-xl border border-green-200 text-xs">
              <strong>Kostenlose Rücksendung:</strong> Wir tragen die unmittelbaren Kosten der Rücksendung der Waren, wenn Sie das von uns kostenlos bereitgestellte DHL-Retourenlabel verwenden.
            </p>
          </div>
        </section>

        {/* SECTION 2: Electronic Withdrawal Function */}
        <section id="online-widerruf" className="bg-neutral-50/80 rounded-2xl border-2 border-electric-500/40 p-6 sm:p-8 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-electric-600 bg-electric-100/60 px-2.5 py-0.5 rounded">
                Elektronische Widerrufsfunktion (§ 312k BGB)
              </span>
              <h2 className="text-xl font-bold text-navy-900 mt-2">
                Vertrag hier online widerrufen
              </h2>
              <p className="text-xs text-neutral-600 mt-1">
                Nutzen Sie diese Schaltfläche, um Ihren Widerruf schnell, verbindlich und ohne gesondertes E-Mail-Programm direkt digital einzureichen. Sie erhalten unverzüglich eine Eingangsbestätigung.
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-electric-100 text-electric-600 flex items-center justify-center shrink-0">
              <Send size={20} />
            </div>
          </div>

          {submitted ? (
            <div className="bg-white p-6 rounded-xl border border-green-200 text-center space-y-3">
              <CheckCircle2 size={40} className="text-status-success mx-auto" />
              <h3 className="text-base font-bold text-navy-900">Widerruf erfolgreich übermittelt</h3>
              <p className="text-xs text-neutral-600 max-w-md mx-auto">
                Ihr Widerruf zur Bestellnummer <strong>{orderNumber}</strong> ist bei uns eingegangen. Eine offizielle Eingangsbestätigung wurde an <strong>{customerEmail}</strong> versandt. Ihr kostenfreies DHL-Retourenlabel steht in Ihrem Kundenkonto zur Verfügung.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                <Link to="/account/returns" className="btn-primary text-xs py-2 px-4">
                  Zu meinen Retouren
                </Link>
                <button
                  type="button"
                  onClick={() => { setSubmitted(false); setOrderNumber(''); }}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Weiteren Widerruf erfassen
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleElectronicRevocation} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="revocation-order" className="block text-xs font-semibold text-navy-900 mb-1">
                    Bestellnummer *
                  </label>
                  <input
                    id="revocation-order"
                    type="text"
                    required
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="z. B. TS-20261014-A1B2 oder #12345"
                    className="w-full bg-white border border-neutral-300 rounded-lg p-2.5 text-xs text-navy-900 focus:border-electric-500 focus:ring-1 focus:ring-electric-500 outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="revocation-name" className="block text-xs font-semibold text-navy-900 mb-1">
                    Vor- und Nachname *
                  </label>
                  <input
                    id="revocation-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Max Mustermann"
                    className="w-full bg-white border border-neutral-300 rounded-lg p-2.5 text-xs text-navy-900 focus:border-electric-500 focus:ring-1 focus:ring-electric-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="revocation-email" className="block text-xs font-semibold text-navy-900 mb-1">
                  E-Mail-Adresse der Bestellung *
                </label>
                <input
                  id="revocation-email"
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2.5 text-xs text-navy-900 focus:border-electric-500 focus:ring-1 focus:ring-electric-500 outline-none"
                />
              </div>

              <div>
                <label htmlFor="revocation-items" className="block text-xs font-semibold text-navy-900 mb-1">
                  Betroffene Artikel / Anmerkung (optional)
                </label>
                <textarea
                  id="revocation-items"
                  rows={2}
                  value={itemsToRevoke}
                  onChange={(e) => setItemsToRevoke(e.target.value)}
                  placeholder="Ganze Bestellung oder spezifische Artikel..."
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2.5 text-xs text-navy-900 focus:border-electric-500 focus:ring-1 focus:ring-electric-500 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-neutral-500">
                  * Pflichtfelder für die gesetzliche Zuordnung
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs py-2.5 px-5 flex items-center gap-1.5 shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  <Send size={14} />
                  {isSubmitting ? 'Wird übermittelt...' : 'Widerruf jetzt absenden'}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* SECTION 3: Voluntary 30-Day Return Guarantee */}
        <section className="bg-blue-50/70 border border-blue-200 p-6 rounded-2xl space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck size={22} className="text-electric-600 shrink-0 mt-0.5" />
            <div className="space-y-2 text-xs text-neutral-700 leading-relaxed">
              <h2 className="text-base font-bold text-navy-900">
                2. Freiwilliges 30-Tage-Rückgaberecht von TechnikWelt
              </h2>
              <p>
                Zusätzlich zum gesetzlichen 14-tägigen Widerrufsrecht gewährt die <strong>TechnikWelt GmbH</strong> allen Verbrauchern ein freiwilliges Rückgaberecht von insgesamt <strong>30 Tagen</strong> ab Warenerhalt.
              </p>
              <p>
                Mit diesem freiwilligen Rückgaberecht können Sie sich auch nach Ablauf der gesetzlichen 14-tägigen Widerrufsfrist vom Vertrag lösen, indem Sie die Ware innerhalb von 30 Tagen nach Erhalt an uns zurücksenden. Voraussetzung für die Ausübung des freiwilligen Rückgaberechts ist, dass Sie die Ware lediglich wie in einem Ladengeschäft ausprobiert haben und die Ware vollständig, in ihrem ursprünglichen Zustand und unbeschädigt in der Originalverpackung an uns zurücksenden.
              </p>
              <p className="font-semibold text-navy-900">
                Wichtiger Hinweis: Ihre gesetzlichen Mängelrechte (Gewährleistung nach §§ 437 ff. BGB) sowie Ihr gesetzliches 14-tägiges Widerrufsrecht gemäß Ziffer 1 bleiben durch dieses freiwillige Rückgaberecht uneingeschränkt in vollem Umfang bestehen.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 4: Statutory Model Withdrawal Form */}
        <section className="space-y-3 text-sm text-neutral-700 leading-relaxed bg-neutral-50 p-6 rounded-xl border border-neutral-200">
          <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
            <FileText size={18} className="text-electric-500" />
            3. Gesetzliches Muster-Widerrufsformular
          </h2>
          <p className="text-xs text-neutral-500">
            (Wenn Sie den Vertrag schriftlich widerrufen wollen, können Sie dieses Musterformular ausfüllen und per Post oder E-Mail an uns senden)
          </p>
          <div className="bg-white p-4 rounded-lg border border-neutral-200 font-mono text-xs text-neutral-600 space-y-1.5 leading-relaxed">
            <p><strong>An:</strong> TechnikWelt GmbH, Maximilianstraße 35, 80539 München, Deutschland</p>
            <p><strong>E-Mail:</strong> widerruf@technikwelt.shop</p>
            <p className="pt-2">Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*):</p>
            <p>Bestellt am (*): ____________________ / Erhalten am (*): ____________________</p>
            <p>Bestellnummer (*): __________________</p>
            <p>Name des/der Verbraucher(s): _____________________________________________</p>
            <p>Anschrift des/der Verbraucher(s): __________________________________________</p>
            <p className="pt-2">Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): __________________</p>
            <p>Datum: __________________</p>
            <p className="text-[10px] text-neutral-400 pt-1">(*) Unzutreffendes streichen.</p>
          </div>
        </section>
      </div>
    </div>
  );
};
