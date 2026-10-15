import React, { useState, useEffect } from 'react';
import type { User, SendOtpResult, VerifyOtpResult } from '../types/auth';
import type { Language } from '../i18n/translations';
import * as authApi from '../services/authApi';
import { AuthContext } from './AuthContext';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authApi.getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    let isMounted = true;
    authApi.fetchCurrentUser().then((currentUser) => {
      if (isMounted) {
        setUser(currentUser);
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const [modalTrigger, setModalTrigger] = useState<HTMLElement | null>(null);

  const openAuthModal = (mode: 'signin' | 'signup' = 'signin', trigger?: HTMLElement | null) => {
    const el = trigger || (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setModalTrigger(el);
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    if (modalTrigger) {
      setTimeout(() => {
        modalTrigger.focus();
      }, 50);
    }
  };

  const sendOtp = async (email: string, language?: Language): Promise<SendOtpResult> => {
    return await authApi.sendOtp(email, language);
  };

  const verifyOtp = async (
    email: string,
    otp: string,
    firstName?: string,
    lastName?: string,
    language?: Language
  ): Promise<VerifyOtpResult> => {
    const result = await authApi.verifyOtp(email, otp, firstName, lastName, language);
    if (result.success && result.user) {
      setUser(result.user);
      setIsAuthModalOpen(false);
    }
    return result;
  };

  const logout = async () => {
    await authApi.logoutUser();
    setUser(null);
  };

  const updateUser = async (updated: User) => {
    setUser(updated);
    const token = authApi.getStoredToken();
    if (token) {
      authApi.storeSession(token, updated);
      const serverUser = await authApi.updateProfile({
        first_name: updated.first_name,
        last_name: updated.last_name,
        phone: updated.phone,
        street: updated.street,
        house_number: updated.house_number,
        postal_code: updated.postal_code,
        city: updated.city,
        language: updated.language,
      });
      if (serverUser) {
        setUser(serverUser);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        sendOtp,
        verifyOtp,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
