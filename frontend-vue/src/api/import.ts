import { apiRequest } from './client';

export interface ImportResult {
  added: number;
  skipped: number;
  errors: number;
  skippedDetails?: unknown[];
  errorDetails?: unknown[];
}

export function importFile(base64: string, filename: string): Promise<ImportResult> {
  return apiRequest<ImportResult>('/import', 'POST', { file: base64, filename });
}
