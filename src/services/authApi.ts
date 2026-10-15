import type { User, SendOtpResult, VerifyOtpResult } from '../types/auth';
import { getTranslation, type Language } from '../i18n/translations';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

const REAL_TOKEN_KEY = 'technikwelt_auth_token';
const REAL_USER_KEY = 'technikwelt_auth_user';

const DEMO_TOKEN_KEY = 'technikwelt_demo_token';
const DEMO_USER_KEY = 'technikwelt_demo_user';
const DEMO_MODE_FLAG = 'technikwelt_demo_mode';

export const isDemoAuthMode = (): boolean => {
  if (import.meta.env.VITE_AUTH_DEMO_MODE === 'true' || import.meta.env.VITE_DEMO_MODE === 'true') {
    return true;
  }
  if (typeof window !== 'undefined' && ((window as any).__TECHSTORE_DEMO_AUTH__ === true || (window as any).__DEMO_MODE__ === true)) {
    return true;
  }
  if (typeof localStorage !== 'undefined' && localStorage.getItem(DEMO_MODE_FLAG) === 'true') {
    return true;
  }
  return false;
};

export const setDemoAuthMode = (enabled: boolean): void => {
  if (typeof localStorage !== 'undefined') {
    if (enabled) {
      localStorage.setItem(DEMO_MODE_FLAG, 'true');
    } else {
      localStorage.removeItem(DEMO_MODE_FLAG);
    }
  }
  if (typeof window !== 'undefined') {
    (window as any).__TECHSTORE_DEMO_AUTH__ = enabled;
  }
};

const demoOtpMap = new Map<string, string>();

const getActiveLanguage = (preferred?: string): Language => {
  if (preferred === 'de' || preferred === 'en' || preferred === 'fr' || preferred === 'es') {
    return preferred;
  }
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('technikwelt_lang') || localStorage.getItem('techstore_lang');
    if (saved === 'de' || saved === 'en' || saved === 'fr' || saved === 'es') {
      return saved;
    }
  }
  return 'de';
};

const getServiceUnavailableError = (preferredLang?: string): string => {
  const lang = getActiveLanguage(preferredLang);
  return getTranslation('authServiceUnavailable', lang);
};

export const getStoredToken = (): string | null => {
  if (isDemoAuthMode()) {
    return localStorage.getItem(DEMO_TOKEN_KEY);
  }
  const token = localStorage.getItem(REAL_TOKEN_KEY) || localStorage.getItem('techstore_auth_token');
  if (token && (token.startsWith('mock-token-') || token.startsWith('demo-token-'))) {
    localStorage.removeItem(REAL_TOKEN_KEY);
    localStorage.removeItem('techstore_auth_token');
    return null;
  }
  return token;
};

export const getStoredUser = (): User | null => {
  if (isDemoAuthMode()) {
    const data = localStorage.getItem(DEMO_USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as User;
    } catch {
      return null;
    }
  }
  const data = localStorage.getItem(REAL_USER_KEY) || localStorage.getItem('techstore_auth_user');
  if (!data) return null;
  try {
    const user = JSON.parse(data) as User;
    if ((user as any).is_demo) {
      localStorage.removeItem(REAL_USER_KEY);
      localStorage.removeItem('techstore_auth_user');
      return null;
    }
    return user;
  } catch {
    return null;
  }
};

export const storeSession = (token: string, user: User) => {
  if (isDemoAuthMode()) {
    localStorage.setItem(DEMO_TOKEN_KEY, token);
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify({ ...user, is_demo: true }));
  } else {
    if (token.startsWith('mock-token-') || token.startsWith('demo-token-') || (user as any).is_demo) {
      console.warn('[TechnikWelt Auth] Refusing to store mock token or demo user in production session.');
      return;
    }
    localStorage.setItem(REAL_TOKEN_KEY, token);
    localStorage.setItem(REAL_USER_KEY, JSON.stringify(user));
  }
};

export const clearSession = () => {
  if (isDemoAuthMode()) {
    localStorage.removeItem(DEMO_TOKEN_KEY);
    localStorage.removeItem(DEMO_USER_KEY);
  } else {
    localStorage.removeItem(REAL_TOKEN_KEY);
    localStorage.removeItem(REAL_USER_KEY);
    localStorage.removeItem('techstore_auth_token');
    localStorage.removeItem('techstore_auth_user');
  }
};

export const sendOtp = async (email: string, language?: Language): Promise<SendOtpResult> => {
  const cleanEmail = email.toLowerCase().trim();

  if (isDemoAuthMode()) {
    const mockOtp = `${Math.floor(100000 + Math.random() * 900000)}`;
    demoOtpMap.set(cleanEmail, mockOtp);
    return {
      success: true,
      message: 'Demo-Modus: Einmal-Code generiert.',
      devCode: mockOtp,
    };
  }

  try {
    const res = await fetch(`${API_BASE}/auth/send-otp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.success) {
      return {
        success: true,
        message: data.message || 'Bestätigungscode versendet.',
        devCode: isDemoAuthMode() ? data.dev_code : undefined,
      };
    }

    if (res.status === 429) {
      return {
        success: false,
        error: data?.error || 'Bitte warten Sie kurz, bevor Sie einen neuen Code anfordern.',
        cooldownSeconds: data?.cooldown_seconds || 60,
      };
    }

    return {
      success: false,
      error: data?.error || data?.email?.[0] || 'Fehler beim Versenden des Codes.',
    };
  } catch (networkError) {
    console.warn('[TechnikWelt Auth] Backend nicht erreichbar:', networkError);
    return {
      success: false,
      error: getServiceUnavailableError(language),
    };
  }
};

export const verifyOtp = async (
  email: string,
  otp: string,
  firstName: string = '',
  lastName: string = '',
  language: 'de' | 'en' | 'fr' | 'es' = 'de'
): Promise<VerifyOtpResult> => {
  const cleanEmail = email.toLowerCase().trim();
  const cleanOtp = otp.trim();

  if (isDemoAuthMode()) {
    const expected = demoOtpMap.get(cleanEmail);
    if (expected && expected === cleanOtp) {
      const demoUser: User = {
        id: Math.floor(Math.random() * 1000),
        email: cleanEmail,
        first_name: firstName || 'Demo-Kunde',
        last_name: lastName || '',
        full_name: `${firstName} ${lastName}`.trim() || cleanEmail,
        language,
        city: 'Berlin',
        country: 'DE',
        created_at: new Date().toISOString(),
      };
      const demoToken = `demo-token-${Date.now()}`;
      storeSession(demoToken, demoUser);
      return {
        success: true,
        user: demoUser,
        token: demoToken,
        isNewUser: true,
      };
    }
    return {
      success: false,
      error: getTranslation('authErrorInvalidCode', language),
    };
  }

  try {
    const res = await fetch(`${API_BASE}/auth/verify-otp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        otp: cleanOtp,
        first_name: firstName,
        last_name: lastName,
        language,
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.success) {
      const token = data.token;
      const user = data.user;
      storeSession(token, user);
      return {
        success: true,
        user,
        token,
        isNewUser: data.is_new_user,
      };
    }

    return {
      success: false,
      error: data?.error || getTranslation('authErrorInvalidCode', language),
    };
  } catch (networkError) {
    console.warn('[TechnikWelt Auth] Backend nicht erreichbar bei OTP-Verifizierung:', networkError);
    return {
      success: false,
      error: getServiceUnavailableError(language),
    };
  }
};

export const fetchCurrentUser = async (): Promise<User | null> => {
  if (isDemoAuthMode()) {
    return getStoredUser();
  }

  const token = getStoredToken();
  if (!token) return null;

  if (token.startsWith('mock-token-') || token.startsWith('demo-token-')) {
    clearSession();
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/me/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const user = await res.json();
      localStorage.setItem(REAL_USER_KEY, JSON.stringify(user));
      return user;
    }
    clearSession();
    return null;
  } catch {
    const cached = getStoredUser();
    if (cached && !(cached as any).is_demo) {
      return cached;
    }
    return null;
  }
};

export const updateProfile = async (data: Partial<User>): Promise<User | null> => {
  if (isDemoAuthMode()) {
    const user = getStoredUser();
    if (user) {
      const updated = { ...user, ...data };
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(updated));
      return updated;
    }
    return null;
  }

  const token = getStoredToken();
  if (!token || token.startsWith('mock-token-') || token.startsWith('demo-token-')) {
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/me/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const user = await res.json();
      localStorage.setItem(REAL_USER_KEY, JSON.stringify(user));
      return user;
    }
    return null;
  } catch {
    return null;
  }
};

export const logoutUser = async (): Promise<void> => {
  if (isDemoAuthMode()) {
    clearSession();
    return;
  }

  const token = getStoredToken();
  if (token && !token.startsWith('mock-token-') && !token.startsWith('demo-token-')) {
    try {
      await fetch(`${API_BASE}/auth/logout/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {}
  }
  clearSession();
};
