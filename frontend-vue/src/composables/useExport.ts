import { usePipettesStore } from '@/stores/pipettes';
import { useSettingsStore } from '@/stores/settings';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { getActiveExportFields, getExportField } from '@/utils/exportFields';
import { buildHeaderHtml } from '@/utils/header';
import { exportRegistryToXlsx } from '@/api/export';
import { formatDate } from '@/utils/format';
import { calcStatus, getNextDate, daysLeft } from '@/utils/status';
import { esc } from '@/utils/string';
import { STATUS_LABELS } from '@/constants';
import { apiRequest } from '@/api/client';
import type { Pipette } from '@/types';

export function useExport() {
  const pip = usePipettesStore();
  const settings = useSettingsStore();
  const auth = useAuthStore();
  const toast = useToastStore();

  async function loadAllForExport(): Promise<Pipette[]> {
    const params = new URLSearchParams();
    params.set('sort', pip.sortField);
    params.set('dir', pip.sortDir > 0 ? 'asc' : 'desc');
    if (pip.search) params.set('search', pip.search);

    const filters: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(pip.filterState || {})) {
      if (v === undefined || v === null || v === '') continue;
      if (typeof v === 'object' && v !== null && 'period' in v && (v as { period: string }).period === '') continue;
      filters[k] = v;
    }
    if (Object.keys(filters).length > 0) params.set('filters', JSON.stringify(filters));

    const res = await apiRequest<{ items: Pipette[]; truncated?: boolean; limit?: number; total?: number }>(`/pipettes/all?${params.toString()}`);
    if (res.truncated) toast.warn(`Показаны первые ${res.limit} из ${res.total}`);
    return Array.isArray(res.items) ? res.items : [];
  }

  async function exportToXlsx() {
    if (settings.printDocs?.export === false) {
      toast.error('Печать реестра отключена администратором');
      return;
    }
    const data = await loadAllForExport();
    if (data.length === 0) { toast.error('Нет данных'); return; }

    const fields = getActiveExportFields(settings.printDocs?.exportFields);
    const headers = fields.map(f => getExportField(f)?.label || f);
    const rows = data.map(p => {
      const obj: Record<string, string> = {};
      fields.forEach((f, i) => {
        const def = getExportField(f);
        obj[headers[i]] = def ? def.get(p) : '';
      });
      return obj;
    });

    toast.success('Формирование файла…');
    try {
      await exportRegistryToXlsx({ headers, rows, fields });
      toast.success(`Напечатано: ${data.length} записей`);
    } catch (e) {
      if (e instanceof Error && e.message !== 'Сессия истекла') toast.error(e.message);
    }
  }

  async function exportToPDF() {
    if (settings.printDocs?.export === false) {
      toast.error('Печать реестра отключена администратором');
      return;
    }
    const data = await loadAllForExport();
    if (data.length === 0) { toast.error('Нет данных'); return; }

    const fields = getActiveExportFields(settings.printDocs?.exportFields);
    const today = new Date().toLocaleDateString('ru-RU');
    const user = auth.user?.fullName || '';
    const userPosition = auth.user?.position || '';

    const headerCells = fields.map(f => `<th>${esc(getExportField(f)?.label || f)}</th>`).join('');

    const rows = data.map(p => {
      const cells = fields.map(f => {
        const def = getExportField(f);
        const val = def ? def.get(p) : '';
        if (f === 'status') {
          const st = calcStatus(p);
          return `<td><span class="status-${st}">${esc(val)}</span></td>`;
        }
        if (f === 'nextCalibration') {
          const st = calcStatus(p);
          if (st === 'sent') return `<td>На поверке<br><small>с ${formatDate(p.sent_for_calibration)}</small></td>`;
          if (st === 'unknown') return `<td>—<br><small>дата не задана</small></td>`;
          const dl = daysLeft(p);
          const dlText = st === 'inactive' ? '' : (dl < 0 ? `просрочка ${Math.abs(dl)} дн.` : `${dl} дн.`);
          return `<td>${esc(val)}${dlText ? '<br><small>' + dlText + '</small>' : ''}</td>`;
        }
        return `<td>${esc(val)}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const win = window.open('', '_blank');
    if (!win) { toast.error('Разрешите всплывающие окна'); return; }

    win.document.write(`<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">
<title>Реестр</title>
<style>
@page { size: A4 landscape; margin: 12mm 8mm; }
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; color: #1a1a2e; margin: 0; }
h1 { font-size: 14pt; margin: 0 0 4px; text-align: center; }
table { width: 100%; border-collapse: collapse; font-size: 8pt; border: 1.5px solid #1e293b; }
th { background: #1e293b; color: #fff; padding: 6px 5px; text-align: left; font-size: 7.5pt; text-transform: uppercase; border: 1px solid #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
td { padding: 5px; border: 0.5px solid #94a3b8; vertical-align: top; }
tbody tr:nth-child(even) td { background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
small { color: #94a3b8; font-size: 7pt; display: block; }
.status-ok { color: #16a34a; font-weight: 600; }
.status-warn { color: #ca8a04; font-weight: 600; }
.status-danger { color: #dc2626; font-weight: 700; }
.status-fail { color: #991b1b; font-weight: 700; }
.status-inactive { color: #94a3b8; }
.status-sent { color: #0ea5e9; font-weight: 600; }
.status-wip { color: #ca8a04; font-weight: 600; }
.footer { margin-top: 12px; font-size: 8pt; display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 6px; }
tr { page-break-inside: avoid; }
thead { display: table-header-group; }
</style></head><body>
${buildHeaderHtml(settings.printDocs)}
<h1>Реестр оборудования — КГБУЗ «Краевая клиническая больница», КДЛ</h1>
<table><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>
<div class="footer">
  <div>Документ сформировал: <b>${esc(userPosition)}, ${esc(user)}</b><br>Дата: <b>${today}</b> · Записей: <b>${data.length}</b></div>
  <div>Подпись: _______________</div>
</div>
</body></html>`);
    win.document.close();
    win.document.title = 'Реестр оборудования';
    win.focus();
    setTimeout(() => win.print(), 300);
    toast.success(`PDF готов: ${data.length} записей`);
  }

  return { exportToXlsx, exportToPDF, loadAllForExport };
}
