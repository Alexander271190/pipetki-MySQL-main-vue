<template>
  <AppLayout>
    <AppToolbar />
    <PipetteTable />
    <Pagination />
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
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
  // 1) Настройки + prefs параллельно
  await Promise.all([settings.loadAll(), prefs.load()]);

  // 2) Синхронизировать visibleFields с активными полями
  const activeFieldIds = settings.fields.filter(f => f.enabled).map(f => f.id);
  prefs.syncWithFields(activeFieldIds);

  // 3) Данные таблицы + статистика параллельно
  await Promise.all([pip.loadPaged(), stats.load()]);
});
  
</script>
