<template>
  <AppModal :visible="ui.activeModal === 'bulkSend'" @close="close" modal-class="modal-lg">
    <h2><i class="fa-solid fa-box"></i> Отправить на поверку</h2>

    <div class="info-block">
      <strong>Выбрано единиц:</strong> {{ toSendItems.length }}
    </div>

    <div style="margin-bottom:15px;">
      <div style="font-weight:600;color:#475569;margin-bottom:8px;font-size:.85rem;">Выбранное оборудование:</div>
      <div style="max-height:150px;overflow-y:auto;padding:8px;background:#f8fafc;border-radius:8px;font-size:.85rem;line-height:1.6;">
        <div v-for="p in toSendItems" :key="p.id" v-html="identity(p)" style="padding:6px 0;border-bottom:1px dashed var(--border-soft);"></div>
      </div>
    </div>

    <div class="warning-block">
      ℹ️ На внешнюю поверку отправляются только типы с настройкой <strong>«📦 Внешняя»</strong>.
    </div>

    <div v-if="replacementBlocks.length > 0" style="margin-bottom:15px;">
      <div v-for="block in replacementBlocks" :key="block.id" class="card">
        <div class="card-title" style="margin-bottom:8px;" v-html="identity(block.p)"></div>
        <div class="text-muted-sm" style="margin-bottom:6px;">Складские того же типа:</div>
        <div class="flex-col">
          <label v-for="opt in block.options" :key="opt.id" style="display:flex;align-items:center;gap:8px;padding:6px;background:var(--card);border-radius:6px;cursor:pointer;font-size:.82rem;">
            <input type="radio" :name="`repl-${block.id}`" :value="opt.id" v-model="replacements[block.id]" />
            <span>
              <strong>{{ opt.id }}</strong> — {{ opt.model }}
              <span v-if="opt.manufacturer" style="color:#94a3b8;">({{ opt.manufacturer }})</span>
            </span>
          </label>
          <label style="display:flex;align-items:center;gap:8px;padding:6px;cursor:pointer;font-size:.82rem;color:#94a3b8;">
            <input type="radio" :name="`repl-${block.id}`" value="" v-model="replacements[block.id]" />
            <span>Без замены</span>
          </label>
        </div>
      </div>
    </div>

    <form @submit.prevent="onSubmit">
      <div class="form-row">
        <div class="form-group">
          <label>Дата отправки *</label>
          <input v-model="sentDate" type="date" required />
        </div>
      </div>
      <div class="form-group">
        <label>Примечание</label>
        <textarea v-model="note" rows="2" placeholder="например: отправлено курьером"></textarea>
      </div>
      <div v-if="error" class="auth-error" style="visibility:visible;opacity:1;">{{ error }}</div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="close">Отмена</button>
        <button
          v-if="settings.printDocs?.actSend !== false"
          type="button"
          class="btn btn-info"
          @click="printAct"
        >
          <i class="fa-solid fa-print"></i> Распечатать акт
        </button>
        <button type="submit" class="btn btn-warning" :disabled="saving">
          <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-box'"></i>
          Отправить
        </button>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { usePipettesStore } from '@/stores/pipettes';
import { useSettingsStore } from '@/stores/settings';
import { useStatsStore } from '@/stores/stats';
import { useToastStore } from '@/stores/toast';
import { useAuthStore, usePermissions } from '@/stores/auth';
import { showConfirm } from '@/composables/useConfirm';
import { todayStr, formatDate } from '@/utils/format';
import { buildHeaderHtml } from '@/utils/header';
import { isExternalCalibration, allowReplacement } from '@/utils/equipment';
import { getDeviceIdentityHtml } from '@/utils/deviceIdentity';
import * as bulkApi from '@/api/bulk';
import type { Pipette } from '@/types';

const ui = useUiStore();
const pip = usePipettesStore();
const settings = useSettingsStore();
const stats = useStatsStore();
const toast = useToastStore();
const auth = useAuthStore();
const perm = usePermissions(); 
const toSendItems = ref<Pipette[]>([]);
const sentDate = ref('');
const note = ref('');
const replacements = ref<Record<string, string>>({});
const replacementBlocks = ref<{ id: string; p: Pipette; options: bulkApi.ReplacementOption[] }[]>([]);
const saving = ref(false);
const error = ref('');

let _lockedIds: string[] = [];
let _generation = 0;

function identity(p: Pipette) { return getDeviceIdentityHtml(p); }

watch(() => ui.activeModal, (v) => {
  if (v === 'bulkSend') open();
});

async function open() {
  const gen = ++_generation;

  // Сброс состояния
  error.value = '';
  saving.value = false;
  toSendItems.value = [];
  sentDate.value = todayStr();
  note.value = '';
  replacements.value = {};
  replacementBlocks.value = [];

  const ids = (ui.modalData as string[]) || [];
  const list = await pip.fetchByIds(ids);
  const filtered = list.filter(p =>
    !p.sent_for_calibration &&
    !p.replacing &&
    isExternalCalibration(settings.equipmentTypes, p.equipment_type)
  );

  if (filtered.length === 0) {
    toast.error('Не выбрано ни одной единицы для внешней поверки');
    ui.close();
    return;
  }

  // 1. Сначала — захват локов (await), потом показываем форму
  try {
    const r = await bulkApi.bulkLock(filtered.map(p => p.id));
    if (gen !== _generation) {
      // Пока ждали — сессия переоткрыта или закрыта: сразу освобождаем
      bulkApi.bulkUnlock(filtered.map(p => p.id)).catch(() => {});
      return;
    }
    _lockedIds = filtered.map(p => p.id);
    if (r.busy?.length) {
      toast.warn(`Уже редактируются: ${r.busy.map(b => `${b.id} (${b.lockedBy})`).join(', ')}`);
    }
  } catch {
    if (gen === _generation) {
      toast.error('Ошибка блокировки');
      ui.close();
    }
    return;
  }

  toSendItems.value = filtered;

  // 2. Замены (после блокировки)
  const forRepl = filtered.filter(p => allowReplacement(settings.equipmentTypes, p.equipment_type));
  if (forRepl.length > 0) {
    try {
      const res = await bulkApi.availableForReplacementBatch(
        forRepl.map(p => ({ id: p.id, type: p.equipment_type, department: p.department || '' }))
      );
      if (gen !== _generation) return;   // сессия сменилась — не перезаписываем
      const blocks: typeof replacementBlocks.value = [];
      for (const p of forRepl) {
        const options = res[p.id] || [];
        if (options.length > 0) blocks.push({ id: p.id, p, options });
      }
      replacementBlocks.value = blocks;
    } catch { /* ignore */ }
  }
}

async function onSubmit() {
  error.value = '';
  await auth.refreshUser();
  if (!perm.canBulkSend.value) { error.value = 'Нет прав'; return; }

  if (!sentDate.value) { error.value = 'Укажите дату'; return; }
  if (sentDate.value > todayStr()) { error.value = 'Дата не может быть в будущем'; return; }

  if (toSendItems.value.length > 1) {
    const ok = await showConfirm(
      `Отправить на поверку ${toSendItems.value.length} единиц?`,
      { icon: '📦', title: 'Отправка', okText: 'Отправить', okClass: 'btn-warning' }
    );
    if (!ok) return;
  }

  saving.value = true;
  try {
    const res = await bulkApi.bulkSend({
      ids: toSendItems.value.map(p => p.id),
      sentDate: sentDate.value,
      note: note.value.trim(),
      replacements: replacements.value,
    });
    let msg = `Отправлено: ${res.successful}`;
    if (res.skipped > 0) msg += `. Пропущено: ${res.skipped}`;
    toast.success(msg);

    close();                       // ← вместо ui.close(): снимает локи
    pip.clearSelection();
    await pip.loadPaged();
    await stats.load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка';
  } finally {
    saving.value = false;
  }
}

function close() {
  if (_lockedIds.length > 0) {
    bulkApi.bulkUnlock(_lockedIds).catch(() => {});
    _lockedIds = [];
  }
  ui.close();
}

onUnmounted(() => {
  if (_lockedIds.length > 0) {
    bulkApi.bulkUnlock(_lockedIds).catch(() => {});
    _lockedIds = [];
  }
});

function printAct() {
  if (toSendItems.value.length === 0) { toast.error('Нет единиц для печати'); return; }
  if (settings.printDocs?.actSend === false) { toast.error('Печать акта отключена'); return; }

  const user = auth.user?.fullName || '';
  const userPosition = auth.user?.position || '';
  const today = new Date().toLocaleDateString('ru-RU');

  const fields = (settings.printDocs?.actSendFields?.length
    ? settings.printDocs.actSendFields
    : ['id','model','manufacturer','serial','volume','department','responsible']);

  const labels: Record<string, string> = {
    id: 'Внутр. №', model: 'Модель', manufacturer: 'Производитель',
    serial: 'Серийный №', volume: 'Объём', department: 'Отдел',
    responsible: 'Ответственный', location: 'Место', cert: 'Свидетельство',
    notes: 'Примечание',
  };

  const renderCell = (p: Pipette, field: string): string => {
    if (field === 'id') return `<strong>${p.id}</strong>`;
    if (field === 'volume') return p.volume ? `${p.volume} мкл` : '—';
    if (field === 'model') return p.model;
    return String((p as Record<string, unknown>)[field] || '—');
  };

  const headerCells = fields.map(f => `<th>${labels[f] || f}</th>`).join('');
  const rows = toSendItems.value.map((p, i) => {
    const cells = fields.map(f => `<td>${renderCell(p, f)}</td>`).join('');
    return `<tr><td style="text-align:center;">${i+1}</td>${cells}<td style="width:50px;"></td></tr>`;
  }).join('');

  const win = window.open('', '_blank');
  if (!win) { toast.error('Разрешите всплывающие окна'); return; }

  win.document.write(`<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Акт отправки</title>
<style>
@page { size: A4 landscape; margin: 12mm 8mm; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; color: #1a1a2e; margin: 0; }
h1 { font-size: 15pt; text-align: center; margin: 10px 0 4px; }
.subtitle { font-size: 10pt; text-align: center; color: #64748b; margin-bottom: 20px; }
table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 10px; border: 1.5px solid #1e293b; }
th { background: #1e293b; color: #fff; padding: 6px 5px; text-align: left; font-size: 7.5pt; text-transform: uppercase; border: 1px solid #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
td { padding: 5px; border: 0.5px solid #94a3b8; vertical-align: top; }
tbody tr:nth-child(even) td { background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.footer { margin-top: 20px; font-size: 8pt; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #cbd5e1; padding-top: 8px; }
</style></head><body>
${buildHeaderHtml(settings.printDocs)}
<h1>АКТ ОТПРАВКИ НА ПОВЕРКУ</h1>
<div class="subtitle">КГБУЗ Краевая клиническая больница · Клинико-диагностическая лаборатория</div>
<table><thead><tr><th style="width:5%;text-align:center;">№</th>${headerCells}<th style="width:10%;">Прим.</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer">
  <div>
    <div>Сформировал: <b>${userPosition}, ${user}</b></div>
    <div>Дата отправки: <b>${formatDate(sentDate.value)}</b> · Приборов: <b>${toSendItems.value.length}</b></div>
    <div>Дата печати: <b>${today}</b></div>
    ${note.value.trim() ? `<div>Примечание: <b>${note.value.trim()}</b></div>` : ''}
  </div>
  <div>Подпись: _______________</div>
</div>
</body></html>`);
  win.document.close();
  win.document.title = 'Акт отправки';
  win.focus();
  setTimeout(() => win.print(), 300);
  toast.success('Окно печати открыто');
}
</script>
