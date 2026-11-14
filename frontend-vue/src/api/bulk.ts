import { apiRequest } from './client';

export interface BulkLockResponse {
  busy?: { id: string; lockedBy: string }[];
  notFound?: string[];
}

export interface BulkSendResponse {
  successful: number;
  skipped: number;
  skippedReplacements?: unknown[];
}

export interface BulkReturnResponse {
  message?: string;
  missingReplacements?: unknown[];
}

export interface BulkCreateResponse {
  created: number;
  ids?: string[];
}

export function bulkLock(ids: string[]): Promise<BulkLockResponse> {
  return apiRequest<BulkLockResponse>('/pipettes/bulk-lock', 'POST', { ids });
}

export function bulkUnlock(ids: string[]): Promise<void> {
  return apiRequest<void>('/pipettes/bulk-unlock', 'POST', { ids });
}

export function bulkSend(payload: {
  ids: string[];
  sentDate: string;
  note: string;
  replacements: Record<string, string>;
}): Promise<BulkSendResponse> {
  return apiRequest<BulkSendResponse>('/pipettes/bulk-send', 'POST', payload);
}

export function bulkReturn(payload: {
  items: { id: string; cert: string; result: string }[];
  date: string;
  org: string;
  note: string;
  returnReplacements: string[];
}): Promise<BulkReturnResponse> {
  return apiRequest<BulkReturnResponse>('/pipettes/bulk-return', 'POST', payload);
}

export function bulkCreate(rows: Record<string, string>[]): Promise<BulkCreateResponse> {
  return apiRequest<BulkCreateResponse>('/pipettes/bulk-create', 'POST', { rows });
}

export function bulkChangeResponsible(ids: string[], newResponsible: string): Promise<{ successful: number; skipped: number }> {
  return apiRequest<{ successful: number; skipped: number }>('/pipettes/bulk-change-responsible', 'POST', {
    ids, newResponsible,
  });
}

export interface ReplacementOption {
  id: string;
  model: string;
  manufacturer?: string;
  last_calibration?: string;
}

export interface BulkDeleteResponse {
  message: string;
  successful: number;
  successfulIds: string[];
  skipped: number;
  skippedDetails: { id: string; reason: string }[];
  notFound: number;
  notFoundIds: string[];
}

export function bulkDelete(ids: string[]): Promise<BulkDeleteResponse> {
  return apiRequest<BulkDeleteResponse>('/pipettes/bulk-delete', 'POST', { ids });
}

export function availableForReplacementBatch(items: { id: string; type: string; department: string }[]): Promise<Record<string, ReplacementOption[]>> {
  return apiRequest<Record<string, ReplacementOption[]>>('/pipettes/available-for-replacement-batch', 'POST', { items });
}
