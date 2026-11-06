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
