import { apiRequest } from './client';
import type { Pipette, Status } from '@/types';

export interface Counters {
  ok: number;
  warn: number;
  danger: number;
  total: number;
  sent?: number;
  wip?: number;
  fail?: number;
  unknownDate?: number;
  inactive?: number;
}

export interface PagedResponse {
  items: Pipette[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counters: Counters;
}

export interface StatsResponse {
  counters: Counters;
  reminders: {
    danger: Pipette[];
    warn: Pipette[];
  };
}

export interface PagedParams {
  page?: number;
  limit?: number;
  sort?: string;
  dir?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
}

export function getPaged(params: PagedParams): Promise<PagedResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.sort) q.set('sort', params.sort);
  if (params.dir) q.set('dir', params.dir);
  if (params.search) q.set('search', params.search);
  if (params.filters && Object.keys(params.filters).length > 0) {
    q.set('filters', JSON.stringify(params.filters));
  }
  return apiRequest<PagedResponse>(`/pipettes/paged?${q.toString()}`);
}

export function getStats(): Promise<StatsResponse> {
  return apiRequest<StatsResponse>('/pipettes/stats');
}

export function getIdsForExport(params: Omit<PagedParams, 'page' | 'limit'>): Promise<{ ids: string[] }> {
  const q = new URLSearchParams();
  if (params.sort) q.set('sort', params.sort);
  if (params.dir) q.set('dir', params.dir);
  if (params.search) q.set('search', params.search);
  if (params.filters && Object.keys(params.filters).length > 0) {
    q.set('filters', JSON.stringify(params.filters));
  }
  return apiRequest<{ ids: string[] }>(`/pipettes/ids?${q.toString()}`);
}

export function getNextId(type: string): Promise<{ nextId: string }> {
  return apiRequest<{ nextId: string }>(`/pipettes/next-id?type=${encodeURIComponent(type)}`);
}

export function getById(id: string): Promise<Pipette> {
  return apiRequest<Pipette>(`/pipettes/${encodeURIComponent(id)}`);
}

export function getByIds(ids: string[]): Promise<{ items: Pipette[] }> {
  return apiRequest<{ items: Pipette[] }>('/pipettes/batch', 'POST', { ids });
}

// CRUD
export function createPipette(payload: Record<string, unknown>): Promise<Pipette> {
  return apiRequest<Pipette>('/pipettes', 'POST', payload);
}
export function updatePipette(id: string, payload: Record<string, unknown>): Promise<Pipette> {
  return apiRequest<Pipette>(`/pipettes/${encodeURIComponent(id)}`, 'PUT', payload);
}
export function deletePipette(id: string) {
  return apiRequest(`/pipettes/${encodeURIComponent(id)}`, 'DELETE');
}
export function cancelSend(id: string) {
  return apiRequest(`/pipettes/${encodeURIComponent(id)}/cancel-send`, 'POST', {});
}

// Блокировки
export interface LockInfo {
  locked: boolean;
  mine?: boolean;
  lockedBy?: string;
  lockedByPosition?: string;
  pipetteId?: string;
}
export function getLock(id: string): Promise<LockInfo> {
  return apiRequest<LockInfo>(`/pipettes/${encodeURIComponent(id)}/lock`);
}
export function setLock(id: string) {
  return apiRequest(`/pipettes/${encodeURIComponent(id)}/lock`, 'POST', {});
}
export function releaseLock(id: string, force = false) {
  const suffix = force ? '?force=true' : '';
  return apiRequest(`/pipettes/${encodeURIComponent(id)}/lock${suffix}`, 'DELETE');
}

// Передача
export function transferPipette(id: string, department: string, responsible: string) {
  return apiRequest(`/pipettes/${encodeURIComponent(id)}/transfer`, 'POST', { department, responsible });
}

// История
export interface CalibrationRecord {
  id: number;
  date: string;
  cert?: string;
  result: 'pass' | 'fail' | 'wip';
  org?: string;
  note?: string;
}
export function getCalibrationHistory(id: string): Promise<CalibrationRecord[]> {
  return apiRequest<CalibrationRecord[]>(`/pipettes/${encodeURIComponent(id)}/calibration`);
}
export function addCalibration(id: string, payload: { date: string; cert: string; result: string; org: string; note: string }) {
  return apiRequest(`/pipettes/${encodeURIComponent(id)}/calibration`, 'POST', payload);
}

// Черновик
export interface DraftData {
  data: Record<string, string>;
  userFullName: string;
  isMine: boolean;
  updatedAt: string;
}

export interface GetByIdResponse extends Pipette {
  draft?: DraftData | null;
}

export function getDraft(id: string): Promise<{ draft: DraftData | null }> {
  return apiRequest<{ draft: DraftData | null }>(`/pipettes/${encodeURIComponent(id)}/draft`);
}

export function saveDraft(id: string, data: Record<string, string>): Promise<void> {
  return apiRequest<void>(`/pipettes/${encodeURIComponent(id)}/draft`, 'PUT', data);
}

export function deleteDraft(id: string): Promise<void> {
  return apiRequest<void>(`/pipettes/${encodeURIComponent(id)}/draft`, 'DELETE');
}

export function resetBarcode(id: string) {
  return apiRequest(`/barcodes/reset`, 'POST', { id });
}

export type { Status };

