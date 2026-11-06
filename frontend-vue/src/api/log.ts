import { apiRequest } from './client';

export interface AuditItem {
  timestamp: string;
  pipette_id?: string;
  model?: string;
  user_full_name?: string;
  action: string;
  details?: string;
  category?: string;
}

export interface AuditListResponse {
  items: AuditItem[];
}

export interface EquipmentAuditResponse {
  equipment?: { id: string; model: string };
  items: AuditItem[];
}

export interface ErrorItem {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  source?: string;
  user_full_name?: string;
  message: string;
  stack?: string;
  url?: string;
  method?: string;
}

export interface ErrorsListResponse {
  items: ErrorItem[];
}

export const getAuditLog = (limit = 500) =>
  apiRequest<AuditListResponse>(`/pipettes/audit?limit=${limit}`);

export const getEquipmentAudit = (id: string, limit = 500) =>
  apiRequest<EquipmentAuditResponse>(`/pipettes/${encodeURIComponent(id)}/audit?limit=${limit}`);

export const getErrorsLog = (limit = 500) =>
  apiRequest<ErrorsListResponse>(`/log/errors?limit=${limit}`);

export const clearErrorsLog = () =>
  apiRequest('/log/errors', 'DELETE');
