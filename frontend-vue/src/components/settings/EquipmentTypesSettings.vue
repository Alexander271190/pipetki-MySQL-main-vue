<template>
  <div>
    <p style="color:#64748b;font-size:.88rem;margin:0 0 12px;">Управление списком типов.</p>

    <table class="field-settings-table">
      <thead>
        <tr>
          <th style="width:100px;text-align:center;">Порядок</th>
          <th style="text-align:center;">Название</th>
          <th style="width:100px;text-align:center;">Префикс</th>
          <th style="width:100px;text-align:center;">МПИ (мес.)</th>
          <th style="width:200px;text-align:center;">Место поверки</th>
          <th style="width:90px;text-align:center;">Замена</th>
          <th style="width:60px;"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(t, i) in types" :key="t.value">
          <td>
            <div class="order-btns">
              <button class="btn btn-secondary btn-sm" :disabled="i===0" @click="move(i,-1)"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="btn btn-secondary btn-sm" :disabled="i===types.length-1" @click="move(i,1)"><i class="fa-solid fa-arrow-down"></i></button>
            </div>
          </td>
          <td><input v-model="t.label" type="text" /></td>
          <td>
            <input
              v-model="t.prefix"
              type="text"
              maxlength="10"
              style="text-align:center;text-transform:uppercase;"
              @input="normalizePrefix(t)"
            />
          </td>
          <td>
            <input v-model.number="t.interval" type="number" min="1" max="120" style="text-align:center;" />
          </td>
          <td>
            <select v-model="t.calibrationPlace">
              <option value="external">📦 Внешняя</option>
              <option value="internal">🏠 На месте</option>
            </select>
          </td>
          <td style="text-align:center;">
            <input v-model="t.allowReplacement" type="checkbox" :true-value="true" :false-value="false" title="Предлагать замену со склада" />
          </td>
          <td style="text-align:center;">
            <button class="row-actions-btn" @click="openActions($event, i)" title="Действия">
              <i class="fa-solid fa-ellipsis-vertical"></i>
             </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="form-actions">
      <button class="btn btn-primary btn-sm" style="margin-right:auto;" @click="onAdd"><i class="fa-solid fa-plus"></i> Добавить тип</button>
      <button type="button" class="btn btn-secondary btn-sm" @click="$emit('close')">Закрыть</button>
      <button class="btn btn-success btn-sm" :disabled="saving" @click="onSave">
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i> Сохранить
      </button>
    </div>

    <div v-if="warning" style="margin-top:12px;padding:10px 12px;background:#fee2e2;border-left:3px solid #dc2626;border-radius:6px;color:#991b1b;font-size:.85rem;">
      <i class="fa-solid fa-triangle-exclamation"></i> {{ warning }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToastStore } from '@/stores/toast';
import { useSettingsStore } from '@/stores/settings';
import { useUiStore } from '@/stores/ui';
import { showConfirm } from '@/composables/useConfirm';
import { showPrompt } from '@/composables/usePrompt';
import { slugify } from '@/utils/string';
import * as api from '@/api/settings';
import type { EquipmentType } from '@/api/settings';

defineEmits<{ (e: 'close'): void }>();

const settings = useSettingsStore();
const toast = useToastStore();
const ui = useUiStore();
const types = ref<EquipmentType[]>([]);
const saving = ref(false);
const warning = ref('');

onMounted(async () => {
  try {
    const data = await api.getEquipmentTypes();
    types.value = JSON.parse(JSON.stringify(data || []));
    updateWarning();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка загрузки');
  }
});

function normalizePrefix(t: EquipmentType) {
  t.prefix = String(t.prefix || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  updateWarning();
}

function updateWarning() {
  const problems: string[] = [];
  const values = types.value.map(t => t.value);
  if (values.filter((v, i) => values.indexOf(v) !== i).length > 0) problems.push('Дубли value');
  const prefixes = types.value.map(t => String(t.prefix || '').trim().toUpperCase()).filter(Boolean);
  if (prefixes.filter((v, i) => prefixes.indexOf(v) !== i).length > 0) problems.push('Дубли prefix');
  if (types.value.some(t => !t.label || !t.label.trim())) problems.push('Пустой label');
  warning.value = problems.join(', ');
}

function move(idx: number, dir: number) {
  const to = idx + dir;
  if (to < 0 || to >= types.value.length) return;
  [types.value[idx], types.value[to]] = [types.value[to], types.value[idx]];
}

function generateUniquePrefix(): string {
  const taken = new Set(types.value.map(t => String(t.prefix || '').trim().toUpperCase()).filter(Boolean));
  if (!taken.has('EQ')) return 'EQ';
  let i = 1;
  while (taken.has(`EQ${i}`)) i++;
  return `EQ${i}`;
}

async function onAdd() {
  const label = await showPrompt('Название типа (по-русски)', {
    icon: 'fa-screwdriver-wrench', title: 'Новый тип', okText: 'Добавить',
    placeholder: 'Например: Пипетка',
    validator: v => v ? null : 'Укажите название',
  });
  if (!label) return;

  let baseValue = slugify(label);
  let finalValue = baseValue;
  let counter = 1;
  while (types.value.some(x => x.value === finalValue)) finalValue = `${baseValue}_${counter++}`;

  types.value.push({
    value: finalValue,
    label: label.trim(),
    prefix: generateUniquePrefix(),
    calibrationPlace: 'internal',
    interval: 12,
    allowReplacement: true,
  });
  updateWarning();
}

async function onDelete(idx: number) {
  const t = types.value[idx];
  const ok = await showConfirm(`Удалить тип «${t.label}»?`, {
    icon: '<i class="fa-solid fa-screwdriver-wrench"></i>', title: 'Удаление', okText: 'Удалить', okClass: 'btn-danger',
  });
  if (!ok) return;
  types.value.splice(idx, 1);
  updateWarning();
}

async function onSave() {
  saving.value = true;
  updateWarning();

  if (warning.value) {
    const values = types.value.map(t => t.value);
    if (values.filter((v, i) => values.indexOf(v) !== i).length > 0) {
      toast.error('Есть дубли value');
      saving.value = false;
      return;
    }
    const prefixes = types.value.map(t => String(t.prefix || '').trim().toUpperCase()).filter(Boolean);
    if (prefixes.filter((v, i) => prefixes.indexOf(v) !== i).length > 0) {
      toast.error('Есть дубли prefix — префиксы должны быть уникальны');
      saving.value = false;
      return;
    }
    if (types.value.some(t => !t.label || !t.label.trim())) {
      toast.error('Заполните label');
      saving.value = false;
      return;
    }
    toast.error('Проверьте: ' + warning.value);
    saving.value = false;
    return;
  }
  try {
    const cleaned = types.value.map(t => ({
      ...t,
      prefix: String(t.prefix || '').trim().toUpperCase(),
      interval: (() => { const n = parseInt(String(t.interval), 10); return (n >= 1 && n <= 120) ? n : 12; })(),
      calibrationPlace: t.calibrationPlace || 'internal',
    }));
    await api.saveEquipmentTypes(cleaned);
    await settings.loadAll();
    const { usePipettesStore } = await import('@/stores/pipettes');
    usePipettesStore().syncFilterState(settings.filters);
    toast.success('Типы сохранены');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    saving.value = false;
  }
}
function openActions(e: MouseEvent, idx: number) {
  e.stopPropagation();
  ui.openRowActions(e.currentTarget as HTMLElement, [
    {
      label: '<i class="fa-solid fa-trash"></i> Удалить',
      class: 'item-danger',
      action: () => onDelete(idx),
    },
  ]);
}
</script>
