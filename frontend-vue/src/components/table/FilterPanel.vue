<template>
  <div class="filter-panel show" style="position: absolute; top: 100%; left: 0; margin-top: 4px; z-index: 60;">
    <div id="filter-fields-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 10px;">
      
      <template v-for="f in settings.filters" :key="f.id">
        <!-- Фильтр периода -->
        <div v-if="f.type === 'date-period'" class="filter-row" style="grid-column: 1 / -1; display: flex; gap: 8px;">
          <div class="form-group" style="flex: 1;">
            <label>По какой дате</label>
            <select v-model="localState[f.id].type" style="width: 100%; padding: 6px;">
              <option value="last_calibration">📄 Дата поверки</option>
              <option value="updated_at">📝 Дата внесения</option>
            </select>
          </div>
          <div class="form-group" style="flex: 1;">
            <label>Период</label>
            <select v-model="localState[f.id].period" @change="onPeriodChange(f.id)" style="width: 100%; padding: 6px;">
              <option value="">Все</option>
              <option value="today">📅 Сегодня</option>
              <option value="yesterday">Вчера</option>
              <option value="week">За 7 дней</option>
              <option value="month">За 30 дней</option>
              <option value="custom">Произвольный</option>
            </select>
          </div>
          <div v-if="localState[f.id].period === 'custom'" class="form-group" style="grid-column: 1 / -1; display: flex; gap: 8px;">
            <input type="date" v-model="localState[f.id].from" style="flex: 1; padding: 6px;" />
            <input type="date" v-model="localState[f.id].to" style="flex: 1; padding: 6px;" />
          </div>
        </div>

        <!-- Обычный фильтр -->
        <div v-else class="form-group">
          <label>{{ f.label }}</label>
          <select v-if="f.type === 'select'" v-model="localState[f.id]" style="width: 100%; padding: 6px;">
            <option value="">Все</option>
            <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <input v-else type="text" v-model="localState[f.id]" placeholder="Все" style="width: 100%; padding: 6px;" />
        </div>
      </template>

      <div class="filter-actions" style="grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; border-top: 1px solid var(--border); padding-top: 10px;">
        <button class="btn btn-secondary btn-sm" @click="reset">Сбросить</button>
        <button class="btn btn-primary btn-sm" @click="apply">Применить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { usePipettesStore } from '@/stores/pipettes';

const emit = defineEmits<{ (e: 'close'): void }>();
const settings = useSettingsStore();
const pip = usePipettesStore();

const localState = ref<Record<string, any>>({});

// Инициализация состояния при открытии
settings.filters.forEach(f => {
  localState.value[f.id] = pip.filterState[f.id] || (f.type === 'date-period' ? { type: 'last_calibration', period: '', from: '', to: '' } : '');
});

function onPeriodChange(fid: string) {
  // Ничего не делаем, просто обновляем UI
}

function reset() {
  settings.filters.forEach(f => {
    localState.value[f.id] = f.type === 'date-period' ? { type: 'last_calibration', period: '', from: '', to: '' } : '';
  });
  pip.resetFilters();
  pip.loadPaged();
  emit('close');
}

function apply() {
  const cleanFilters: Record<string, any> = {};
  for (const [k, v] of Object.entries(localState.value)) {
    if (v === undefined || v === null || v === '') continue;
    if (typeof v === 'object' && 'period' in v && v.period === '') continue;
    cleanFilters[k] = v;
  }
  pip.filterState = cleanFilters;
  pip.page = 1;
  pip.loadPaged();
  emit('close');
}
</script>
