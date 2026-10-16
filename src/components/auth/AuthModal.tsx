import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mail, KeyRound, CheckCircle, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalMode, sendOtp, verifyOtp } = useAuth();
  const { t, language } = useShop();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [step, setStep] = useState<'email' | 'otp'>('email');

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const triggerRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const [prevIsOpen, setPrevIsOpen] = useState(isAuthModalOpen);
  if (isAuthModalOpen !== prevIsOpen) {
    setPrevIsOpen(isAuthModalOpen);
    if (isAuthModalOpen) {
      setMode(authModalMode);
      setStep('email');
      setErrorMessage('');
      setSuccessNotice('');
      setOtpDigits(['', '', '', '', '', '']);
    }
  }

  const handleCloseModal = useCallback(() => {
    const trigger = triggerRef.current;
    closeAuthModal();
    if (trigger) {
      setTimeout(() => {
        trigger.focus();
      }, 50);
    }
  }, [closeAuthModal]);

  useEffect(() => {
    if (!isAuthModalOpen) return;

    if (!triggerRef.current && typeof document !== 'undefined') {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }

    const focusTimer = setTimeout(() => {
      if (modalRef.current) {
        const emailInput = modalRef.current.querySelector<HTMLInputElement>('input[type="email"]');
        if (emailInput) {
          emailInput.focus();
        } else {
          const focusables = modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length > 0) {
            focusables[0].focus();
          } else {
            modalRef.current.focus();
          }
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      if (triggerRef.current) {
        triggerRef.current.focus();
      }
    };
  }, [isAuthModalOpen, handleCloseModal]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isAuthModalOpen) return null;

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage(t('authErrorInvalidEmail'));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendOtp(cleanEmail, language);
      if (res.success) {
        setStep('otp');
        setCooldown(res.cooldownSeconds || 60);
        setSuccessNotice(res.message || t('authSubtitleOtp'));
        if (res.devCode && typeof res.devCode === 'string') {
          const chars = res.devCode.split('').slice(0, 6);
          setOtpDigits(chars);
        }
        setTimeout(() => {
          digitInputRefs.current[0]?.focus();
        }, 100);
      } else {
        setErrorMessage(res.error || t('authServiceUnavailable') || t('authErrorGeneral'));
        if (res.cooldownSeconds) setCooldown(res.cooldownSeconds);
      }
    } catch {
      setErrorMessage(t('authServiceUnavailable') || t('authErrorGeneral'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (cleanVal.length > 1) {
      const pastedChars = cleanVal.slice(0, 6).split('');
      pastedChars.forEach((char, i) => {
        if (index + i < 6) {
          newDigits[index + i] = char;
        }
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(index + pastedChars.length, 5);
      digitInputRefs.current[nextIndex]?.focus();

      if (newDigits.every((d) => d !== '')) {
        handleVerifyCode(newDigits.join(''));
      }
      return;
    }

    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    if (cleanVal && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }

    if (cleanVal && newDigits.every((d) => d !== '')) {
      handleVerifyCode(newDigits.join(''));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedText) {
      const newDigits = ['', '', '', '', '', ''];
      pastedText.split('').forEach((char, i) => {
        newDigits[i] = char;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pastedText.length, 5);
      digitInputRefs.current[nextIndex]?.focus();
      if (pastedText.length === 6) {
        handleVerifyCode(pastedText);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        e.preventDefault();
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        digitInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      digitInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerifyCode = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || otpDigits.join('');
    if (fullCode.length !== 6) {
      setErrorMessage(t('authErrorIncompleteCode'));
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await verifyOtp(
        email,
        fullCode,
        mode === 'signup' ? firstName : '',
        mode === 'signup' ? lastName : '',
        language
      );

      if (!res.success) {
        setErrorMessage(res.error || t('authErrorInvalidCode'));
        setOtpDigits(['', '', '', '', '', '']);
        digitInputRefs.current[0]?.focus();
      }
    } catch {
      setErrorMessage(t('authServiceUnavailable') || t('authErrorGeneral'));
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseModal();
      }}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md overflow-hidden relative focus:outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        tabIndex={-1}
      >
        <button
          onClick={handleCloseModal}
          className="absolute top-4 right-4 text-neutral-400 hover:text-navy-900 p-2 rounded-full hover:bg-neutral-100 transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-electric-500"
          aria-label={t('authCloseModal')}
        >
          <X size={20} />
        </button>

        <div className="bg-[#0B1F33] p-6 text-white text-center relative overflow-hidden">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-electric-500 text-white mb-3 shadow-md">
            {step === 'email' ? <Mail size={24} /> : <KeyRound size={24} />}
          </div>
          <h2 id="auth-modal-title" className="text-2xl font-bold text-white tracking-tight">
            {step === 'email'
              ? mode === 'signin'
                ? t('authWelcomeBack')
                : t('authCreateAccount')
              : t('authEnterCode')}
          </h2>
          <p className="text-neutral-300 text-xs mt-1 max-w-xs mx-auto">
            {step === 'email'
              ? t('authSubtitleEmail')
              : `${t('authSubtitleOtp')} (${email})`}
          </p>

          {step === 'email' && (
            <div className="flex bg-navy-900/80 p-1 rounded-lg mt-4 max-w-xs mx-auto border border-white/10">
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMessage(''); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all focus:outline-none focus:ring-1 focus:ring-white ${
                  mode === 'signin'
                    ? 'bg-electric-500 text-white shadow-sm'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                {t('authSignInTab')}
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMessage(''); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all focus:outline-none focus:ring-1 focus:ring-white ${
                  mode === 'signup'
                    ? 'bg-electric-500 text-white shadow-sm'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                {t('authRegisterTab')}
              </button>
            </div>
          )}
        </div>

        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-status-error text-xs font-medium flex items-start gap-2" role="alert">
              <span className="font-bold">•</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && step === 'otp' && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-status-success text-xs font-medium flex items-center gap-2">
              <CheckCircle size={16} className="shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1.5">
                  {t('authEmailLabel')} <span className="text-status-error">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@beispiel.de"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E3E8EF] focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm font-medium transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {mode === 'signup' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-navy-900 mb-1">
                      {t('authFirstNameLabel')}
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Max"
                      className="w-full px-3 py-2 rounded-lg border border-[#E3E8EF] focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-navy-900 mb-1">
                      {t('authLastNameLabel')}
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Mustermann"
                      className="w-full px-3 py-2 rounded-lg border border-[#E3E8EF] focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 outline-none text-sm font-medium"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-electric-500 hover:bg-electric-600 text-white py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 focus:ring-2 focus:ring-electric-500"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    {t('authSendingCode')}
                  </>
                ) : (
                  <>
                    {t('authRequestCodeBtn')}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-500 pt-2">
                <ShieldCheck size={14} className="text-status-success" />
                <span>{t('authSecurityBadge')}</span>
              </div>
            </form>
          ) : (
            <div className="space-y-5" onPaste={handlePaste}>
              <div>
                <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-2 text-center">
                  {t('authEnterDigitsPrompt')}
                </label>
                <div className="flex justify-center gap-2 sm:gap-3">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-digit-${idx + 1}`}
                      data-index={idx}
                      aria-label={`${t('authDigitAriaLabel')} ${idx + 1} ${t('authDigitOfCode')}`}
                      ref={(el) => { digitInputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold font-mono text-navy-900 bg-neutral-50 border-2 border-[#E3E8EF] rounded-lg focus:border-electric-500 focus:bg-white focus:ring-2 focus:ring-electric-500/20 outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleVerifyCode()}
                disabled={isSubmitting || otpDigits.some((d) => !d)}
                className="w-full bg-electric-500 hover:bg-electric-600 text-white py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 focus:ring-2 focus:ring-electric-500 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    {t('authVerifying')}
                  </>
                ) : (
                  t('authVerifyBtn')
                )}
              </button>

              <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-600 pt-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setErrorMessage(''); }}
                  className="text-electric-500 hover:underline font-medium focus:outline-none focus:ring-1 focus:ring-electric-500"
                >
                  {t('authChangeEmail')}
                </button>

                {cooldown > 0 ? (
                  <span className="text-neutral-400">
                    {t('authResendIn')} {cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendCode()}
                    disabled={isSubmitting}
                    className="text-electric-500 hover:underline font-medium flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-electric-500"
                  >
                    <RefreshCw size={12} />
                    {t('authResendCode')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
