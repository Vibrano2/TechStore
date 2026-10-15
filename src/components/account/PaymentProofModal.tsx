import React, { useState, useRef } from 'react';
import { X, UploadCloud, CheckCircle, FileText, Loader2, AlertCircle } from 'lucide-react';
import type { SavedOrder } from '../../pages/Checkout';
import { uploadPaymentProof } from '../../services/ordersApi';
import { formatPrice } from '../../utils/formatPrice';

interface PaymentProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SavedOrder | null;
  userEmail: string;
  onProofSubmitted?: (orderId: string, filename: string) => void;
}

export const PaymentProofModal: React.FC<PaymentProofModalProps> = ({
  isOpen,
  onClose,
  order,
  userEmail,
  onProofSubmitted,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const orderId = order.orderNumber || order.id;
    const res = await uploadPaymentProof(orderId, file, note, userEmail || order.customer?.email);

    if (res.success) {
      setSuccessMessage(res.message || 'Zahlungsnachweis erfolgreich übermittelt!');
      if (onProofSubmitted) {
        onProofSubmitted(orderId, file.name);
      }
    } else {
      setError(res.error || 'Fehler beim Übermitteln des Zahlungsnachweises.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-neutral-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-navy-900 rounded-lg cursor-pointer transition-colors"
          aria-label="Schließen"
        >
          <X size={20} />
        </button>

        <div className="flex items-start gap-3.5 mb-5 pb-4 border-b border-neutral-100">
          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <UploadCloud size={22} />
          </div>
          <div>
            <h2 className="font-bold text-navy-900 text-lg">Zahlungsnachweis übermitteln</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Bestellung <strong className="font-mono text-navy-900">#{order.orderNumber || order.id}</strong> ({formatPrice(order.total)})
            </p>
          </div>
        </div>

        {successMessage ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 text-status-success rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle size={32} />
            </div>
            <div>
              <h3 className="font-bold text-navy-900 text-base">{successMessage}</h3>
              <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                Übermittelter Beleg: <strong className="font-mono text-navy-900">{file?.name}</strong>.
                Unser Team ordnet Ihre Zahlung zu und gibt die Sendung frei.
              </p>
            </div>
            <button
              onClick={onClose}
              className="btn-primary py-2.5 px-6 text-xs font-bold shadow-xs cursor-pointer inline-flex"
            >
              Verstanden
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/80 text-xs text-neutral-600 leading-relaxed">
              <p>
                Bitte laden Sie Ihren Screenshot oder ein PDF aus dem Online-Banking hoch, aus dem der Betrag von{' '}
                <strong className="text-navy-900">{formatPrice(order.total)}</strong> und der Verwendungszweck{' '}
                <strong className="font-mono text-navy-900">#{order.orderNumber || order.id}</strong> hervorgehen.
              </p>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-electric-500 bg-electric-50/50' : 'border-neutral-300 hover:border-electric-400 bg-neutral-50/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  setFile(e.dataTransfer.files[0]);
                  setError(null);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFile(e.target.files[0]);
                    setError(null);
                  }
                }}
              />
              {file ? (
                <div className="flex items-center justify-between text-xs p-2.5 bg-white rounded-lg border border-neutral-200 text-left">
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={18} className="text-electric-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-semibold text-navy-900 truncate block">{file.name}</span>
                      <span className="text-[10px] text-neutral-400 block">{(file.size / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-neutral-400 hover:text-status-error p-1 rounded hover:bg-neutral-100 cursor-pointer"
                    title="Entfernen"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div className="py-3">
                  <UploadCloud size={28} className="mx-auto text-neutral-400 mb-2" />
                  <p className="text-xs font-semibold text-navy-900">Datei hier ablegen oder klicken zum Auswählen</p>
                  <p className="text-[11px] text-neutral-400 mt-1">PDF, PNG, JPG (max. 10 MB)</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-900 mb-1">
                Optionale Anmerkung (z. B. Überweisungsdatum)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="z. B. Überwiesen am 14.10. via Commerzbank"
                className="input-field text-xs py-2 px-3 w-full"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-status-error flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary py-2.5 px-4 text-xs font-semibold"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !file}
                className="btn-primary py-2.5 px-5 text-xs font-bold disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Wird übertragen...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={15} />
                    <span>Zahlungsnachweis übermitteln</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
