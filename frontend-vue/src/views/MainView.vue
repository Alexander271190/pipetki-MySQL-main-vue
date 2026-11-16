<template>
  <AppLayout>
    <AppToolbar />
    <PipetteTable />
    <Pagination />
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, watch  } from 'vue';
import AppLayout from '@/components/layout/AppLayout.vue';
import AppToolbar from '@/components/layout/AppToolbar.vue';
import PipetteTable from '@/components/table/PipetteTable.vue';
import Pagination from '@/components/table/Pagination.vue';
import { usePrefsStore } from '@/stores/prefs';
import { useSettingsStore } from '@/stores/settings';
import { useStatsStore } from '@/stores/stats';
import { usePipettesStore } from '@/stores/pipettes';
import { useHotkeys } from '@/composables/useHotkeys';
import { usePullToRefresh } from '@/composables/usePullToRefresh';
  
useHotkeys();
usePullToRefresh();

const prefs = usePrefsStore();
const settings = useSettingsStore();
const stats = useStatsStore();
const pip = usePipettesStore();

onMounted(async () => {
  // Настройки + prefs параллельно
  await Promise.all([settings.loadAll(), prefs.load()]);

  // Применяем настройку количества строк
  const userLimit = prefs.defaultPageSize;
  const globalLimit = settings.getTableViewSettings().defaultPageSize;
  pip.limit = userLimit || globalLimit || 100;


  // Синхронизировать visibleFields с активными полями
  const activeFieldIds = settings.fields.filter(f => f.enabled).map(f => f.id);
  prefs.syncWithFields(activeFieldIds);

  //  Данные таблицы + статистика параллельно
  await Promise.all([pip.loadPaged(), stats.load()]);
  
   // Напоминание проверяем после загрузки статистики (как в старом)
  window.dispatchEvent(new CustomEvent('reminders:check'));
});

//  Следим за изменением глобальных настроек и персональных предпочтений
watch(
  () => [settings.systemSettings.default_page_size, prefs.defaultPageSize],
  () => {
    // Если у пользователя нет личного переопределения — берем глобальное
    const userLimit = prefs.defaultPageSize;
    const globalLimit = settings.getTableViewSettings().defaultPageSize;
    const newLimit = userLimit || globalLimit || 100;

    // Если лимит реально изменился — перезагружаем таблицу
    if (pip.limit !== newLimit) {
      pip.limit = newLimit;
      pip.page = 1; // Сбрасываем на 1-ю страницу
      pip.loadPaged();
    }
  },
  { deep: true }
);  
</script>
