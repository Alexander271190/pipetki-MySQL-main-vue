import type { Pipette } from '@/types';
import { useSettingsStore } from '@/stores/settings';

// Возвращает HTML для компактной идентификации прибора (для модалок)
export function getDeviceIdentityHtml(p: Pipette): string {
  const settings = useSettingsStore();
  const fields = settings.bulkIdentityFields || ['id', 'model', 'serial', 'department'];

  const main: string[] = [];
  const sub: string[] = [];

  if (fields.includes('id'))          main.push(`<strong>${escapeHtml(p.id)}</strong>`);
  if (fields.includes('model'))       main.push(escapeHtml(p.model));
  if (fields.includes('serial') && p.serial) sub.push(`S/N: ${escapeHtml(p.serial)}`);
  if (fields.includes('inventorynumber') && p.inventorynumber) sub.push(`Инв: ${escapeHtml(String(p.inventorynumber))}`);
  if (fields.includes('department') && p.department) sub.push(escapeHtml(p.department));
  if (fields.includes('responsible') && p.responsible) sub.push(escapeHtml(p.responsible));

  let html = main.length ? main.join(' — ') : `<strong>${escapeHtml(p.id)}</strong>`;
  if (sub.length > 0) html += `<br><small class="text-muted-sm">${sub.join(' · ')}</small>`;
  return html;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));
}
