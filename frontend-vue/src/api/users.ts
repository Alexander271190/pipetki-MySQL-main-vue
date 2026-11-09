import { apiRequest } from './client';

export interface ResponsibleUser {
  id?: string;
  fullName: string;
  department?: string;
  position?: string;
}

export interface FullUser {
  id: string;
  login: string;
  fullName: string;
  position: string;
  department?: string;
  role: string;
  roleName?: string;
  isAdmin?: boolean;
  onlyOwnDepartment?: boolean;
  isActing?: boolean;
  actingForId?: string | null;
  extraPermissions?: string[];
  viewTemplateId?: number | null;
}

export interface Preset {
  id: number;
  name: string;
  permissions: string[];
}

export interface CreateUserResponse {
  id: string;
  login: string;
  tempPassword: string;
}

export const getResponsibles = () => apiRequest<ResponsibleUser[]>('/users/responsibles');
export const getUsers = () => apiRequest<FullUser[]>('/users');
export const createUser = (payload: Record<string, unknown>) => apiRequest<CreateUserResponse>('/users', 'POST', payload);
export const updateUser = (id: string, payload: Record<string, unknown>) => apiRequest<FullUser>('/users/' + id, 'PUT', payload);
export const deleteUser = (id: string) => apiRequest('/users/' + id, 'DELETE');
export const resetUserPassword = (id: string) =>
  apiRequest<CreateUserResponse>('/users/' + id + '/reset-password', 'POST', {});
export const getActingTargets = () =>
  apiRequest<{ id: string; fullName: string; department?: string }[]>('/users/acting-targets');

// Пресеты
export const getPresets = () => apiRequest<Preset[]>('/users/presets');
export const createPreset = (name: string, permissions: string[]) =>
  apiRequest<Preset>('/users/presets', 'POST', { name, permissions });
export const deletePreset = (id: number) =>
  apiRequest('/users/presets/' + id, 'DELETE');

// ── Кеш пользователей (как в старом _cachedUsersList) ──
const USERS_CACHE_TTL = 30_000;
let _cachedUsers: FullUser[] | null = null;
let _cachedUsersTime = 0;

export async function getCachedUsers(force = false): Promise<FullUser[]> {
  const now = Date.now();
  if (!force && _cachedUsers && now - _cachedUsersTime < USERS_CACHE_TTL) {
    return _cachedUsers;
  }
  try {
    _cachedUsers = await getUsers();
    _cachedUsersTime = now;
    return _cachedUsers;
  } catch {
    return _cachedUsers || [];
  }
}

export function invalidateUsersCache() {
  _cachedUsers = null;
  _cachedUsersTime = 0;
}
