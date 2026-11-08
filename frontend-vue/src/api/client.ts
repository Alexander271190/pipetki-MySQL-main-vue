import { ApiError } from '@/types/api';
import type { ApiErrorBody } from '@/types/api';
import { buildErrorMessage } from '@/utils/errorHints';

const API_URL = '/api';
const SESSION_KEY = 'pipette_session';

let authToken: string | null = null;

let _lastPermsCheck = 0;
const PERMS_CHECK_INTERVAL = 60_000;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function loadTokenFromSession(): string | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.token) {
      authToken = data.token;
      return data.token;
    }
  } catch { /* ignore */ }
  return null;
}

// Хук для обработки 401 (перенаправление на логин)
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

// Хук для обработки 403 password_change_required
let onPasswordRequired: ((mode: 'setup' | 'change') => void) | null = null;
export function setPasswordRequiredHandler(fn: (mode: 'setup' | 'change') => void) {
  onPasswordRequired = fn;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: unknown
): Promise<T> {
 
  const now = Date.now();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!path.startsWith('/auth/') && now - _lastPermsCheck > PERMS_CHECK_INTERVAL) {
    _lastPermsCheck = now;
    void import('@/stores/auth')
      .then(({ useAuthStore }) => useAuthStore().refreshUser())
      .catch(() => {});
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const options: RequestInit = { method, headers };
  if (data !== undefined && data !== null) options.body = JSON.stringify(data);

  const response = await fetch(`${API_URL}${endpoint}`, options);

  // 401 — сессия истекла
  if (response.status === 401 && !endpoint.startsWith('/auth/login')) {
    sessionStorage.removeItem(SESSION_KEY);
    authToken = null;
    try {
      const { useToastStore } = await import('@/stores/toast');
      useToastStore().error('Сессия истекла, войдите заново');
    } catch { /* ignore */ }
    if (onUnauthorized) onUnauthorized();
    throw new ApiError('Сессия истекла, войдите заново', 401, 'unauthorized', {});
  }

  // 403 — требуется смена пароля
  if (response.status === 403 && !endpoint.startsWith('/auth/')) {
    let body: ApiErrorBody | null = null;
    try { body = await response.clone().json(); } catch { /* ignore */ }
    if (body?.code === 'password_change_required' && onPasswordRequired) {
      onPasswordRequired('change');
      throw new ApiError('Требуется смена пароля', 403, 'password_change_required', body);
    }
    if (body?.code === 'password_setup_required' && onPasswordRequired) {
      onPasswordRequired('setup');
      throw new ApiError('Требуется установка пароля', 403, 'password_setup_required', body);
    }
  }

  // 429 — слишком много запросов
  if (response.status === 429) {
    try {
      const { useToastStore } = await import('@/stores/toast');
      useToastStore().warn('Слишком много запросов. Подождите немного.');
    } catch { /* ignore */ }
    throw new ApiError('Слишком много запросов', 429, 'rate_limit', {});
  }

  let result: Record<string, unknown>;
  try {
    result = await response.json();
  } catch {
    result = { error: `Ошибка ${response.status}: сервер вернул некорректный ответ` };
  }

  if (!response.ok) {
    const message = buildErrorMessage(result, response.status);
    const error = new ApiError(
      message,
      response.status,
      (result.code as string) || `http_${response.status}`,
      result
    );
    throw error;
  }

  return result as T;
}
