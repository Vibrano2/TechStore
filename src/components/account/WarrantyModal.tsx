import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, AlertCircle, CheckCircle, Wrench, RefreshCw, Loader2, ArrowRight, Info } from 'lucide-react';
import type { SavedOrder } from '../../pages/Checkout';
import type { WarrantyClaim, DefectCategory, RemedyPreference } from '../../types';
import { createWarrantyClaim } from '../../services/warrantyApi';

interface WarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: SavedOrder[];
  userEmail: string;
  userName: string;
  initialOrderId?: string;
  initialProductId?: string;
  onClaimCreated: (claim: WarrantyClaim) => void;
}

const DEFECT_CATEGORIES: { code: DefectCategory; label: string }[] = [
  { code: 'technical_fault', label: 'Technischer Defekt / Gerät schaltet nicht ein' },
  { code: 'display_fault', label: 'Displayfehler / Touchscreen / Pixelfehler' },
  { code: 'battery_power', label: 'Akku lädt nicht / Schaltet unerwartet ab' },
  { code: 'transport_damage', label: 'Transportschaden / Gehäuse beschädigt' },
  { code: 'connectivity', label: 'WLAN / Bluetooth / Verbindungsproblem' },
  { code: 'other', label: 'Sonstiger Mangel' },
];

export const WarrantyModal: React.FC<WarrantyModalProps> = ({
  isOpen,
  onClose,
  orders,
  userEmail,
  userName,
  initialOrderId,
  initialProductId,
  onClaimCreated,
}) => {
  const purchasedProducts = orders.flatMap((o) =>
    o.items.map((it) => ({
      orderId: o.orderNumber || o.id,
      productId: it.id,
      name: it.name,
      image: it.image,
    }))
  );

  const [orderId, setOrderId] = useState(initialOrderId || (orders[0]?.orderNumber || orders[0]?.id || ''));
  const [selectedProductId, setSelectedProductId] = useState(
    initialProductId || (purchasedProducts[0]?.productId || '')
  );

  const [prevInitialOrderId, setPrevInitialOrderId] = useState(initialOrderId);
  const [prevInitialProductId, setPrevInitialProductId] = useState(initialProductId);

  if (initialOrderId !== prevInitialOrderId) {
    setPrevInitialOrderId(initialOrderId);
    if (initialOrderId) setOrderId(initialOrderId);
  }
  if (initialProductId !== prevInitialProductId) {
    setPrevInitialProductId(initialProductId);
    if (initialProductId) setSelectedProductId(initialProductId);
  }

  const [customProductName, setCustomProductName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [defectCategory, setDefectCategory] = useState<DefectCategory>('technical_fault');
  const [remedyPreference, setRemedyPreference] = useState<RemedyPreference>('repair');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdClaim, setCreatedClaim] = useState<WarrantyClaim | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const chosenProduct = purchasedProducts.find((p) => p.productId === selectedProductId);
    const finalProductName = chosenProduct?.name || customProductName.trim();

    if (!finalProductName) {
      setError('Bitte wählen Sie ein betroffenes Produkt aus oder geben Sie den Produktnamen an.');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setError('Bitte beschreiben Sie den Mangel möglichst präzise (mindestens 10 Zeichen).');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await createWarrantyClaim({
        customer_email: userEmail,
        customer_name: userName,
        order_id: orderId.trim(),
        product: selectedProductId || 'custom-item',
        product_name: finalProductName,
        serial_number: serialNumber.trim(),
        defect_category: defectCategory,
        remedy_preference: remedyPreference,
        description: description.trim(),
      });

      if (res.success && res.claim) {
        setCreatedClaim(res.claim);
        onClaimCreated(res.claim);
      } else {
        setError(res.error || 'Garantieantrag konnte nicht eingereicht werden.');
      }
    } catch {
      setError('Netzwerkfehler beim Absenden des Garantieantrags.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="warranty-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-electric-50 text-electric-500 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 id="warranty-modal-title" className="text-lg font-bold text-navy-900">
                Garantie- / Gewährleistungsfall einreichen
              </h2>
              <p className="text-xs text-neutral-500">
                24 Monate gesetzliche Gewährleistung gem. §§ 437, 438, 439 BGB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Modal schließen"
            className="text-neutral-400 hover:text-navy-900 p-2 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {createdClaim ? (
            <div className="space-y-6 py-4 animate-fadeIn text-center">
              <div className="w-16 h-16 bg-green-50 text-status-success rounded-full flex items-center justify-center mx-auto border border-green-200">
                <CheckCircle size={36} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-navy-900">Garantieantrag erfolgreich eingereicht!</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Ihr Vorgang wurde an unser deutsches Technik-Servicecenter übermittelt.
                </p>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 text-left space-y-3 max-w-md mx-auto">
                <div className="flex justify-between items-center text-xs border-b border-neutral-200/60 pb-2">
                  <span className="text-neutral-500 font-medium">Vorgangsnummer:</span>
                  <span className="font-bold text-electric-600 font-mono text-sm">{createdClaim.claim_number}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-neutral-200/60 pb-2">
                  <span className="text-neutral-500 font-medium">Produkt:</span>
                  <span className="font-bold text-navy-900">{createdClaim.product_name}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-neutral-200/60 pb-2">
                  <span className="text-neutral-500 font-medium">Gewählte Nacherfüllung:</span>
                  <span className="text-neutral-800">{createdClaim.remedy_preference_display}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-500 font-medium">Status:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {createdClaim.status_display}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 text-left max-w-md mx-auto leading-relaxed">
                <strong>Bearbeitungszeit:</strong> Unser Technik-Team prüft Ihre Angaben in der Regel innerhalb von 24 Stunden. Sie erhalten ein kostenfreies DHL Versandetikett zur Einsendung des defekten Geräts an unsere Vertragswerkstatt.
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-primary py-2.5 px-6 text-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  Zurück zur Übersicht
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-status-error flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                <Info size={16} className="text-electric-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Gesetzliche Mängelhaftung (§ 439 BGB):</strong> Als Kunde haben Sie im Gewährleistungsfall das gesetzliche Recht, zwischen kostenloser <strong>Reparatur / Nachbesserung</strong> oder einer <strong>Ersatzlieferung (Neugerät)</strong> zu wählen.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                  1. Betroffenes Produkt <span className="text-red-500">*</span>
                </label>
                {purchasedProducts.length > 0 ? (
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      const match = purchasedProducts.find((p) => p.productId === e.target.value);
                      if (match) setOrderId(match.orderId);
                    }}
                    className="w-full border border-neutral-300 rounded-lg p-2.5 text-xs font-medium bg-white focus:border-electric-500 outline-none"
                    required
                  >
                    {purchasedProducts.map((p, idx) => (
                      <option key={`${p.productId}-${idx}`} value={p.productId}>
                        {p.name} (Bestellung: {p.orderId})
                      </option>
                    ))}
                    <option value="other_product">+ Anderes Produkt manuell angeben</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customProductName}
                    onChange={(e) => setCustomProductName(e.target.value)}
                    placeholder="Vollständiger Produktname (z. B. Sony WH-1000XM5)"
                    className="w-full border border-neutral-300 rounded-lg p-2.5 text-xs bg-white focus:border-electric-500 outline-none"
                    required
                  />
                )}

                {selectedProductId === 'other_product' && (
                  <input
                    type="text"
                    value={customProductName}
                    onChange={(e) => setCustomProductName(e.target.value)}
                    placeholder="Geben Sie hier die genaue Modellbezeichnung ein"
                    className="w-full mt-2 border border-neutral-300 rounded-lg p-2.5 text-xs bg-white focus:border-electric-500 outline-none"
                    required
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                    Bestellnummer (optional)
                  </label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="z. B. TS-DE-981240"
                    className="w-full border border-neutral-300 rounded-lg p-2.5 text-xs bg-white focus:border-electric-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                    Seriennummer (S/N auf Gerät / Karton)
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="z. B. S/N: 24-9988112-X"
                    className="w-full border border-neutral-300 rounded-lg p-2.5 text-xs bg-white focus:border-electric-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                  2. Art des Mangels / Fehlerkategorie <span className="text-red-500">*</span>
                </label>
                <select
                  value={defectCategory}
                  onChange={(e) => setDefectCategory(e.target.value as DefectCategory)}
                  className="w-full border border-neutral-300 rounded-lg p-2.5 text-xs bg-white focus:border-electric-500 outline-none"
                >
                  {DEFECT_CATEGORIES.map((cat) => (
                    <option key={cat.code} value={cat.code}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                  3. Ihre gewünschte Nacherfüllung gem. § 439 Abs. 1 BGB <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`border rounded-xl p-3 flex items-start gap-3 cursor-pointer transition-all ${
                      remedyPreference === 'repair'
                        ? 'border-electric-500 bg-electric-50/40 text-navy-900'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="remedyPreference"
                      value="repair"
                      checked={remedyPreference === 'repair'}
                      onChange={() => setRemedyPreference('repair')}
                      className="mt-0.5 text-electric-600 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-xs text-navy-900 flex items-center gap-1.5">
                        <Wrench size={13} className="text-electric-500" />
                        Reparatur / Nachbesserung
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        Fachgerechte Instandsetzung mit Original-Ersatzteilen
                      </div>
                    </div>
                  </label>

                  <label
                    className={`border rounded-xl p-3 flex items-start gap-3 cursor-pointer transition-all ${
                      remedyPreference === 'replacement'
                        ? 'border-electric-500 bg-electric-50/40 text-navy-900'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="remedyPreference"
                      value="replacement"
                      checked={remedyPreference === 'replacement'}
                      onChange={() => setRemedyPreference('replacement')}
                      className="mt-0.5 text-electric-600 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-xs text-navy-900 flex items-center gap-1.5">
                        <RefreshCw size={13} className="text-electric-500" />
                        Ersatzlieferung / Neugerät
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        Lieferung eines fabrikneuen Ersatzgerätes
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                  4. Detaillierte Fehlerbeschreibung <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Beschreiben Sie bitte genau, wann der Fehler auftritt, wie er sich äußert und welche Schritte bereits unternommen wurden..."
                  rows={3}
                  className="w-full border border-neutral-300 rounded-lg p-2.5 text-xs bg-white focus:border-electric-500 outline-none resize-none"
                  required
                />
              </div>

              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-3">
                <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-electric-500 shrink-0" />
                  <span>Kostenfreie Abwicklung & Rücksendung</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary py-2 px-4 text-xs cursor-pointer"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary py-2 px-5 text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Wird eingereicht...</span>
                      </>
                    ) : (
                      <>
                        <span>Antrag einreichen</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
