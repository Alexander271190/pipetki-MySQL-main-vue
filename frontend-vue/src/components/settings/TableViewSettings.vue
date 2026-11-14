<template>
  <div>
    <h3>Таблица и отображение</h3>
    <div class="settings-form">
      <h4>Доступные размеры страницы</h4>
      <div class="form-group">
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <label v-for="size in ALL_SIZES" :key="size" style="display:flex;gap:6px;cursor:pointer;">
            <input type="checkbox" :value="size" :checked="pageSizes.includes(size)" @change="toggleSize(size, ($event.target as HTMLInputElement).checked)" />
            {{ size }}
          </label>
        </div>
      </div>

      <div class="form-group">
        <label>Размер по умолчанию</label>
        <select v-model="form.default_page_size" style="max-width:200px;">
          <option v-for="size in pageSizes" :key="size" :value="String(size)">{{ size }}</option>
        </select>
      </div>

      <h4 style="margin-top:24px;">Плотность таблицы</h4>
      <div class="form-group">
        <label style="display:flex;gap:8px;cursor:pointer;margin-bottom:6px;">
          <input v-model="form.table_density" type="radio" value="compact" /> Компактная
        </label>
        <label style="display:flex;gap:8px;cursor:pointer;margin-bottom:6px;">
          <input v-model="form.table_density" type="radio" value="normal" /> Обычная
        </label>
        <label style="display:flex;gap:8px;cursor:pointer;">
          <input v-model="form.table_density" type="radio" value="loose" /> Свободная
        </label>
      </div>

      <button class="btn btn-success btn-sm" :disabled="saving" @click="onSave">
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i> Сохранить
      </button>
    </div>
    <div class="form-actions" style="margin-top:16px;">
      <button type="button" class="btn btn-secondary" @click="$emit('close')">Закрыть</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToastStore } from '@/stores/toast';
import { useSettingsStore } from '@/stores/settings';
import * as api from '@/api/settings';

defineEmits<{ (e: 'close'): void }>();

const toast = useToastStore();
const settings = useSettingsStore();
const saving = ref(false);
const ALL_SIZES = [10, 20, 50, 100, 200, 500, 1000];
const pageSizes = ref<number[]>([50, 100, 200, 500]);
const form = ref({
  default_page_size: '100',
  table_density: 'normal' as 'compact' | 'normal' | 'loose',
});

onMounted(async () => {
  try {
    const s = await api.getSystemSettings();
    try {
      const parsed = JSON.parse(String(s.page_sizes || '[50,100,200,500]'));
      if (Array.isArray(parsed)) pageSizes.value = parsed;
    } catch { /* дефолт */ }
    form.value = {
      default_page_size: String(s.default_page_size || '100'),
      table_density: (s.table_density as any) || 'normal',
    };
  } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
});

function toggleSize(size: number, checked: boolean) {
  const s = new Set(pageSizes.value);
  if (checked) s.add(size); else s.delete(size);
  pageSizes.value = [...s].sort((a, b) => a - b);
}

async function onSave() {
  if (pageSizes.value.length === 0) {
    toast.error('Выберите хотя бы один размер');
    return;
  }
  saving.value = true;
  try {
    await api.saveSystem({
      page_sizes: JSON.stringify(pageSizes.value),
      default_page_size: form.value.default_page_size,
      table_density: form.value.table_density,
    });
    await settings.loadAll();
    toast.success('Сохранено');
  } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
  finally { saving.value = false; }
}
</script>
