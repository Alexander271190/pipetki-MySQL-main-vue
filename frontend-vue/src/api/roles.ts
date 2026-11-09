import { apiRequest } from './client';

export interface Role {
  id: number;
  name: string;
  value: string;
  isAdmin: boolean;
  isSystem: boolean;
  permissions: string[];
}

export const getRoles = () => apiRequest<Role[]>('/roles');
export const createRole = (payload: { name: string; permissions: string[]; isAdmin: boolean }) =>
  apiRequest<Role>('/roles', 'POST', payload);
export const updateRole = (id: number, payload: { name: string; permissions: string[]; isAdmin: boolean }) =>
  apiRequest<Role>('/roles/' + id, 'PUT', payload);
export const deleteRole = (id: number) => apiRequest('/roles/' + id, 'DELETE');

const ROLES_CACHE_TTL = 60_000;
let _cachedRoles: Role[] | null = null;
let _cachedRolesTime = 0;

export async function getCachedRoles(force = false): Promise<Role[]> {
  const now = Date.now();
  if (!force && _cachedRoles && now - _cachedRolesTime < ROLES_CACHE_TTL) {
    return _cachedRoles;
  }
  try {
    _cachedRoles = await getRoles();
    _cachedRolesTime = now;
    return _cachedRoles;
  } catch {
    return _cachedRoles || [];
  }
}

export function invalidateRolesCache() {
  _cachedRoles = null;
  _cachedRolesTime = 0;
}
