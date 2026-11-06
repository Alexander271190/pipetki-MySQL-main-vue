import { apiRequest, getAuthToken } from './client';

export interface HelpSection {
  slug: string;
  title: string;
  filePath?: string | null;
  enabled: boolean;
  sortOrder?: number;
  requiredPermissions?: string[];
}

export const getHelpSections = () => apiRequest<HelpSection[]>('/help');
export const getVisibleHelp = () => apiRequest<HelpSection[]>('/help/visible');
export const deleteHelpSection = (slug: string) => apiRequest('/help/' + slug, 'DELETE');
export const resetHelpToFactory = () => apiRequest('/help/reset', 'POST', {});

export async function uploadHelpFile(formData: FormData): Promise<unknown> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch('/api/help/upload', { method: 'POST', headers, body: formData });
  if (!res.ok) {
    let msg = 'Ошибка загрузки';
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}
