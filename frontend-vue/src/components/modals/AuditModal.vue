<template>
  <AppModal :visible="ui.activeModal === 'audit'" @close="close" modal-class="modal-lg">
    <h2><i class="fa-solid fa-clipboard-list"></i> Журнал действий</h2>

    <div class="audit-tabs">
      <button type="button" class="audit-tab-btn" :class="{ active: tab === 'actions' }" @click="tab = 'actions'">
        <i class="fa-solid fa-pen"></i> Действия
      </button>
      <button type="button" class="audit-tab-btn" :class="{ active: tab === 'errors' }" @click="tab = 'errors'">
        <i class="fa-solid fa-triangle-exclamation"></i> Ошибки
      </button>
    </div>

    <div v-if="tab === 'actions'">
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
        <input v-model="search" type="text" placeholder="Поиск по ID, модели, пользователю, деталям…"
          style="flex:1;min-width:200px;padding:8px 12px;border:1px solid var(--border-hard);border-radius:8px;font-size:13px;" />
        <select v-model="category" style="padding:8px;border:1px solid var(--border-hard);border-radius:8px;font-size:13px;">
          <option value="">Все категории</option>
          <option value="equipment">Оборудование</option>
          <option value="users">Пользователи</option>
          <option value="calibration">Поверки</option>
          <option value="barcode">Штрихкоды</option>
          <option value="settings">Настройки</option>
          <option value="locks">Блокировки</option>
          <option value="auth">Вход/выход</option>
          <option value="help">Справка</option>
        </select>
        <select v-model="period" @change="onPeriodChange" style="padding:8px;border:1px solid var(--border-hard);border-radius:8px;font-size:13px;">
          <option value="">Всё время</option>
          <option value="today">Сегодня</option>
          <option value="week">7 дней</option>
          <option value="month">30 дней</option>
          <option value="custom">Произвольный</option>
        </select>
        <button class="btn btn-info" @click="exportPDF"><i class="fa-solid fa-print"></i> PDF</button>
      </div>
      <div v-if="period === 'custom'" style="display:flex;gap:8px;margin-bottom:10px;">
        <input v-model="from" type="date" style="padding:6px;border:1px solid var(--border-hard);border-radius:8px;" />
        <span style="align-self:center;">—</span>
        <input v-model="to" type="date" style="padding:6px;border:1px solid var(--border-hard);border-radius:8px;" />
      </div>

      <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:10px;">
        Показано: {{ filtered.length }} из {{ cache.length }}
      </div>

      <div class="log-container" style="max-height:55vh;">
        <table class="log-table">
          <thead>
            <tr>
              <th style="width:140px;">Дата и время</th>
              <th style="width:90px;">Прибор</th>
              <th style="width:130px;">Кто</th>
              <th style="width:120px;">Действие</th>
              <th>Изменения</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" style="text-align:center;padding:20px;color:#94a3b8;">
                <i class="fa-solid fa-spinner fa-spin"></i> Загрузка…
              </td>
            </tr>
            <tr v-else-if="filtered.length === 0">
              <td colspan="5" style="text-align:center;padding:30px;color:#94a3b8;">
                📋 Записей нет
              </td>
            </tr>
            <tr v-for="(r, i) in filtered" :key="i">
              <td class="timestamp">{{ fmtDateTime(r.timestamp) }}</td>
              <td><strong>{{ r.pipette_id || '—' }}</strong><small v-if="r.model"><br>{{ r.model }}</small></td>
              <td>{{ r.user_full_name || '—' }}</td>
              <td :style="{ color: actionColor(r.action), fontWeight: 600 }">{{ r.action }}</td>
              <td style="font-size:.82rem;">{{ r.details || '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else>
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
        <input v-model="errSearch" type="text" placeholder="Поиск по тексту, URL, пользователю…"
          style="flex:1;min-width:200px;padding:8px 12px;border:1px solid var(--border-hard);border-radius:8px;font-size:13px;" />
        <select v-model="errLevel" style="padding:8px;border:1px solid var(--border-hard);border-radius:8px;font-size:13px;">
          <option value="">Все уровни</option>
          <option value="error">error</option>
          <option value="warn">warn</option>
        </select>
        <button class="btn btn-info" @click="exportErrorsPDF"><i class="fa-solid fa-print"></i> PDF</button>
        <button class="btn btn-danger" @click="clearErrors"><i class="fa-solid fa-trash"></i> Очистить</button>
      </div>
      <div class="log-container" style="max-height:55vh;">
        <table class="log-table">
          <thead>
            <tr>
              <th style="width:140px;">Дата</th>
              <th style="width:80px;">Уровень</th>
              <th style="width:120px;">Источник</th>
              <th style="width:150px;">Пользователь</th>
              <th>Сообщение</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loadingErrors">
              <td colspan="5" style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i></td>
            </tr>
            <tr v-else-if="errorsFiltered.length === 0">
              <td colspan="5" style="text-align:center;padding:30px;color:#94a3b8;">
                ✅ Ошибок нет
              </td>
            </tr>
            <tr v-for="(r, i) in errorsFiltered" :key="i">
              <td class="timestamp">{{ fmtDateTime(r.timestamp) }}</td>
              <td :style="{ color: r.level === 'error' ? '#dc2626' : '#d97706', fontWeight: 600, textTransform: 'uppercase' }">{{ r.level }}</td>
              <td>{{ r.source || '—' }}</td>
              <td>{{ r.user_full_name || '—' }}</td>
              <td style="font-size:.82rem;">
                {{ r.message }}
                <small v-if="r.url" style="color:#94a3b8;"><br>{{ r.method }} {{ r.url }}</small>
                <details v-if="r.stack" style="margin-top:4px;">
                  <summary style="cursor:pointer;color:#94a3b8;font-size:.75rem;">Стек</summary>
                  <pre style="white-space:pre-wrap;font-size:.72rem;background:#f1f5f9;padding:6px;border-radius:4px;margin-top:4px;">{{ r.stack }}</pre>
                </details>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="form-actions" style="margin-top:16px;">
      <button class="btn btn-secondary" @click="close">Закрыть</button>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import { useToastStore } from '@/stores/toast';
import { showConfirm } from '@/composables/useConfirm';
import { fmtDateTime } from '@/utils/datetime';
import { todayStr } from '@/utils/format';
import { esc } from '@/utils/string';
import { buildHeaderHtml } from '@/utils/header';
import * as logApi from '@/api/log';
import type { AuditItem, ErrorItem } from '@/api/log';

const ui = useUiStore();
const auth = useAuthStore();
const settings = useSettingsStore();
const toast = useToastStore();

const tab = ref<'actions' | 'errors'>('actions');
const cache = ref<AuditItem[]>([]);
const loading = ref(false);
const search = ref('');
const category = ref('');
const period = ref('');
const from = ref('');
const to = ref('');

const errorsCache = ref<ErrorItem[]>([]);
const loadingErrors = ref(false);
const errSearch = ref('');
const errLevel = ref('');

watch(() => ui.activeModal, async (v) => {
  if (v !== 'audit') return;
  tab.value = 'actions';
  search.value = '';
  category.value = '';
  period.value = '';
  from.value = '';
  to.value = '';
  await loadAudit();
});

watch(tab, async (v) => {
  if (v === 'errors' && errorsCache.value.length === 0) await loadErrors();
});

async function loadAudit() {
  loading.value = true;
  try { cache.value = (await logApi.getAuditLog(500)).items || []; }
  catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
  finally { loading.value = false; }
}

async function loadErrors() {
  loadingErrors.value = true;
  try { errorsCache.value = (await logApi.getErrorsLog(500)).items || []; }
  catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
  finally { loadingErrors.value = false; }
}

function onPeriodChange() { /* триггерит computed */ }

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  let fromD = '';
  let toD = '';
  if (period.value === 'today') fromD = toD = todayStr();
  else if (period.value === 'week') {
    const d = new Date(); d.setDate(d.getDate() - 7);
    fromD = d.toISOString().slice(0, 10); toD = todayStr();
  } else if (period.value === 'month') {
    const d = new Date(); d.setDate(d.getDate() - 30);
    fromD = d.toISOString().slice(0, 10); toD = todayStr();
  } else if (period.value === 'custom') {
    fromD = from.value; toD = to.value;
  }

  return cache.value.filter(r => {
    if (category.value && r.category !== category.value) return false;
    const d = (r.timestamp || '').slice(0, 10);
    if (fromD && d < fromD) return false;
    if (toD && d > toD) return false;
    if (q) {
      const hay = [r.pipette_id, r.model, r.user_full_name, r.action, r.details]
        .map(x => String(x || '').toLowerCase()).join(' ');
      if (!hay.includes(q)) return false;
    }
    return true;
  });
});

const errorsFiltered = computed(() => {
  const q = errSearch.value.trim().toLowerCase();
  return errorsCache.value.filter(r => {
    if (errLevel.value && r.level !== errLevel.value) return false;
    if (q) {
      const hay = [r.message, r.stack, r.url, r.user_full_name]
        .map(x => String(x || '').toLowerCase()).join(' ');
      if (!hay.includes(q)) return false;
    }
    return true;
  });
});

function actionColor(action: string): string {
  if (!action) return 'inherit';
  if (action.includes('Удаление')) return '#dc2626';
  if (action.includes('Добавление') || action.includes('Создание')) return '#16a34a';
  if (action.includes('Редактирование')) return '#4f46e5';
  return 'inherit';
}

function exportPDF() {
  if (filtered.value.length === 0) { toast.error('Нет данных'); return; }
  printTable(filtered.value, 'Аудит изменений', false);
}

function exportErrorsPDF() {
  if (errorsFiltered.value.length === 0) { toast.error('Нет данных'); return; }
  printTable(errorsFiltered.value, 'Журнал ошибок', true);
}

function printTable(items: AuditItem[] | ErrorItem[], title: string, isErrors: boolean) {
  const today = new Date().toLocaleDateString('ru-RU');
  const user = auth.user?.fullName || '';
  const userPos = auth.user?.position || '';

  let rows = '';
  if (isErrors) {
    rows = (items as ErrorItem[]).map(r => `
      <tr>
        <td>${fmtDateTime(r.timestamp)}</td>
        <td>${esc(r.level)}</td>
        <td>${esc(r.source || '')}</td>
        <td>${esc(r.user_full_name || '—')}</td>
        <td>${esc(r.message || '')}${r.url ? '<br><small>' + esc((r.method || '') + ' ' + r.url) + '</small>' : ''}</td>
      </tr>`).join('');
  } else {
    rows = (items as AuditItem[]).map(r => `
      <tr>
        <td>${fmtDateTime(r.timestamp)}</td>
        <td>${esc(r.pipette_id || '—')}${r.model ? '<br><small>' + esc(r.model) + '</small>' : ''}</td>
        <td>${esc(r.user_full_name || '—')}</td>
        <td>${esc(r.action)}</td>
        <td>${esc(r.details || '')}</td>
      </tr>`).join('');
  }

  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<style>
@page { size: A4 landscape; margin: 12mm 8mm; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; color: #1a1a2e; margin: 0; }
h1 { font-size: 14pt; text-align: center; margin: 10px 0 14px; }
table { width: 100%; border-collapse: collapse; font-size: 8pt; border: 1.5px solid #1e293b; }
th { background: #1e293b; color: #fff; padding: 6px 5px; text-align: left; font-size: 7.5pt; text-transform: uppercase; border: 1px solid #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
td { padding: 5px; border: 0.5px solid #94a3b8; vertical-align: top; }
tbody tr:nth-child(even) td { background: #f8fafc; }
small { color: #94a3b8; font-size: 7pt; }
.footer { margin-top: 20px; font-size: 8pt; display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 8px; }
tr { page-break-inside: avoid; }
thead { display: table-header-group; }
</style></head><body>
${buildHeaderHtml(settings.printDocs)}
<h1>${esc(title)}</h1>
<table>
  <thead><tr>
    <th style="width:14%;">Дата и время</th>
    ${isErrors ? '<th style="width:8%;">Уровень</th><th style="width:12%;">Источник</th><th style="width:15%;">Пользователь</th><th>Сообщение</th>' : '<th style="width:10%;">Прибор</th><th style="width:15%;">Кто</th><th style="width:15%;">Действие</th><th>Изменения</th>'}
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">
  <div>Сформировал: <b>${esc(userPos)}, ${esc(user)}</b><br>Дата печати: <b>${today}</b> · Записей: <b>${items.length}</b></div>
  <div>Подпись: _______________</div>
</div>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) { toast.error('Разрешите всплывающие окна'); return; }
  win.document.write(html);
  win.document.close();
  win.document.title = title;
  win.focus();
  setTimeout(() => win.print(), 300);
}

async function clearErrors() {
  const ok = await showConfirm('Очистить журнал ошибок?', {
    icon: '🗑️', title: 'Очистка', okText: 'Очистить', okClass: 'btn-danger',
  });
  if (!ok) return;
  try {
    await logApi.clearErrorsLog();
    toast.success('Журнал ошибок очищен');
    errorsCache.value = [];
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

function close() { ui.close(); }
</script>
