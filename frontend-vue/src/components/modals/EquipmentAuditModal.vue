<template>
  <AppModal :visible="ui.activeModal === 'equipmentAudit'" @close="close" modal-class="modal-lg">
    <h2>
       <i class="fa-solid fa-clipboard-list"></i> Аудит изменений —
       <strong>{{ info?.id }}</strong>
       <template v-if="info?.model"> · {{ info.model }}</template>
     </h2>

    <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
      <input v-model="search" type="text" placeholder="Поиск…"
        style="flex:1;min-width:200px;padding:8px 12px;border:1px solid var(--border-hard);border-radius:8px;font-size:13px;" />
      <button class="btn btn-info" @click="exportPDF"><i class="fa-solid fa-print"></i> PDF</button>
    </div>

    <div class="log-container" style="max-height:55vh;">
      <table class="log-table">
        <thead>
          <tr>
            <th style="width:140px;">Дата и время</th>
            <th style="width:130px;">Кто</th>
            <th style="width:120px;">Действие</th>
            <th>Изменения</th>
          </tr>
        </thead>
        <tbody>
     <template v-if="loading">
       <tr v-for="i in 5" :key="`sk-${i}`" class="skeleton-row">
         <td><div class="skeleton-line" style="width:80%;"></div></td>
         <td><div class="skeleton-line" style="width:60%;"></div></td>
         <td><div class="skeleton-line" style="width:70%;"></div></td>
         <td><div class="skeleton-line" style="width:90%;"></div></td>
      </tr>
    </template>
 <tr v-else-if="filtered.length === 0">
   <td colspan="4" style="text-align:center;padding:30px 20px;">
     <div style="font-size:32px;margin-bottom:8px;">
       {{ search ? '🔍' : '📋' }}
     </div>
     <div style="color: var(--text-muted); font-size: .85rem;">
       {{ search
         ? 'Ничего не найдено по поиску.'
         : 'В этом приборе пока не было изменений. Отредактируйте его — и аудит начнёт вестись.' }}
     </div>
     <button
       v-if="search"
       class="btn btn-secondary btn-sm"
       style="margin-top:12px;"
       @click="search = ''"
     >
      <i class="fa-solid fa-rotate-left"></i> Очистить поиск
    </button>
  </td>
</tr>
          <tr v-for="(r, i) in filtered" :key="i">
            <td class="timestamp">{{ fmtDateTime(r.timestamp) }}</td>
            <td>{{ r.user_full_name || '—' }}</td>
            <td :style="{ color: actionColor(r.action), fontWeight: 600 }">{{ r.action }}</td>
            <td style="font-size:.82rem;">{{ r.details || '' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="form-actions" style="margin-top:16px;">
      <span style="color:var(--text-muted);font-size:.85rem;margin-right:auto;">
         Всего: {{ filtered.length }} из {{ cache.length }}
       </span>
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
import { fmtDateTime } from '@/utils/datetime';
import { esc } from '@/utils/string';
import { buildHeaderHtml } from '@/utils/header';
import * as logApi from '@/api/log';
import type { AuditItem } from '@/api/log';

const ui = useUiStore();
const auth = useAuthStore();
const settings = useSettingsStore();
const toast = useToastStore();

const info = ref<{ id: string; model: string } | null>(null);
const cache = ref<AuditItem[]>([]);
const loading = ref(false);
const search = ref('');

watch(() => ui.activeModal, async (v) => {
  if (v !== 'equipmentAudit') return;
  const id = ui.modalData as string;
  info.value = { id, model: '' };
  cache.value = [];
  search.value = '';
  loading.value = true;
  try {
    const res = await logApi.getEquipmentAudit(id);
    if (res.equipment) info.value = res.equipment;
    cache.value = res.items || [];
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    loading.value = false;
  }
});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return cache.value;
  return cache.value.filter(r => {
    const hay = [r.user_full_name, r.action, r.details].map(x => String(x || '').toLowerCase()).join(' ');
    return hay.includes(q);
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
  const today = new Date().toLocaleDateString('ru-RU');
  const user = auth.user?.fullName || '';
  const userPos = auth.user?.position || '';
  const title = `Аудит изменений — ${info.value?.id || ''}`;

  const rows = filtered.value.map(r => `
    <tr>
      <td>${fmtDateTime(r.timestamp)}</td>
      <td>${esc(r.user_full_name || '—')}</td>
      <td>${esc(r.action)}</td>
      <td>${esc(r.details || '')}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<style>
@page { size: A4 portrait; margin: 12mm 10mm; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; color: #1a1a2e; margin: 0; }
h1 { font-size: 14pt; text-align: center; margin: 10px 0 14px; }
table { width: 100%; border-collapse: collapse; font-size: 8.5pt; border: 1.5px solid #1e293b; }
th { background: #1e293b; color: #fff; padding: 6px 5px; text-align: left; font-size: 7.5pt; text-transform: uppercase; border: 1px solid #1e293b; }
td { padding: 5px; border: 0.5px solid #94a3b8; vertical-align: top; }
tbody tr:nth-child(even) td { background: #f8fafc; }
.footer { margin-top: 20px; font-size: 8pt; display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 8px; }
</style></head><body>
${buildHeaderHtml(settings.printDocs)}
<h1>${esc(title)}</h1>
<table>
  <thead><tr><th style="width:20%;">Дата</th><th style="width:25%;">Кто</th><th style="width:20%;">Действие</th><th>Изменения</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">
  <div>Сформировал: <b>${esc(userPos)}, ${esc(user)}</b><br>Дата печати: <b>${today}</b> · Записей: <b>${filtered.value.length}</b></div>
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

function close() { ui.close(); }
</script>
