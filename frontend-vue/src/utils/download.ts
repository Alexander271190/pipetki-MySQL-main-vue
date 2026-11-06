import { getAuthToken } from '@/api/client';

export async function downloadFile(
  url: string,
  options: RequestInit = {},
  defaultFilename = 'download'
): Promise<boolean> {
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };
  const token = getAuthToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    sessionStorage.removeItem('pipette_session');
    window.location.href = '/login';
    throw new Error('Сессия истекла');
  }

  if (!response.ok) {
    let msg = `Ошибка ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) msg = String(body.error);
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  const disposition = response.headers.get('Content-Disposition');
  let filename = defaultFilename;
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match) filename = decodeURIComponent(match[1]);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
  return true;
}
