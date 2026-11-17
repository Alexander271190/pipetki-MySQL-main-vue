<template>
  <AppLayout>
    <AppToolbar />
    <PipetteTable />
    <Pagination />
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';  
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
const auth = useAuthStore();

let _initialLoadDone = false;

async function loadAllData() {
  _initialLoadDone = false;
  await Promise.all([settings.loadAll(), prefs.load()]);
  const userLimit = prefs.defaultPageSize;
  const globalLimit = settings.getTableViewSettings().defaultPageSize;
  pip.limit = userLimit || globalLimit || 100;
  const activeFieldIds = settings.fields.filter(f => f.enabled).map(f => f.id);
  prefs.syncWithFields(activeFieldIds);
  await Promise.all([pip.loadPaged(), stats.load()]);
  window.dispatchEvent(new CustomEvent('reminders:check'));
  _initialLoadDone = true;
}
   
onMounted(async () => {
  // Если пароль обязателен к смене — не грузим (все запросы всё равно вернут 403).
  // Данные загрузятся по событию 'force:reload' после смены пароля.
  if (auth.user?.mustChangePassword || auth.user?.mustSetPassword) return;
  await loadAllData();
});

function onForceReload() { void loadAllData(); }
onMounted(() => window.addEventListener('force:reload', onForceReload));
onUnmounted(() => window.removeEventListener('force:reload', onForceReload));  

//  Следим за изменением глобальных настроек и персональных предпочтений
watch(
  () => [settings.systemSettings.default_page_size, prefs.defaultPageSize],
  () => {
    if (!_initialLoadDone) return;
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
