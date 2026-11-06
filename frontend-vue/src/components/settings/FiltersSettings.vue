<template>
  <div>
    <h3>Управление фильтрами</h3>
    <p style="color:#64748b;margin-bottom:12px;">Включайте / отключайте фильтры.</p>

    <table class="field-settings-table">
      <thead>
        <tr>
          <th style="width:100px;text-align:center;">Порядок</th>
          <th style="width:110px;text-align:center;">Активно</th>
          <th style="text-align:center;">Название</th>
          <th style="width:130px;text-align:center;">Тип</th>
          <th style="width:140px;text-align:center;">Источник</th>
          <th style="width:60px;"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(f, i) in filters" :key="f.id">
          <td>
            <div class="order-btns">
              <button class="btn btn-secondary btn-sm" :disabled="i===0" @click="move(i,-1)"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="btn btn-secondary btn-sm" :disabled="i===filters.length-1" @click="move(i,1)"><i class="fa-solid fa-arrow-down"></i></button>
            </div>
          </td>
          <td style="text-align:center;"><input v-model="f.enabled" type="checkbox" /></td>
          <td><input v-model="f.label" type="text" /></td>
          <td>
            <select v-model="f.type">
              <option value="text">Текст</option>
              <option value="select">Список</option>
              <option value="date-period">Период дат</option>
            </select>
          </td>
          <td>
            <select v-model="f.optionsSource">
              <option value="">—</option>
              <option value="departments">Отделы</option>
              <option value="status_list">Статусы</option>
              <option value="active_list">Активность</option>
              <option value="equipment_type_list">Типы оборудования</option>
            </select>
          </td>
          <td style="text-align:center;">
            <button class="row-actions-btn" @click="onDelete(i)" title="Удалить"><i class="fa-solid fa-ellipsis-vertical"></i></button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="form-actions">
      <button class="btn btn-primary" style="margin-right:auto;" @click="onAdd"><i class="fa-solid fa-plus"></i> Добавить фильтр</button>
      <button type="button" class="btn btn-secondary" @click="$emit('close')">Закрыть</button>
      <button class="btn btn-success" :disabled="saving" @click="onSave">
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i> Сохранить
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToastStore } from '@/stores/toast';
import { useSettingsStore } from '@/stores/settings';
import { showConfirm } from '@/composables/useConfirm';
import { showPrompt } from '@/composables/usePrompt';
import { slugify } from '@/utils/string';
import * as api from '@/api/settings';
import type { FilterConfig } from '@/api/settings';

defineEmits<{ (e: 'close'): void }>();

const settings = useSettingsStore();
const toast = useToastStore();

const filters = ref<FilterConfig[]>([]);
const saving = ref(false);

onMounted(async () => {
  try {
    const data = await api.getFilters();
    filters.value = JSON.parse(JSON.stringify(data || []));
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка загрузки');
  }
});

function move(idx: number, dir: number) {
  const to = idx + dir;
  if (to < 0 || to >= filters.value.length) return;
  [filters.value[idx], filters.value[to]] = [filters.value[to], filters.value[idx]];
  filters.value.forEach((f, i) => f.order = i + 1);
}

async function onAdd() {
  const label = await showPrompt('Название фильтра', {
    icon: 'fa-filter', title: 'Новый фильтр', okText: 'Добавить',
    placeholder: 'Например: Ответственный',
    validator: v => v ? null : 'Укажите название',
  });
  if (!label) return;

  let baseId = slugify(label);
  let finalId = baseId;
  let counter = 1;
  while (filters.value.some(f => f.id === finalId)) finalId = `${baseId}_${counter++}`;

  filters.value.push({
    id: finalId, label: label.trim(), type: 'text',
    enabled: true, optionsSource: '', order: filters.value.length + 1,
  });
}

async function onDelete(idx: number) {
  const f = filters.value[idx];
  const ok = await showConfirm(`Удалить фильтр «${f.label}»?`, {
    icon: '<i class="fa-solid fa-magnifying-glass"></i>', title: 'Удаление', okText: 'Удалить', okClass: 'btn-danger',
  });
  if (!ok) return;
  filters.value.splice(idx, 1);
  filters.value.forEach((f, i) => f.order = i + 1);
}

async function onSave() {
  saving.value = true;
  try {
    await api.saveFilters(filters.value);
    await settings.loadAll();
    toast.success('Фильтры сохранены');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    saving.value = false;
  }
}
</script>
