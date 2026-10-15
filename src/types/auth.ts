export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  language: 'de' | 'en' | 'fr' | 'es';
  phone?: string;
  street?: string;
  house_number?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  created_at?: string;
}

export interface SendOtpResult {
  success: boolean;
  message?: string;
  error?: string;
  devCode?: string;
  cooldownSeconds?: number;
}

export interface VerifyOtpResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  isNewUser?: boolean;
}
