<template>
  <AppModal :visible="ui.activeModal === 'bulkReturn'" @close="close" modal-class="modal-lg">
    <h2><i class="fa-solid fa-box-open"></i> Возврат с поверки</h2>

    <div class="success-block">
      <strong>Возвращается:</strong> {{ items.length }}
    </div>

    <form @submit.prevent="onSubmit">
      <div class="form-row">
        <div class="form-group">
          <label>Дата поверки *</label>
          <input v-model="date" type="date" required />
        </div>
        <div class="form-group">
          <label>Организация</label>
          <input v-model="org" type="text" placeholder="ФБУ «Красноярский ЦСМ»" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Результат (общий)</label>
          <select v-model="commonResult" @change="applyResultAll">
            <option value="pass">✅ Годен</option>
            <option value="fail">❌ Брак</option>
            <option value="wip">⏳ В процессе</option>
          </select>
        </div>
        <div class="form-group" style="display:flex;align-items:flex-end;">
          <label class="info-label">
            <input v-model="singleCert" type="checkbox" @change="toggleSingleCert" />
            Одно свидетельство на всех
          </label>
        </div>
      </div>

      <div v-if="singleCert" class="form-group">
        <label>Номер общего свидетельства</label>
        <input v-model="commonCert" type="text" placeholder="С-АБ-1234567/2026" />
      </div>

      <table class="field-settings-table" style="margin-top:15px;">
        <thead>
          <tr>
            <th style="width:35%;">ID / Модель</th>
            <th style="width:40%;">Свидетельство</th>
            <th style="width:25%;">Результат</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in items" :key="p.id">
            <td>
              <div v-html="identity(p)"></div>
              <small v-if="p.sent_for_calibration" style="color:#0ea5e9;margin-top:4px;display:inline-block;">
                <i class="fa-solid fa-box"></i> отпр. {{ formatDate(p.sent_for_calibration) }}
              </small>
            </td>
            <td>
              <input
                v-model="certMap[p.id]"
                type="text"
                :disabled="singleCert"
                :placeholder="singleCert ? '—' : 'напр. С-АБ-...'"
                style="width:100%;padding:5px 8px;border:1px solid var(--border-hard);border-radius:5px;font-family:inherit;"
              />
            </td>
            <td>
              <select v-model="resultMap[p.id]" style="width:100%;padding:5px 8px;border:1px solid var(--border-hard);border-radius:5px;">
                <option value="pass">✅ Годен</option>
                <option value="fail">❌ Брак</option>
                <option value="wip">⏳ В процессе</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="withReplacement.length > 0" class="info-block" style="margin-top:15px;">
        <div style="font-weight:600;margin-bottom:8px;">↔ На время поверки было выдано:</div>
        <label v-for="p in withReplacement" :key="p.id" style="display:flex;gap:8px;padding:4px 0;cursor:pointer;">
          <input type="checkbox" :value="p.id" v-model="returnReplacements" style="margin-top:3px;" />
          <span><strong>{{ p.id }}</strong> → было заменено на <strong>{{ p.replaced_by }}</strong><br>
          <small style="color:#64748b;">Вернуть замену на склад</small></span>
        </label>
      </div>

      <div class="form-group">
        <label>Примечание</label>
        <textarea v-model="note" rows="2"></textarea>
      </div>

      <div v-if="error" class="auth-error" style="visibility:visible;opacity:1;">{{ error }}</div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="close">Отмена</button>
        <button
          v-if="settings.printDocs?.actReturn !== false"
          type="button"
          class="btn btn-info"
          @click="printAct"
        >
          <i class="fa-solid fa-print"></i> Распечатать акт
        </button>
        <button type="submit" class="btn btn-success" :disabled="saving">
          <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
          Применить
        </button>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { usePipettesStore } from '@/stores/pipettes';
import { useSettingsStore } from '@/stores/settings';
import { useStatsStore } from '@/stores/stats';
import { useToastStore } from '@/stores/toast';
import { useAuthStore, usePermissions } from '@/stores/auth';
import { todayStr, formatDate } from '@/utils/format';
import { buildHeaderHtml } from '@/utils/header';
import { isExternalCalibration } from '@/utils/equipment';
import { getDeviceIdentityHtml } from '@/utils/deviceIdentity';
import { showConfirm } from '@/composables/useConfirm';
import * as bulkApi from '@/api/bulk';
import type { Pipette } from '@/types';

const ui = useUiStore();
const pip = usePipettesStore();
const settings = useSettingsStore();
const stats = useStatsStore();
const toast = useToastStore();
const auth = useAuthStore();
const perm = usePermissions(); 
const items = ref<Pipette[]>([]);
const date = ref('');
const org = ref('');
const commonResult = ref('pass');
const singleCert = ref(false);
const commonCert = ref('');
const certMap = ref<Record<string, string>>({});
const resultMap = ref<Record<string, string>>({});
const returnReplacements = ref<string[]>([]);
const note = ref('');
const saving = ref(false);
const error = ref('');

let _lockedIds: string[] = [];
let _generation = 0;

const withReplacement = computed(() => items.value.filter(p => p.replaced_by));

function identity(p: Pipette) { return getDeviceIdentityHtml(p); }

watch(() => ui.activeModal, (v) => {
  if (v === 'bulkReturn') open();
});

async function open() {
  const gen = ++_generation;

  // Сброс состояния
  error.value = '';
  saving.value = false;
  items.value = [];
  date.value = todayStr();
  org.value = '';
  commonResult.value = 'pass';
  singleCert.value = false;
  commonCert.value = '';
  certMap.value = {};
  resultMap.value = {};
  returnReplacements.value = [];
  note.value = '';

  const ids = (ui.modalData as string[]) || [];
  const list = await pip.fetchByIds(ids);
  const filtered = list.filter((p): p is Pipette =>
    !!p && !!p.sent_for_calibration && isExternalCalibration(settings.equipmentTypes, p.equipment_type)
  );
  if (filtered.length === 0) {
    toast.error('Не выбрано ни одной единицы со статусом «На поверке»');
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

  items.value = filtered;

  for (const p of filtered) {
    certMap.value[p.id] = '';
    resultMap.value[p.id] = 'pass';
  }
  returnReplacements.value = withReplacement.value.map(p => p.id);
}

function applyResultAll() {
  for (const p of items.value) resultMap.value[p.id] = commonResult.value;
}

function toggleSingleCert() {
  if (singleCert.value) {
    for (const p of items.value) certMap.value[p.id] = '';
  }
}

async function onSubmit() {
  error.value = '';
  await auth.refreshUser();
  if (!perm.canBulkReturn.value) { error.value = 'Нет прав на возврат'; return; }

  if (!date.value) { error.value = 'Укажите дату'; return; }
  if (date.value > todayStr()) { error.value = 'Дата не может быть в будущем'; return; }
  if (singleCert.value && !commonCert.value.trim()) {
    error.value = 'Укажите общий номер свидетельства';
    return;
  }

  const payloadItems = items.value.map(p => ({
    id: p.id,
    cert: singleCert.value ? commonCert.value.trim() : (certMap.value[p.id] || '').trim(),
    result: resultMap.value[p.id] || 'pass',
  }));

  if (!singleCert.value) {
    const missing = payloadItems.filter(it => !it.cert);
    if (missing.length > 0) {
      const ok = await showConfirm(
        `У ${missing.length} пипеток нет свидетельства. Продолжить?`,
        { icon: '⚠️', title: 'Нет свидетельства', okText: 'Продолжить', okClass: 'btn-warning' }
      );
      if (!ok) return;
    }
  }

  if (items.value.length > 1) {
    const ok = await showConfirm(
      `Применить возврат для ${items.value.length} единиц?`,
      { icon: '📥', title: 'Возврат', okText: 'Применить', okClass: 'btn-success' }
    );
    if (!ok) return;
  }

  saving.value = true;
  try {
    const res = await bulkApi.bulkReturn({
      items: payloadItems,
      date: date.value,
      org: org.value.trim(),
      note: note.value.trim(),
      returnReplacements: returnReplacements.value,
    });
    toast.success(res.message || `Возврат оформлен для ${items.value.length} единиц`);
    close();
    pip.clearSelection();

    //  Автофильтр по дате возврата
    const savedDate = date.value;
    pip.resetFilters();
    pip.page = 1;

    const calFilter = settings.filters.find(f => f.type === 'date-period');
    if (calFilter && savedDate) {
      pip.setFilter(calFilter.id, {
        type: 'last_calibration',
        period: 'custom',
        from: savedDate,
        to: savedDate,
      });
      await pip.loadPaged();
      await stats.load();
      window.dispatchEvent(new CustomEvent('filters:refresh'));
      toast.warn(`Таблица отфильтрована по дате ${savedDate}. Сбросьте фильтр, чтобы увидеть всё.`);
    } else {
      await pip.loadPaged();
      await stats.load();
      if (savedDate) {
        toast.show(`Возврат оформлен на ${savedDate}.`, 'success');
      }
    }
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
  if (items.value.length === 0) { toast.error('Нет единиц'); return; }
  if (settings.printDocs?.actReturn === false) { toast.error('Печать акта отключена'); return; }

  const user = auth.user?.fullName || '';
  const userPosition = auth.user?.position || '';
  const today = new Date().toLocaleDateString('ru-RU');

  const fields = (settings.printDocs?.actReturnFields?.length
    ? settings.printDocs.actReturnFields
    : ['id','model','manufacturer','serial','volume','department','cert','result']);

  const labels: Record<string, string> = {
    id: 'Внутр. №', model: 'Модель', manufacturer: 'Производитель',
    serial: 'Серийный №', volume: 'Объём', department: 'Отдел',
    responsible: 'Ответственный', cert: 'Свидетельство', result: 'Результат',
    notes: 'Примечание',
  };

  const renderCell = (p: Pipette, field: string): string => {
    if (field === 'id') return `<strong>${p.id}</strong>`;
    if (field === 'volume') return p.volume ? `${p.volume} мкл` : '—';
    if (field === 'model') return p.model;
    if (field === 'cert') {
      const v = singleCert.value ? commonCert.value.trim() : (certMap.value[p.id] || '');
      return v || '—';
    }
    if (field === 'result') {
      const v = resultMap.value[p.id] || 'pass';
      return v === 'pass' ? 'Годен' : v === 'fail' ? 'Брак' : 'В процессе';
    }
    return String((p as Record<string, unknown>)[field] || '—');
  };

  const headerCells = fields.map(f => `<th>${labels[f] || f}</th>`).join('');
  const rows = items.value.map((p, i) => {
    const cells = fields.map(f => `<td>${renderCell(p, f)}</td>`).join('');
    return `<tr><td style="text-align:center;">${i+1}</td>${cells}</tr>`;
  }).join('');

  const win = window.open('', '_blank');
  if (!win) { toast.error('Разрешите всплывающие окна'); return; }

  win.document.write(`<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Акт возврата</title>
<style>
@page { size: A4 landscape; margin: 12mm 8mm; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; color: #1a1a2e; margin: 0; }
h1 { font-size: 15pt; text-align: center; margin: 10px 0 4px; }
.subtitle { font-size: 10pt; text-align: center; color: #64748b; margin-bottom: 20px; }
table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 10px; border: 1.5px solid #1e293b; }
th { background: #1e293b; color: #fff; padding: 6px 5px; text-align: left; font-size: 7.5pt; text-transform: uppercase; border: 1px solid #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
td { padding: 5px; border: 0.5px solid #94a3b8; vertical-align: top; }
tbody tr:nth-child(even) td { background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.footer { margin-top: 20px; font-size: 8pt; display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 8px; }
</style></head><body>
${buildHeaderHtml(settings.printDocs)}
<h1>АКТ ВОЗВРАТА С ПОВЕРКИ</h1>
<div class="subtitle">КГБУЗ Краевая клиническая больница · Клинико-диагностическая лаборатория</div>
<table><thead><tr><th style="width:5%;text-align:center;">№</th>${headerCells}</tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer">
  <div>
    <div>Сформировал: <b>${userPosition}, ${user}</b></div>
    <div>Дата поверки: <b>${formatDate(date.value)}</b> · Приборов: <b>${items.value.length}</b></div>
    <div>Организация: <b>${org.value || 'ФБУ «Красноярский ЦСМ»'}</b> · Дата печати: <b>${today}</b></div>
    ${note.value.trim() ? `<div>Примечание: <b>${note.value.trim()}</b></div>` : ''}
  </div>
  <div>Подпись: _______________</div>
</div>
</body></html>`);
  win.document.close();
  win.document.title = 'Акт возврата';
  win.focus();
  setTimeout(() => win.print(), 300);
  toast.success('Окно печати открыто');
}
</script>
