import { apiRequest } from './client';
import type { User, LoginResponse } from '@/types';

export function login(login: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', 'POST', { login, password });
}

export function verify(): Promise<{ user: User }> {
  return apiRequest<{ user: User }>('/auth/verify');
}

export function changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<{ token?: string }> {
  return apiRequest<{ token?: string }>('/auth/change-password', 'POST', { currentPassword, newPassword, confirmPassword });
}

export function setupPassword(newPassword: string, confirmPassword: string): Promise<{ token?: string }> {
  return apiRequest<{ token?: string }>('/auth/setup-password', 'POST', { newPassword, confirmPassword });
}

export function impersonate(userId: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(`/auth/impersonate/${userId}`, 'POST', {});
}

export function stopImpersonate(): Promise<{ message?: string; forceLogout?: boolean }> {
  return apiRequest<{ message?: string; forceLogout?: boolean }>('/auth/stop-impersonate', 'POST', {});
}
