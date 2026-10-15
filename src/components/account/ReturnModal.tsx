import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, AlertCircle, CheckCircle, Package, ArrowRight, Loader2, Download } from 'lucide-react';
import type { SavedOrder } from '../../pages/Checkout';
import type { OrderReturn, ReturnReason, RefundMethod, ReturnItemData } from '../../types';
import { createOrderReturn, downloadReturnLabelPdf } from '../../services/returnsApi';
import { formatPrice } from '../../utils/formatPrice';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: SavedOrder[];
  userEmail: string;
  userName: string;
  initialOrderId?: string;
  onReturnCreated: (returnData: OrderReturn) => void;
}

const REASONS: { code: ReturnReason; label: string }[] = [
  { code: 'not_liked', label: 'Artikel gefällt nicht / entspricht nicht den Erwartungen' },
  { code: 'not_as_described', label: 'Artikel weicht von der Beschreibung ab' },
  { code: 'wrong_item', label: 'Falscher Artikel geliefert' },
  { code: 'defective_on_arrival', label: 'Defekt bei Lieferung (Transportschaden)' },
  { code: 'better_price', label: 'Günstigeren Preis gefunden' },
  { code: 'ordered_by_mistake', label: 'Versehentlich bestellt' },
  { code: 'other', label: 'Sonstiger Grund' },
];

export const ReturnModal: React.FC<ReturnModalProps> = ({
  isOpen,
  onClose,
  orders,
  userEmail,
  userName,
  initialOrderId,
  onReturnCreated,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(initialOrderId || (orders[0]?.orderNumber || orders[0]?.id || ''));
  const activeOrder = orders.find((o) => (o.orderNumber || o.id) === selectedOrderId) || orders[0];

  const [selectedItems, setSelectedItems] = useState<Record<string, number>>(() => {
    if (activeOrder && activeOrder.items.length > 0) {
      const initialMap: Record<string, number> = {};
      activeOrder.items.forEach((item) => {
        initialMap[item.id] = item.quantity;
      });
      return initialMap;
    }
    return {};
  });

  const [reason, setReason] = useState<ReturnReason>('not_liked');
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('original_payment');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdReturn, setCreatedReturn] = useState<OrderReturn | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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

  const [prevInitialOrderId, setPrevInitialOrderId] = useState(initialOrderId);
  if (initialOrderId !== prevInitialOrderId) {
    setPrevInitialOrderId(initialOrderId);
    if (initialOrderId) {
      setSelectedOrderId(initialOrderId);
    }
  }

  const [prevActiveOrder, setPrevActiveOrder] = useState<SavedOrder | undefined>(activeOrder);
  if (activeOrder !== prevActiveOrder) {
    setPrevActiveOrder(activeOrder);
    if (activeOrder && activeOrder.items.length > 0) {
      const initialMap: Record<string, number> = {};
      activeOrder.items.forEach((item) => {
        initialMap[item.id] = item.quantity;
      });
      setSelectedItems(initialMap);
    } else {
      setSelectedItems({});
    }
  }


  if (!isOpen) return null;

  const handleToggleItem = (itemId: string, maxQty: number) => {
    setSelectedItems((prev) => {
      const copy = { ...prev };
      if (copy[itemId]) {
        delete copy[itemId];
      } else {
        copy[itemId] = maxQty;
      }
      return copy;
    });
  };

  const handleQtyChange = (itemId: string, qty: number, maxQty: number) => {
    const validQty = Math.max(1, Math.min(qty, maxQty));
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: validQty,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedOrderId.trim()) {
      setError('Bitte wählen Sie eine gültige Bestellnummer aus.');
      return;
    }

    const itemsToReturn: ReturnItemData[] = [];
    if (activeOrder && activeOrder.items.length > 0) {
      for (const item of activeOrder.items) {
        const qty = selectedItems[item.id];
        if (qty && qty > 0) {
          itemsToReturn.push({
            product_id: item.id,
            product_name: item.name,
            quantity: qty,
            unit_price: item.price,
          });
        }
      }
    }

    if (activeOrder && activeOrder.items.length > 0 && itemsToReturn.length === 0) {
      setError('Bitte wählen Sie mindestens einen Artikel zur Rücksendung aus.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await createOrderReturn({
        order_id: selectedOrderId.trim(),
        customer_email: userEmail,
        customer_name: userName,
        reason,
        refund_method: refundMethod,
        customer_notes: notes.trim(),
        items: itemsToReturn,
      });

      if (res.success && res.returnData) {
        setCreatedReturn(res.returnData);
        onReturnCreated(res.returnData);
      } else {
        setError(res.error || 'Rücksendung konnte nicht erstellt werden.');
      }
    } catch {
      setError('Netzwerkfehler beim Absenden der Rücksendung.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!createdReturn || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    await downloadReturnLabelPdf(createdReturn.id, userEmail);
    setIsDownloadingPdf(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-electric-50 text-electric-500 flex items-center justify-center">
              <RefreshCw size={20} />
            </div>
            <div>
              <h2 id="return-modal-title" className="text-lg font-bold text-navy-900">
                Rücksendung veranlassen (30 Tage Rückgaberecht)
              </h2>
              <p className="text-xs text-neutral-500">
                Kostenfreies DHL Retourenetikett • Gesetzlicher Widerruf gem. § 355 BGB
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
          {createdReturn ? (
            <div className="space-y-6 py-4 animate-fadeIn text-center">
              <div className="w-16 h-16 bg-green-50 text-status-success rounded-full flex items-center justify-center mx-auto border border-green-200">
                <CheckCircle size={36} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-navy-900">Rücksendeantrag erfolgreich erstellt!</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Ihr kostenfreies DHL Retourenetikett wurde generiert und für Sie hinterlegt.
                </p>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 text-left space-y-3 max-w-md mx-auto">
                <div className="flex justify-between items-center text-xs border-b border-neutral-200/60 pb-2">
                  <span className="text-neutral-500 font-medium">Retouren-Nummer (RMA):</span>
                  <span className="font-bold text-electric-600 font-mono text-sm">{createdReturn.id}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-neutral-200/60 pb-2">
                  <span className="text-neutral-500 font-medium">Bestellnummer:</span>
                  <span className="font-bold text-navy-900">{createdReturn.order_id}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-neutral-200/60 pb-2">
                  <span className="text-neutral-500 font-medium">DHL Sendungsnummer:</span>
                  <span className="font-mono text-neutral-800">{createdReturn.return_tracking_number}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-500 font-medium">Erstattungsbetrag:</span>
                  <span className="font-bold text-navy-900">{formatPrice(createdReturn.refund_amount)}</span>
                </div>
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 text-left max-w-md mx-auto leading-relaxed">
                <strong>Nächste Schritte:</strong> Drucken Sie das Retourenlabel aus, legen Sie den Retourenschein ins Paket und kleben Sie den DHL Aufkleber auf. Sie können das Paket kostenfrei in jeder Filiale oder Packstation abgeben.
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="btn-primary py-2.5 px-5 text-xs inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDownloadingPdf ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>PDF wird erstellt...</span>
                    </>
                  ) : (
                    <>
                      <Download size={15} />
                      <span>DHL Retourenschein (PDF)</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary py-2.5 px-5 text-xs cursor-pointer"
                >
                  Fertigstellen
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-status-error flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                  1. Zugehörige Bestellung wählen <span className="text-red-500">*</span>
                </label>
                {orders.length > 0 ? (
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg p-2.5 text-xs font-medium bg-white focus:border-electric-500 outline-none"
                    required
                  >
                    {orders.map((ord) => (
                      <option key={ord.id} value={ord.orderNumber || ord.id}>
                        {ord.orderNumber || ord.id} • {ord.date} • {formatPrice(ord.total)} ({ord.items.length} Artikel)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    placeholder="z. B. TS-DE-123456"
                    className="w-full border border-neutral-300 rounded-lg p-2.5 text-xs font-medium bg-white focus:border-electric-500 outline-none"
                    required
                  />
                )}
              </div>

              {activeOrder && activeOrder.items.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                    2. Zu retournierende Artikel auswählen <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100 overflow-hidden bg-neutral-50/50">
                    {activeOrder.items.map((item) => {
                      const isChecked = Boolean(selectedItems[item.id]);
                      const currentQty = selectedItems[item.id] || 1;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 flex items-center gap-3 transition-colors ${
                            isChecked ? 'bg-white' : 'opacity-70 bg-neutral-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            id={`ret-item-${item.id}`}
                            checked={isChecked}
                            onChange={() => handleToggleItem(item.id, item.quantity)}
                            className="w-4 h-4 text-electric-600 rounded-sm border-neutral-300 focus:ring-electric-500 cursor-pointer"
                          />
                          <label
                            htmlFor={`ret-item-${item.id}`}
                            className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
                          >
                            <div className="w-10 h-10 bg-white rounded-lg p-1 shrink-0 flex items-center justify-center border border-neutral-200">
                              <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs text-navy-900 truncate">{item.name}</div>
                              <div className="text-[11px] text-neutral-500">{formatPrice(item.price)} pro Stück</div>
                            </div>
                          </label>

                          {isChecked && item.quantity > 1 && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] text-neutral-500">Menge:</span>
                              <input
                                type="number"
                                min={1}
                                max={item.quantity}
                                value={currentQty}
                                onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 1, item.quantity)}
                                className="w-14 border border-neutral-300 rounded-md p-1 text-xs text-center outline-none focus:border-electric-500 bg-white"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                  3. Rücksendegrund <span className="text-red-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReturnReason)}
                  className="w-full border border-neutral-300 rounded-lg p-2.5 text-xs bg-white focus:border-electric-500 outline-none"
                >
                  {REASONS.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                  4. Bevorzugter Erstattungsweg <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`border rounded-xl p-3 flex items-start gap-3 cursor-pointer transition-all ${
                      refundMethod === 'original_payment'
                        ? 'border-electric-500 bg-electric-50/40 text-navy-900'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      value="original_payment"
                      checked={refundMethod === 'original_payment'}
                      onChange={() => setRefundMethod('original_payment')}
                      className="mt-0.5 text-electric-600 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-xs text-navy-900">Ursprüngliche Zahlungsart</div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        Rücküberweisung auf PayPal, Kreditkarte, Bankkonto oder Klarna
                      </div>
                    </div>
                  </label>

                  <label
                    className={`border rounded-xl p-3 flex items-start gap-3 cursor-pointer transition-all ${
                      refundMethod === 'store_credit'
                        ? 'border-electric-500 bg-electric-50/40 text-navy-900'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      value="store_credit"
                      checked={refundMethod === 'store_credit'}
                      onChange={() => setRefundMethod('store_credit')}
                      className="mt-0.5 text-electric-600 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-xs text-navy-900">Guthaben auf Kundenkonto</div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        Sofort nach Eingang für zukünftige Einkäufe verfügbar
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                  5. Zusätzliche Anmerkungen (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Geben Sie hier zusätzliche Details oder Bemerkungen für unser Prüfteam an..."
                  rows={2}
                  className="w-full border border-neutral-300 rounded-lg p-2.5 text-xs bg-white focus:border-electric-500 outline-none resize-none"
                />
              </div>

              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-3">
                <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                  <Package size={14} className="text-electric-500 shrink-0" />
                  <span>Kostenfreier DHL Rückversand innerhalb Deutschlands</span>
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
                        <span>Wird angelegt...</span>
                      </>
                    ) : (
                      <>
                        <span>Retourenlabel anfordern</span>
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
