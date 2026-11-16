<template>
  <div 
    class="pagination" 
    :style="{ 
      display: pip.total > 0 ? 'flex' : 'none',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      flexWrap: 'wrap',
      gap: '12px'
    }"
  >
    <!-- Левая часть: выбор количества строк -->
    <div style="display: flex; align-items: center; gap: 8px;">
      <span class="pagination-info" style="font-size: .82rem; color: var(--text-muted);">Строк:</span>
      <select 
        :value="pip.limit" 
        @change="onLimitChange"
        style="padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-hard); background: var(--card); color: var(--text); font-size: .82rem; outline: none;"
      >
        <option v-for="size in pageSizes" :key="size" :value="size">{{ size }}</option>
      </select>
    </div>

    <!-- Центральная часть: кнопки и номер страницы -->
    <div style="display: flex; align-items: center; gap: 12px;">
      <button class="pagination-btn" :disabled="pip.page <= 1" @click="pip.changePage(-1)">← Назад</button>
      <span class="pagination-info" style="font-size: .82rem; color: var(--text); min-width: 100px; text-align: center;">
        Стр. <strong>{{ pip.page }}</strong> из <strong>{{ pip.totalPages }}</strong>
      </span>
      <button class="pagination-btn" :disabled="pip.page >= pip.totalPages" @click="pip.changePage(1)">Вперёд →</button>
    </div>

    <!-- Правая часть: общее количество -->
    <div style="display: flex; justify-content: flex-end; min-width: 140px;">
      <span class="pagination-info" style="font-size: .82rem; color: var(--text-muted);">
        Всего: <strong>{{ pip.total }}</strong> записей
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePipettesStore } from '@/stores/pipettes';
import { useSettingsStore } from '@/stores/settings';

const pip = usePipettesStore();
const settings = useSettingsStore();

// Берем доступные размеры из настроек (по умолчанию [50, 100, 200, 500])
const pageSizes = computed(() => {
  return settings.getTableViewSettings().pageSizes || [50, 100, 200, 500];
});

async function onLimitChange(e: Event) {
  const newLimit = parseInt((e.target as HTMLSelectElement).value, 10);
  pip.limit = newLimit;
  pip.page = 1;
  await pip.loadPaged();
}
</script>
