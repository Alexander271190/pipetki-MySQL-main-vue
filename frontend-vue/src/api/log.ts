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
  total?: number;
  counters?: Record<string, number>;
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
  total?: number;
  counters?: Record<string, number>;
}

export interface AuditParams {
  limit?: number;
  offset?: number;
  search?: string;
  category?: string;
  from?: string;
  to?: string;
}

export interface ErrorsParams {
  limit?: number;
  search?: string;
  level?: string;
  from?: string;
  to?: string;
}

// ── Аудит всех действий (глобальный) ──
export const getAuditLog = (params: AuditParams | number = 500) => {
  const p: AuditParams = typeof params === 'number' ? { limit: params } : params;
  const q = new URLSearchParams();
  q.set('limit', String(p.limit ?? 500));
  if (p.offset)   q.set('offset', String(p.offset));
  if (p.search)   q.set('search', p.search);
  if (p.category) q.set('category', p.category);
  if (p.from)     q.set('from', p.from);
  if (p.to)       q.set('to', p.to);
  return apiRequest<AuditListResponse>(`/pipettes/audit?${q.toString()}`);
};

// ── Аудит одного прибора (восстановлена) ──
export const getEquipmentAudit = (id: string, params: AuditParams | number = 500) => {
  const p: AuditParams = typeof params === 'number' ? { limit: params } : params;
  const q = new URLSearchParams();
  q.set('limit', String(p.limit ?? 500));
  if (p.search) q.set('search', p.search);
  if (p.from)   q.set('from', p.from);
  if (p.to)     q.set('to', p.to);
  return apiRequest<EquipmentAuditResponse>(
    `/pipettes/${encodeURIComponent(id)}/audit?${q.toString()}`
  );
};

// ── Журнал ошибок ──
export const getErrorsLog = (params: ErrorsParams | number = 500) => {
  const p: ErrorsParams = typeof params === 'number' ? { limit: params } : params;
  const q = new URLSearchParams();
  q.set('limit', String(p.limit ?? 500));
  if (p.search) q.set('search', p.search);
  if (p.level)  q.set('level', p.level);
  if (p.from)   q.set('from', p.from);
  if (p.to)     q.set('to', p.to);
  return apiRequest<ErrorsListResponse>(`/log/errors?${q.toString()}`);
};

export const clearErrorsLog = () =>
  apiRequest('/log/errors', 'DELETE');
