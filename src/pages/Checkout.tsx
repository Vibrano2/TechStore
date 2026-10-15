import { formatPrice } from '../utils/formatPrice';
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Shield, ArrowLeft, Loader2, PackageCheck, FileText, Download, MailCheck, AlertCircle, Building2, Copy, Check, UploadCloud, X } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import { createOrder, downloadInvoicePdf, resendOrderConfirmation, uploadPaymentProof } from '../services/ordersApi';
import { useSEO } from '../utils/useSEO';

export interface SavedOrder {
  id: string;
  orderNumber: string;
  date: string;
  items: Array<{
    id: string;
    name: string;
    brand: string;
    price: number;
    quantity: number;
    image: string;
  }>;
  subtotal: number;
  vatAmount: number;
  shipping: number;
  shippingMethod: string;
  paymentMethod: string;
  total: number;
  status: 'In Bearbeitung' | 'Versendet' | 'Geliefert' | 'Zahlungsnachweis eingereicht';
  paymentStatus?: string;
  paymentProofSubmitted?: boolean;
  paymentProofFilename?: string;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    street: string;
    postalCode: string;
    city: string;
  };
}

const BANK_DETAILS = {
  beneficiary: 'TechnikWelt GmbH',
  iban: 'DE38760260000039479100',
  ibanFormatted: 'DE38 7602 6000 0039 4791 00',
  bic: 'NORSDE71XXX',
};

export const Checkout = () => {
  const { cart, cartTotal, clearCart, t } = useShop();
  const { user, isAuthenticated, openAuthModal } = useAuth();

  useSEO({
    title: 'Kasse & Bestellung abschließen | TechnikWelt',
    description: 'Sichere Kasse bei TechnikWelt. Schneller DHL-Versand, SSL-Verschlüsselung & 30 Tage Rückgaberecht.',
    canonical: '/checkout'
  });

  const [step, setStep] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState('');
  const [orderError, setOrderError] = useState('');

  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<string>('PayPal');

  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [firstNameInput, setFirstNameInput] = useState(user?.first_name || '');
  const [lastNameInput, setLastNameInput] = useState(user?.last_name || '');
  const [streetInput, setStreetInput] = useState(user?.street || '');
  const [postalCodeInput, setPostalCodeInput] = useState(user?.postal_code || '');
  const [cityInput, setCityInput] = useState(user?.city || '');

  const [prevUser, setPrevUser] = useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    if (user) {
      setEmailInput((prev) => prev || user.email || '');
      setFirstNameInput((prev) => prev || user.first_name || '');
      setLastNameInput((prev) => prev || user.last_name || '');
      setStreetInput((prev) => prev || user.street || '');
      setPostalCodeInput((prev) => prev || user.postal_code || '');
      setCityInput((prev) => prev || user.city || '');
    }
  }

  const netAmount = Math.round((cartTotal / 1.19) * 100) / 100;
  const vatAmount = Math.round((cartTotal - netAmount) * 100) / 100;
  const standardShipping = cartTotal >= 50 || cartTotal === 0 ? 0 : 4.99;
  const shippingFee = shippingMethod === 'express' ? 9.99 : standardShipping;
  const total = Math.round((cartTotal + shippingFee) * 100) / 100;

  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
  const [invoiceDownloadError, setInvoiceDownloadError] = useState('');
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [confirmationSentMessage, setConfirmationSentMessage] = useState('');
  const [copiedField, setCopiedField] = useState<string>('');

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2500);
  };

  const handleDownloadInvoice = async () => {
    if (!completedOrderNumber || isDownloadingInvoice) return;
    setIsDownloadingInvoice(true);
    setInvoiceDownloadError('');
    const res = await downloadInvoicePdf(completedOrderNumber, emailInput);
    if (!res.success) {
      setInvoiceDownloadError(res.error || 'Fehler beim Herunterladen der Rechnung.');
    }
    setIsDownloadingInvoice(false);
  };

  const handleResendConfirmation = async () => {
    if (!completedOrderNumber || isResendingConfirmation) return;
    setIsResendingConfirmation(true);
    setConfirmationSentMessage('');
    setInvoiceDownloadError('');
    const res = await resendOrderConfirmation(completedOrderNumber, emailInput);
    if (res.success) {
      setConfirmationSentMessage(t('confirmationResentSuccess'));
    } else {
      setInvoiceDownloadError(res.error || 'Bestellbestätigung konnte nicht erneut gesendet werden.');
    }
    setIsResendingConfirmation(false);
  };

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofNote, setProofNote] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [proofSuccessMessage, setProofSuccessMessage] = useState('');
  const [proofError, setProofError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completedOrderNumber || !proofFile || isUploadingProof) return;
    setIsUploadingProof(true);
    setProofError('');
    setProofSuccessMessage('');

    const res = await uploadPaymentProof(completedOrderNumber, proofFile, proofNote, emailInput);
    if (res.success) {
      setProofSuccessMessage(res.message || t('paymentProofSuccess'));
    } else {
      setProofError(res.error || 'Fehler beim Übertragen des Zahlungsnachweises.');
    }
    setIsUploadingProof(false);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || cart.length === 0) return;

    setIsSubmitting(true);
    setOrderError('');

    const res = await createOrder({
      email: emailInput,
      first_name: firstNameInput,
      last_name: lastNameInput,
      street: streetInput,
      postal_code: postalCodeInput,
      city: cityInput,
      country: 'Deutschland',
      payment_method: paymentMethod,
      shipping_method: shippingMethod,
      items: cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        variant_id: item.variantId || null,
        name: item.product.name,
        brand: item.product.brand,
        price: item.product.price,
        image: item.product.images[0] || '',
      })),
    });

    if (res.success && res.order) {
      setCompletedOrderNumber(res.order.orderNumber || res.order.id);
      setIsCompleted(true);
      clearCart();
    } else {
      setOrderError(res.error || 'Fehler beim Aufgeben der Bestellung. Bitte versuchen Sie es erneut.');
    }
    setIsSubmitting(false);
  };

  if (isCompleted) {
    return (
      <div className="container-custom py-16 text-center max-w-xl mx-auto">
        <div className="w-20 h-20 bg-green-100 text-status-success rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <CheckCircle size={40} />
        </div>
        <h1 className="text-3xl font-bold text-navy-900 mb-3">{t('orderConfirmation')}</h1>
        <p className="text-neutral-600 mb-2 text-sm leading-relaxed">
          {t('orderNumber')} <strong className="text-navy-900 font-mono text-base">#{completedOrderNumber}</strong>.
        </p>
        <p className="text-neutral-500 mb-6 text-sm">
          {t('orderSuccessMsg')} ({emailInput})
        </p>

        {(paymentMethod === 'bank_transfer' || paymentMethod === t('bankTransfer') || paymentMethod.toLowerCase().includes('überweis') || paymentMethod.toLowerCase().includes('bank')) && (
          <div className="bg-white border-2 border-electric-500 rounded-2xl p-6 text-left shadow-xs mb-6 relative overflow-hidden">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-electric-50 text-electric-600 flex items-center justify-center shrink-0">
                <Building2 size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-navy-900 text-base">{t('bankTransfer')}</h3>
                  <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    Zahlung ausstehend
                  </span>
                </div>
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                  {t('bankTransferPendingNotice')}
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-medium">{t('bankBeneficiary')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-navy-900">{BANK_DETAILS.beneficiary}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(BANK_DETAILS.beneficiary, 'beneficiary')}
                    className="text-neutral-400 hover:text-electric-600 p-1 rounded transition-colors cursor-pointer"
                    title={t('copy')}
                  >
                    {copiedField === 'beneficiary' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200/60">
                <span className="text-neutral-500 font-medium">{t('bankIban')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-electric-600 text-sm tracking-wide">{BANK_DETAILS.ibanFormatted}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(BANK_DETAILS.iban, 'iban')}
                    className="text-neutral-400 hover:text-electric-600 p-1 rounded transition-colors cursor-pointer"
                    title={t('copy')}
                  >
                    {copiedField === 'iban' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200/60">
                <span className="text-neutral-500 font-medium">{t('bankBic')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-navy-900">{BANK_DETAILS.bic}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(BANK_DETAILS.bic, 'bic')}
                    className="text-neutral-400 hover:text-electric-600 p-1 rounded transition-colors cursor-pointer"
                    title={t('copy')}
                  >
                    {copiedField === 'bic' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200/60">
                <span className="text-neutral-500 font-medium">{t('bankReference')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-navy-900 text-sm">{completedOrderNumber}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(completedOrderNumber, 'reference')}
                    className="text-neutral-400 hover:text-electric-600 p-1 rounded transition-colors cursor-pointer"
                    title={t('copy')}
                  >
                    {copiedField === 'reference' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200/60">
                <span className="text-neutral-500 font-medium">Zu überweisender Betrag</span>
                <span className="font-bold text-navy-900 text-sm">{formatPrice(total)}</span>
              </div>
            </div>

            {copiedField && (
              <div className="mt-3 text-center text-xs font-semibold text-status-success flex items-center justify-center gap-1.5">
                <Check size={14} /> {t('copied')}
              </div>
            )}
          </div>
        )}

        {(paymentMethod === 'bank_transfer' || paymentMethod === t('bankTransfer') || paymentMethod.toLowerCase().includes('überweis') || paymentMethod.toLowerCase().includes('bank')) && (
          <div className="bg-white border-2 border-amber-300/80 rounded-2xl p-6 text-left shadow-xs mb-6 relative overflow-hidden">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <UploadCloud size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-navy-900 text-base">{t('uploadPaymentProof')}</h3>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    proofSuccessMessage
                      ? 'bg-green-50 text-status-success border-green-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {proofSuccessMessage ? t('paymentProofStatusSubmitted') : t('paymentProofStatusRequired')}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                  {t('uploadPaymentProofDesc')}
                </p>
              </div>
            </div>

            {proofSuccessMessage ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-xs font-semibold text-status-success flex items-start gap-2.5">
                <CheckCircle size={18} className="shrink-0 text-green-600 mt-0.5" />
                <div>
                  <p className="text-navy-900 font-bold mb-0.5">{proofSuccessMessage}</p>
                  <p className="text-neutral-500 font-normal">
                    Übermittelter Beleg: <strong className="font-mono text-navy-900">{proofFile?.name || 'ueberweisungsbeleg.pdf'}</strong>
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUploadProof} className="space-y-3">
                <div 
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    isDragging ? 'border-electric-500 bg-electric-50/50' : 'border-neutral-300 hover:border-electric-400 bg-neutral-50/60'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setProofFile(e.dataTransfer.files[0]);
                      setProofError('');
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
                        setProofFile(e.target.files[0]);
                        setProofError('');
                      }
                    }}
                  />
                  {proofFile ? (
                    <div className="flex items-center justify-between text-xs p-2.5 bg-white rounded-lg border border-neutral-200 text-left">
                      <div className="flex items-center gap-2 truncate">
                        <FileText size={18} className="text-electric-500 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-semibold text-navy-900 truncate block">{proofFile.name}</span>
                          <span className="text-[10px] text-neutral-400 block">{(proofFile.size / 1024).toFixed(0)} KB</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProofFile(null);
                        }}
                        className="text-neutral-400 hover:text-status-error p-1 rounded hover:bg-neutral-100 cursor-pointer"
                        title="Entfernen"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="py-2.5">
                      <UploadCloud size={24} className="mx-auto text-neutral-400 mb-1.5" />
                      <p className="text-xs font-semibold text-navy-900">{t('dragProofFile')}</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">{t('selectProofFile')}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    value={proofNote}
                    onChange={(e) => setProofNote(e.target.value)}
                    placeholder={t('optionalProofNote')}
                    className="input-field text-xs py-2.5 px-3 flex-1 w-full"
                  />
                  <button
                    type="submit"
                    disabled={isUploadingProof || !proofFile}
                    className="btn-primary py-2.5 px-5 text-xs font-bold shrink-0 w-full sm:w-auto disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {isUploadingProof ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        {t('submittingPaymentProof')}
                      </>
                    ) : (
                      <>
                        <UploadCloud size={14} />
                        {t('submitPaymentProof')}
                      </>
                    )}
                  </button>
                </div>

                {proofError && (
                  <p className="text-xs text-status-error font-medium">{proofError}</p>
                )}
              </form>
            )}
          </div>
        )}

        <div className="bg-white border border-neutral-200 rounded-2xl p-6 text-left shadow-xs mb-8">
          <div className="flex items-start gap-3.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-electric-50 text-electric-600 flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-navy-900 text-sm">Offizielle Rechnung (§14 UStG)</h3>
              <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                {t('officialInvoiceNotice')}
              </p>
            </div>
          </div>

          {confirmationSentMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-status-success flex items-center gap-2">
              <CheckCircle size={16} />
              {confirmationSentMessage}
            </div>
          )}

          {invoiceDownloadError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-status-error flex items-center gap-2">
              <AlertCircle size={16} />
              {invoiceDownloadError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-neutral-100">
            <button
              onClick={handleDownloadInvoice}
              disabled={isDownloadingInvoice}
              className="btn-primary py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer flex-1 disabled:opacity-70"
            >
              {isDownloadingInvoice ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> {t('downloadingInvoice')}
                </>
              ) : (
                <>
                  <Download size={16} /> {t('downloadInvoice')}
                </>
              )}
            </button>
            <button
              onClick={handleResendConfirmation}
              disabled={isResendingConfirmation}
              className="btn-secondary py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isResendingConfirmation ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Sende...
                </>
              ) : (
                <>
                  <MailCheck size={16} /> {t('resendConfirmation')}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-primary py-3 px-6 text-sm">{t('backToHome')}</Link>
          <Link to="/account" className="btn-secondary py-3 px-6 text-sm flex items-center justify-center gap-2">
            <PackageCheck size={16} /> {t('myOrders')}
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container-custom py-24 text-center max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-navy-900 mb-4">{t('cartEmpty')}</h1>
        <p className="text-neutral-500 mb-8">{t('cartEmptyNotice')}</p>
        <Link to="/category/all" className="btn-primary inline-flex">{t('continueShopping')}</Link>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <div className="mb-6">
        <Link to="/cart" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-electric-500 font-medium transition-colors">
          <ArrowLeft size={16} /> {t('backToCart')}
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-navy-900 mb-8">{t('checkoutTitle')}</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className={`bg-white rounded-xl border ${step === 1 ? 'border-electric-500 ring-2 ring-electric-500/20' : 'border-neutral-200'} p-6 shadow-xs`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-navy-900">1. {t('contactInfo')}</h2>
              {step > 1 && (
                <button type="button" onClick={() => setStep(1)} className="text-sm text-electric-500 font-medium hover:underline">
                  {t('change')}
                </button>
              )}
            </div>
            {step === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4">
                {!isAuthenticated && (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-xs flex items-center justify-between">
                    <span className="text-neutral-600">{t('alreadyCustomerNotice')}</span>
                    <button
                      type="button"
                      onClick={() => openAuthModal('signin')}
                      className="text-electric-500 font-bold hover:underline"
                    >
                      {t('signInNow')}
                    </button>
                  </div>
                )}
                <div>
                  <label htmlFor="checkout-email" className="block text-sm font-medium text-navy-900 mb-1">{t('emailAddressRequired')}</label>
                  <input
                    id="checkout-email"
                    name="email"
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="name@beispiel.de"
                    className="w-full border border-neutral-300 rounded-lg p-2.5 focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm"
                  />
                </div>
                <button type="submit" className="btn-primary w-full sm:w-auto">{t('toShippingAddress')}</button>
              </form>
            )}
            {step > 1 && (
              <p className="text-sm text-neutral-600 font-medium">{emailInput}</p>
            )}
          </div>

          <div className={`bg-white rounded-xl border ${step === 2 ? 'border-electric-500 ring-2 ring-electric-500/20' : 'border-neutral-200'} p-6 shadow-xs ${step < 2 ? 'opacity-60 pointer-events-none' : ''}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-navy-900">2. {t('shippingAddress')}</h2>
              {step > 2 && (
                <button type="button" onClick={() => setStep(2)} className="text-sm text-electric-500 font-medium hover:underline">
                  {t('change')}
                </button>
              )}
            </div>
            {step === 2 && (
              <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="checkout-firstname" className="block text-sm font-medium text-navy-900 mb-1">{t('firstName')} *</label>
                    <input
                      id="checkout-firstname"
                      type="text"
                      name="firstName"
                      required
                      value={firstNameInput}
                      onChange={(e) => setFirstNameInput(e.target.value)}
                      placeholder="Max"
                      className="w-full border border-neutral-300 rounded-lg p-2.5 outline-none text-sm focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-lastname" className="block text-sm font-medium text-navy-900 mb-1">{t('lastName')} *</label>
                    <input
                      id="checkout-lastname"
                      type="text"
                      name="lastName"
                      required
                      value={lastNameInput}
                      onChange={(e) => setLastNameInput(e.target.value)}
                      placeholder="Mustermann"
                      className="w-full border border-neutral-300 rounded-lg p-2.5 outline-none text-sm focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="checkout-street" className="block text-sm font-medium text-navy-900 mb-1">{t('streetAndNumber')} *</label>
                  <input
                    id="checkout-street"
                    type="text"
                    name="street"
                    required
                    value={streetInput}
                    onChange={(e) => setStreetInput(e.target.value)}
                    placeholder="Musterstraße 12"
                    className="w-full border border-neutral-300 rounded-lg p-2.5 outline-none text-sm focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="checkout-postal" className="block text-sm font-medium text-navy-900 mb-1">{t('postalCode')} *</label>
                    <input
                      id="checkout-postal"
                      type="text"
                      name="postalCode"
                      required
                      value={postalCodeInput}
                      onChange={(e) => setPostalCodeInput(e.target.value)}
                      placeholder="10115"
                      className="w-full border border-neutral-300 rounded-lg p-2.5 outline-none text-sm focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-city" className="block text-sm font-medium text-navy-900 mb-1">{t('city')} *</label>
                    <input
                      id="checkout-city"
                      type="text"
                      name="city"
                      required
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      placeholder="Berlin"
                      className="w-full border border-neutral-300 rounded-lg p-2.5 outline-none text-sm focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20"
                    />
                  </div>
                </div>
                <div className="pt-2 flex gap-3">
                  <button type="submit" className="btn-primary w-full sm:w-auto">{t('toShippingMethod')}</button>
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary w-full sm:w-auto">{t('back')}</button>
                </div>
              </form>
            )}
            {step > 2 && (
              <p className="text-sm text-neutral-600 font-medium">
                {firstNameInput} {lastNameInput}, {streetInput}, {postalCodeInput} {cityInput}
              </p>
            )}
          </div>

          <div className={`bg-white rounded-xl border ${step === 3 ? 'border-electric-500 ring-2 ring-electric-500/20' : 'border-neutral-200'} p-6 shadow-xs ${step < 3 ? 'opacity-60 pointer-events-none' : ''}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-navy-900">3. {t('shippingMethodTitle')}</h2>
              {step > 3 && (
                <button type="button" onClick={() => setStep(3)} className="text-sm text-electric-500 font-medium hover:underline">
                  {t('change')}
                </button>
              )}
            </div>
            {step === 3 && (
              <form onSubmit={(e) => { e.preventDefault(); setStep(4); }}>
                <div className="space-y-3 mb-6">
                  <label className={`flex items-center justify-between border rounded-xl p-4 cursor-pointer transition-colors ${shippingMethod === 'standard' ? 'border-electric-500 bg-electric-50/20' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        value="standard"
                        checked={shippingMethod === 'standard'}
                        onChange={() => setShippingMethod('standard')}
                        className="text-electric-500 focus:ring-electric-500"
                      />
                      <div>
                        <div className="font-bold text-navy-900 text-sm">{t('standardShippingTitle')}</div>
                        <div className="text-xs text-neutral-500">{t('standardShippingTime')}</div>
                      </div>
                    </div>
                    <div className="font-bold text-navy-900 text-sm">{standardShipping === 0 ? t('freeShipping') : formatPrice(standardShipping)}</div>
                  </label>
                  <label className={`flex items-center justify-between border rounded-xl p-4 cursor-pointer transition-colors ${shippingMethod === 'express' ? 'border-electric-500 bg-electric-50/20' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        value="express"
                        checked={shippingMethod === 'express'}
                        onChange={() => setShippingMethod('express')}
                        className="text-electric-500 focus:ring-electric-500"
                      />
                      <div>
                        <div className="font-bold text-navy-900 text-sm">{t('expressShippingTitle')}</div>
                        <div className="text-xs text-neutral-500">{t('expressShippingTime')}</div>
                      </div>
                    </div>
                    <div className="font-bold text-navy-900 text-sm">{formatPrice(9.99)}</div>
                  </label>
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary w-full sm:w-auto">{t('toPayment')}</button>
                  <button type="button" onClick={() => setStep(2)} className="btn-secondary w-full sm:w-auto">{t('back')}</button>
                </div>
              </form>
            )}
            {step > 3 && (
              <p className="text-sm text-neutral-600 font-medium">
                {shippingMethod === 'express' ? `${t('expressShippingTitle')} (9,99 €)` : `${t('standardShippingTitle')} (${standardShipping === 0 ? t('freeShipping') : formatPrice(standardShipping)})`}
              </p>
            )}
          </div>

          <div className={`bg-white rounded-xl border ${step === 4 ? 'border-electric-500 ring-2 ring-electric-500/20' : 'border-neutral-200'} p-6 shadow-xs ${step < 4 ? 'opacity-60 pointer-events-none' : ''}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-navy-900">4. {t('paymentMethod')}</h2>
            </div>
            {step === 4 && (
              <form onSubmit={handlePlaceOrder}>
                <div className="space-y-3 mb-6">
                  {[
                    { id: 'bank_transfer', label: t('bankTransfer'), isBank: true },
                    { id: 'PayPal', label: 'PayPal', isBank: false },
                    { id: 'Kreditkarte (Visa / Mastercard)', label: 'Kreditkarte (Visa / Mastercard)', isBank: false },
                    { id: 'Klarna Rechnung', label: 'Klarna Rechnung', isBank: false },
                    { id: 'SEPA-Lastschrift', label: 'SEPA-Lastschrift', isBank: false },
                    { id: 'Apple Pay', label: 'Apple Pay', isBank: false },
                  ].map((method) => {
                    const isSelected = paymentMethod === method.id || paymentMethod === method.label;
                    return (
                      <div
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`border rounded-xl p-4 cursor-pointer transition-colors ${
                          isSelected ? 'border-electric-500 bg-electric-50/20 ring-1 ring-electric-500/30' : 'border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="payment"
                            checked={isSelected}
                            onChange={() => setPaymentMethod(method.id)}
                            className="text-electric-500 focus:ring-electric-500"
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <span className="font-medium text-navy-900 text-sm">{method.label}</span>
                            {method.isBank && (
                              <span className="text-[11px] font-semibold text-electric-600 bg-electric-50 border border-electric-200 px-2 py-0.5 rounded-full">
                                Vorkasse
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && method.isBank && (
                          <div className="mt-3 pt-3 border-t border-electric-200/60 text-xs text-neutral-600 space-y-2 bg-white/80 p-3 rounded-lg">
                            <p className="text-neutral-600 leading-relaxed">
                              {t('bankTransferDesc')}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-neutral-50 p-2.5 rounded-md border border-neutral-200/60">
                              <div>
                                <span className="text-neutral-400 block text-[10px] uppercase font-bold">{t('bankBeneficiary')}</span>
                                <span className="font-semibold text-navy-900">{BANK_DETAILS.beneficiary}</span>
                              </div>
                              <div>
                                <span className="text-neutral-400 block text-[10px] uppercase font-bold">{t('bankBic')}</span>
                                <span className="font-mono font-semibold text-navy-900">{BANK_DETAILS.bic}</span>
                              </div>
                              <div className="sm:col-span-2">
                                <span className="text-neutral-400 block text-[10px] uppercase font-bold">{t('bankIban')}</span>
                                <span className="font-mono font-bold text-electric-600 tracking-wide">{BANK_DETAILS.ibanFormatted}</span>
                              </div>
                            </div>
                            <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200/80 rounded-md text-[11px] text-amber-900 flex items-start gap-2">
                              <AlertCircle size={15} className="shrink-0 text-amber-600 mt-0.5" />
                              <span className="leading-snug">
                                <strong>Zahlungsnachweis erbeten:</strong> Nach Abschluss der Bestellung können Sie Ihren Überweisungsbeleg (Screenshot oder PDF) direkt hochladen, um die Bearbeitung und den sofortigen Versand freizugeben.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 mb-6 text-xs text-neutral-600 leading-relaxed">
                  {t('sslSecurityNotice')}
                </div>
                {orderError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-status-error text-xs font-medium" role="alert">
                    {orderError}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary flex-1 text-base py-3.5 flex items-center justify-center gap-2 shadow-md disabled:opacity-70 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={20} className="animate-spin" /> {t('orderProcessing')}
                      </>
                    ) : (
                      <>
                        <Shield size={20} /> {t('placeOrder')} ({formatPrice(total)})
                      </>
                    )}
                  </button>
                  <button type="button" onClick={() => setStep(3)} className="btn-secondary">
                    {t('back')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white rounded-xl border border-neutral-200 p-6 sticky top-24 shadow-xs">
            <h2 className="text-lg font-bold text-navy-900 mb-6">{t('cartSummaryTitle')} ({cart.length} {t('itemsCount')})</h2>
            
            <div className="space-y-4 mb-6 max-h-[380px] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={`${item.product.id}-${item.variantId || 'd'}`} className="flex gap-3">
                  <div className="w-14 h-14 bg-neutral-50 rounded-lg shrink-0 p-1 border border-neutral-200 relative flex items-center justify-center">
                    <img src={item.product.images[0]} alt={item.product.name} className="max-w-full max-h-full object-contain" />
                    <span className="absolute -top-1.5 -right-1.5 bg-navy-900 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 text-sm min-w-0">
                    <div className="font-semibold text-navy-900 truncate">{item.product.name}</div>
                    <div className="text-xs text-neutral-500">{item.product.brand}</div>
                    <div className="text-xs font-bold text-navy-900 mt-1">{formatPrice(item.product.price * item.quantity)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 text-sm mb-6 pb-6 border-t border-b border-neutral-200 pt-6">
              <div className="flex justify-between text-neutral-600">
                <span>{t('subtotal')}</span>
                <span className="font-semibold text-navy-900">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-500 text-xs">
                <span>{t('taxIncluded')} (19%)</span>
                <span>{formatPrice(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>{t('shipping')}</span>
                <span>{shippingFee === 0 ? t('freeShipping') : formatPrice(shippingFee)}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-end">
              <span className="font-bold text-navy-900">{t('total')}</span>
              <span className="text-2xl font-bold text-navy-900">
                {formatPrice(total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
