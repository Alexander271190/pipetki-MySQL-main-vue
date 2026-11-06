<template>
  <AppModal :visible="ui.activeModal === 'historyExport'" @close="close">
    <h2><i class="fa-solid fa-print"></i> Печать истории поверок</h2>
    <p v-if="pipette" style="color:#64748b;margin-bottom:16px;font-size:.9rem;">
      Оборудование: <strong>{{ pipette.id }}</strong> — {{ pipette.model }}
    </p>

    <div class="form-row">
      <div class="form-group">
        <label>С даты</label>
        <input v-model="from" type="date" />
      </div>
      <div class="form-group">
        <label>По дату</label>
        <input v-model="to" type="date" />
      </div>
    </div>

    <div style="background:#f1f5f9;border-radius:8px;padding:10px 14px;font-size:.82rem;color:#475569;">
      Оставьте поля пустыми — выгрузится вся история.
    </div>

    <div v-if="error" class="auth-error" style="visibility:visible;opacity:1;">{{ error }}</div>

    <div class="form-actions">
      <button type="button" class="btn btn-secondary" @click="close">Отмена</button>
      <button type="button" class="btn btn-success" :disabled="saving" @click="onExcel">
        <i class="fa-solid" :class="saving === 'xlsx' ? 'fa-spinner fa-spin' : 'fa-file-excel'"></i> Excel
      </button>
      <button type="button" class="btn btn-info" :disabled="saving" @click="onPDF">
        <i class="fa-solid" :class="saving === 'pdf' ? 'fa-spinner fa-spin' : 'fa-print'"></i> PDF
      </button>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { usePipettesStore } from '@/stores/pipettes';
import { useSettingsStore } from '@/stores/settings';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { formatDate } from '@/utils/format';
import { esc } from '@/utils/string';
import { buildHeaderHtml } from '@/utils/header';
import { exportHistoryToXlsx } from '@/api/export';
import * as api from '@/api/pipettes';
import type { Pipette } from '@/types';
import type { CalibrationRecord } from '@/api/pipettes';

const ui = useUiStore();
const pip = usePipettesStore();
const settings = useSettingsStore();
const auth = useAuthStore();
const toast = useToastStore();

const pipette = ref<Pipette | null>(null);
const from = ref('');
const to = ref('');
const error = ref('');
const saving = ref<'' | 'xlsx' | 'pdf'>('');

watch(() => ui.activeModal, (v) => {
  if (v !== 'historyExport') return;
  const id = ui.modalData as string;
  pipette.value = pip.items.find(x => x.id === id) || null;
  from.value = '';
  to.value = '';
  error.value = '';
});

async function loadHistory(): Promise<CalibrationRecord[]> {
  if (!pipette.value) return [];
  let history = await api.getCalibrationHistory(pipette.value.id);
  if (from.value) history = history.filter(h => String(h.date).slice(0, 10) >= from.value);
  if (to.value)   history = history.filter(h => String(h.date).slice(0, 10) <= to.value);
  history.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return history;
}

const HISTORY_LABELS: Record<string, string> = {
  date: 'Дата', cert: 'Свидетельство', result: 'Результат', org: 'Организация', note: 'Примечание',
};

async function onExcel() {
  error.value = '';
  if (!pipette.value) return;
  const history = await loadHistory();
  if (history.length === 0) { error.value = 'Нет записей за период'; return; }

  const fields = (settings.printDocs?.historyFields?.length ? settings.printDocs.historyFields : ['date','cert','result','org','note']);
  const headers = fields.map(f => HISTORY_LABELS[f] || f);
  const rows = history.map(h => {
    const obj: Record<string, string> = {};
    for (const f of fields) {
      if (f === 'date') obj[HISTORY_LABELS.date] = h.date ? formatDate(h.date) : '';
      else if (f === 'cert') obj[HISTORY_LABELS.cert] = h.cert || '';
      else if (f === 'result') obj[HISTORY_LABELS.result] = h.result === 'pass' ? 'Годен' : h.result === 'fail' ? 'Брак' : 'В процессе';
      else if (f === 'org') obj[HISTORY_LABELS.org] = h.org || '';
      else if (f === 'note') obj[HISTORY_LABELS.note] = h.note || '';
    }
    return obj;
  });

  saving.value = 'xlsx';
  try {
    await exportHistoryToXlsx({
      meta: {
        title: 'История поверок оборудования',
        equipmentId: pipette.value.id,
        model: pipette.value.model,
        manufacturer: pipette.value.manufacturer || '',
        serial: pipette.value.serial || '',
        department: pipette.value.department || '',
        period: (from.value || to.value) ? `${from.value || '…'} — ${to.value || '…'}` : 'вся история',
        recordCount: history.length,
        user: auth.user?.fullName || '',
        userPosition: auth.user?.position || '',
      },
      headers,
      rows,
      equipmentId: pipette.value.id,
    });
    toast.success(`Напечатано: ${history.length}`);
    ui.close();
  } catch (e) {
    if (e instanceof Error && e.message !== 'Сессия истекла') error.value = e.message;
  } finally {
    saving.value = '';
  }
}

async function onPDF() {
  error.value = '';
  if (!pipette.value) return;
  const history = await loadHistory();
  if (history.length === 0) { error.value = 'Нет записей за период'; return; }

  const fields = (settings.printDocs?.historyFields?.length ? settings.printDocs.historyFields : ['date','cert','result','org','note']);
  const headerCells = fields.map(f => `<th>${esc(HISTORY_LABELS[f] || f)}</th>`).join('');

  const rows = history.map((h, i) => {
    const cells = fields.map(f => {
      if (f === 'date') return `<td>${esc(formatDate(h.date))}</td>`;
      if (f === 'cert') return `<td>${esc(h.cert || '—')}</td>`;
      if (f === 'result') return `<td>${h.result === 'pass' ? 'Годен' : h.result === 'fail' ? 'Брак' : 'В процессе'}</td>`;
      if (f === 'org') return `<td>${esc(h.org || '—')}</td>`;
      if (f === 'note') return `<td>${esc(h.note || '')}</td>`;
      return '<td></td>';
    }).join('');
    return `<tr><td style="text-align:center;">${i + 1}</td>${cells}</tr>`;
  }).join('');

  const user = auth.user?.fullName || '';
  const userPosition = auth.user?.position || '';
  const today = new Date().toLocaleDateString('ru-RU');
  const periodText = (from.value || to.value) ? `Период: ${from.value || '…'} — ${to.value || '…'}` : 'Период: вся история';

  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>История поверок — ${esc(pipette.value.id)}</title>
<style>
@page { size: A4 portrait; margin: 12mm 10mm; }
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1a1a2e; margin: 0; }
h1 { font-size: 14pt; margin: 0 0 4px; text-align: center; }
.meta { font-size: 9pt; color: #64748b; margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
.info { padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 9pt; margin-bottom: 12px; }
.info b { color: #1e293b; }
table { width: 100%; border-collapse: collapse; font-size: 9pt; border: 1.5px solid #1e293b; }
th { background: #1e293b; color: #fff; padding: 7px 6px; text-align: left; font-size: 8pt; text-transform: uppercase; border: 1px solid #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
td { padding: 6px; border: 0.5px solid #94a3b8; vertical-align: top; }
tbody tr:nth-child(even) td { background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.footer { margin-top: 20px; font-size: 8pt; display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 6px; }
</style></head><body>
${buildHeaderHtml(settings.printDocs)}
<h1>История поверок оборудования</h1>
<div class="meta">Дата формирования: <b>${today}</b></div>
<div class="info">
  <div><b>ID:</b> ${esc(pipette.value.id)}</div>
  <div><b>Модель:</b> ${esc(pipette.value.model)}${pipette.value.manufacturer ? ' (' + esc(pipette.value.manufacturer) + ')' : ''}</div>
  <div><b>Серийный номер:</b> ${esc(pipette.value.serial || '—')}</div>
  <div><b>Отдел:</b> ${esc(pipette.value.department || '—')}</div>
  <div><b>${periodText}</b></div>
  <div><b>Записей:</b> ${history.length}</div>
</div>
<table><thead><tr><th style="width:5%;text-align:center;">№</th>${headerCells}</tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer"><div>Сформировал: <b>${esc(userPosition)}, ${esc(user)}</b></div><div>Подпись: _______________</div></div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) { URL.revokeObjectURL(url); error.value = 'Разрешите всплывающие окна'; return; }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  ui.close();
  toast.success(`PDF готов: ${history.length}`);
}

function close() { ui.close(); }
</script>
