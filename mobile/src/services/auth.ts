import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const mobileApi = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Token storage in Expo SecureStore (hardware-backed on iOS/Android)
const TOKEN_KEY = 'pulmovault_access_token';

export async function storeToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// Attach token to requests
mobileApi.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Biometric authentication gate — wraps any sensitive action.
 * Uses device fingerprint/face recognition via expo-local-authentication.
 * Returns true if authenticated, false if cancelled/failed.
 */
export async function requireBiometric(
  promptMessage = 'Authenticate to access patient records'
): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return true; // Fall through if no biometric hardware

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!isEnrolled) return true; // Fall through if not set up

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancel',
    fallbackLabel: 'Use PIN',
    disableDeviceFallback: false,
  });

  return result.success;
}

export async function login(email: string, password: string) {
  const { data } = await mobileApi.post<{ accessToken: string; role: string }>('/auth/login', {
    email,
    password,
  });
  await storeToken(data.accessToken);
  return data;
}

export async function logout() {
  try { await mobileApi.post('/auth/logout'); } catch {}
  await clearToken();
}

export const patientMobileApi = {
  list: (params?: Record<string, unknown>) => mobileApi.get('/patients', { params }),
  get: (id: string) => mobileApi.get(`/patients/${id}`),
  search: (q: string) => mobileApi.get('/patients/search', { params: { q } }),
  create: (data: unknown) => mobileApi.post('/patients', data),
};

export const sessionMobileApi = {
  list: (params?: Record<string, unknown>) => mobileApi.get('/sessions', { params }),
  get: (id: string) => mobileApi.get(`/sessions/${id}`),
  create: (data: unknown) => mobileApi.post('/sessions', data),
  sign: (id: string, data: unknown) => mobileApi.post(`/sessions/${id}/sign`, data),
};
