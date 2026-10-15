import { createContext, useContext } from 'react';
import type { User, SendOtpResult, VerifyOtpResult } from '../types/auth';

import type { Language } from '../i18n/translations';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'signin' | 'signup';
  openAuthModal: (mode?: 'signin' | 'signup', trigger?: HTMLElement | null) => void;
  closeAuthModal: () => void;
  sendOtp: (email: string, language?: Language) => Promise<SendOtpResult>;
  verifyOtp: (
    email: string,
    otp: string,
    firstName?: string,
    lastName?: string,
    language?: Language
  ) => Promise<VerifyOtpResult>;
  logout: () => Promise<void>;
  updateUser: (updated: User) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
