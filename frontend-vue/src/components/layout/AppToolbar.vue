<template>
  <div class="toolbar">
    <!-- Bulk toolbar -->
    <div class="toolbar-bulk" v-if="pip.hasSelection">
      <span class="bulk-label">
        <i class="fa-solid fa-bolt"></i> Выбрано: <b>{{ pip.selected.size }}</b>
      </span>
      <button
        v-if="perm.canBulkSend.value && selectedToSend.length > 0"
        class="btn btn-info btn-sm"
        @click="modals.openBulkSend()"
      >
        <i class="fa-solid fa-box"></i> Отправить
        <span>({{ selectedToSend.length < pip.selected.size
         ? selectedToSend.length + ' / ' + pip.selected.size
         : selectedToSend.length }})</span>
      </button>
      <button
        v-if="perm.canBulkReturn.value && selectedToReturn.length > 0"
        class="btn btn-success btn-sm"
        @click="modals.openBulkReturn()"
       >
        <i class="fa-solid fa-box-open"></i> Вернуть
        <span>({{ selectedToReturn.length }})</span>
     </button>
     <button
  v-if="perm.canBulkChangeResponsible.value && selectedVisible.length > 0"
  class="btn btn-secondary btn-sm"
  @click="modals.openBulkResponsible()"
>
  <i class="fa-solid fa-user-pen"></i> Ответственный
  <span v-if="selectedVisible.length > 0">({{ selectedVisible.length }})</span>
 </button>

<!-- Кнопка массового удаления -->
 <button
  v-if="perm.canDeletePipette.value && selectedVisible.length > 0"
  class="btn btn-danger btn-sm"
  @click="modals.openBulkDelete()"
  title="Удалить выбранные"
>
  <i class="fa-solid fa-trash"></i> Удалить
  <span>({{ selectedVisible.length }})</span>
 </button>

 <button class="btn btn-secondary btn-sm" @click="pip.clearSelection()">
  <i class="fa-solid fa-xmark"></i> Снять
 </button>
</div>

    <!-- Поиск -->
    <input
      type="text"
      class="search-input"
      :value="pip.search"
      placeholder="Поиск по номеру, модели, отделу, ответственному…"
      @input="onSearchInput"
    />

    <!-- Фильтр -->
    <div style="position:relative;display:inline-block;">
      <button class="btn btn-secondary" @click="showFilter = !showFilter">
        <i class="fa-solid fa-filter"></i> Фильтр
      </button>
      <FilterPanel v-if="showFilter" @close="showFilter = false" />
    </div>

    <!-- Сканировать -->
<button
  v-if="perm.canScanBarcode.value && !isMobile"
  class="btn btn-info"
  @click="modals.openBarcodeScanner()"
  title="Сканировать штрихкод"
>
  <i class="fa-solid fa-barcode"></i> Сканировать
</button>

    <!-- Меню «Ещё ▼» -->
    <div class="dropdown" style="position:relative;display:inline-block;">
      <button class="btn btn-secondary" @click.stop="menuOpen = !menuOpen">
        <i class="fa-solid fa-ellipsis"></i> Ещё <i class="fa-solid fa-caret-down"></i>
      </button>
      <div v-if="menuOpen" class="dropdown-menu show" style="display:block;">
        <button
          v-if="perm.canAddPipette.value"
          class="dropdown-item"
          @click="closeMenuAnd('add')"
        >
          <i class="fa-solid fa-plus"></i> Создать оборудование
        </button>

        <div v-if="perm.canAddPipette.value && (perm.canExport.value || perm.canPrintLabels.value)" class="dropdown-divider"></div>

        <button
          v-if="perm.canExport.value"
          class="dropdown-item"
          @click="closeMenuAnd('excel')"
        >
          <i class="fa-solid fa-file-excel"></i> Печать в Excel
        </button>
        <button
          v-if="perm.canExport.value"
          class="dropdown-item"
          @click="closeMenuAnd('pdf')"
        >
          <i class="fa-solid fa-print"></i> Печать в PDF
        </button>

        <div v-if="perm.canExport.value && (perm.canPrintLabels.value || perm.canImport.value)" class="dropdown-divider"></div>

        <button
          v-if="perm.canPrintLabels.value"
          class="dropdown-item"
          @click="closeMenuAnd('labels')"
        >
          <i class="fa-solid fa-tag"></i> Печать этикеток
        </button>
        <button
          v-if="perm.canImport.value"
          class="dropdown-item"
          @click="closeMenuAnd('import')"
        >
          <i class="fa-solid fa-download"></i> Импорт данных
        </button>

        <div
          v-if="perm.canManageSettings.value || hasCustomLayout"
          class="dropdown-divider"
        ></div>

        <button
          v-if="perm.canManageSettings.value"
          class="dropdown-item"
          @click="closeMenuAnd('settings')"
        >
          <i class="fa-solid fa-gear"></i> Настройки
        </button>

        <template v-if="hasCustomLayout">
          <button class="dropdown-item" @click="onResetLayout">
            <i class="fa-solid fa-rotate-left"></i> Сбросить раскладку колонок
          </button>
        </template>

        <div class="dropdown-divider"></div>

        <button class="dropdown-item" @click="closeMenuAnd('compact')">
          <i class="fa-solid fa-arrows-up-down"></i> Компактный режим
        </button>

        <button
          v-if="perm.canViewLog.value"
          class="dropdown-item"
          @click="closeMenuAnd('audit')"
        >
          <i class="fa-solid fa-clipboard-list"></i> Журнал действий
        </button>

        <button class="dropdown-item" @click="closeMenuAnd('help')">
          <i class="fa-solid fa-book-open"></i> Справка
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePipettesStore } from '@/stores/pipettes';
import { useToastStore } from '@/stores/toast';
import { useModals } from '@/composables/useModals';
import { usePermissions } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { useExport } from '@/composables/useExport';
import FilterPanel from '@/components/table/FilterPanel.vue';
import { usePrefsStore } from '@/stores/prefs';
import { showConfirm } from '@/composables/useConfirm';
import { isMobileDevice } from '@/utils/device';
import { useSettingsStore } from '@/stores/settings';
import { isExternalCalibration } from '@/utils/equipment';

const settings = useSettingsStore();
const modals = useModals();
const perm = usePermissions();
const ui = useUiStore();
const exportComposable = useExport();
const pip = usePipettesStore();
const toast = useToastStore();
const prefs = usePrefsStore();
const menuOpen = ref(false);
// === 2.3 === панель фильтра через ui-store
const showFilter = computed({
  get: () => ui.filterPanelOpen,
  set: (v) => v ? ui.openFilterPanel() : ui.closeFilterPanel(),
});

const isMobile = ref(isMobileDevice());

function updateIsMobile() { isMobile.value = isMobileDevice(); }
onMounted(() => window.addEventListener('resize', updateIsMobile));
onUnmounted(() => window.removeEventListener('resize', updateIsMobile));
const hasCustomLayout = computed(
  () =>
    (Array.isArray(prefs.columnOrder) && prefs.columnOrder.length > 0) ||
    (!!prefs.columnWidths && Object.keys(prefs.columnWidths).length > 0)
); 

const selectedToSend = computed(() => {
  return [...pip.selected].filter(id => {
    const p = pip.items.find(x => x.id === id);
    return p
      && !p.sent_for_calibration
      && !p.replacing
      && isExternalCalibration(settings.equipmentTypes, p.equipment_type);
  });
});

const selectedToReturn = computed(() => {
  return [...pip.selected].filter(id => {
    const p = pip.items.find(x => x.id === id);
    return p
      && !!p.sent_for_calibration
      && isExternalCalibration(settings.equipmentTypes, p.equipment_type);
  });
});

const selectedVisible = computed(() => {
  return [...pip.selected].filter(id => pip.items.some(p => p.id === id));
});
  
async function onResetLayout() {
  menuOpen.value = false;
  const ok = await showConfirm(
    'Сбросить порядок и ширину колонок к стандартным?',
    {
      icon: '<i class="fa-solid fa-rotate-left" style="color:#d97706;"></i>',
      title: 'Сброс раскладки',
      okText: 'Сбросить',
      okClass: 'btn-warning',
    }
  );
  
if (!ok) return;

  try {
    await prefs.resetLayout();
    toast.success('Раскладка колонок сброшена');
  } catch (e) {
    toast.error('Не удалось сбросить раскладку');
    console.error('onResetLayout:', e);
  }
}

let searchTimer: number | null = null;

function onSearchInput(e: Event) {
  const value = (e.target as HTMLInputElement).value;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = window.setTimeout(async () => {
    ui.closeFilterPanel(); 
    pip.setSearch(value);
    await pip.loadPaged();
  }, 150);
}

async function closeMenuAnd(action: string) {
  menuOpen.value = false;
  switch (action) {
    case 'compact': {
      document.body.classList.toggle('compact-mode');
      try {
        const on = document.body.classList.contains('compact-mode');
        localStorage.setItem('pipette_compact_mode', on ? '1' : '0');
      } catch { /* ignore */ }
      break;
    }
    case 'add':
      modals.openForm();
      break;
    case 'labels':
      modals.openBarcodePrint();
      break;
    case 'import':
      modals.openImport();
      break;
    case 'settings':
      if (!perm.canManageSettings.value) {
        toast.error('Нет прав на настройки');
        break;
      }
      ui.open('settings');
      break;
    case 'excel':
      await exportComposable.exportToXlsx();
      break;
    case 'pdf':
      await exportComposable.exportToPDF();
      break;
    case 'audit':
      modals.openAudit();
      break;
    case 'help':
      modals.openHelp();
      break;
    default:
      toast.show(`Действие «${action}» — в следующих блоках`, 'warn');
  }
}

function closeOnOutsideClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.dropdown')) menuOpen.value = false;
}

onMounted(() => {
  document.addEventListener('click', closeOnOutsideClick);
  try {
    if (localStorage.getItem('pipette_compact_mode') === '1') {
      document.body.classList.add('compact-mode');
    }
  } catch { /* ignore */ }
});

onUnmounted(() => {
  document.removeEventListener('click', closeOnOutsideClick);
  if (searchTimer) { clearTimeout(searchTimer); searchTimer = null; }
});
</script>

<style scoped>
.search-input {
  flex: 0 1 340px;
  min-width: 220px;
  max-width: 420px;
  padding: 9px 12px 9px 36px;
  border: 1px solid var(--border-hard);
  border-radius: 8px;
  font-size: .9rem;
  background: var(--card);
  color: var(--text-strong);
  outline: none;
  transition: border .2s;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 512 512'><path fill='%2394a3b8' d='M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0s208 93.1 208 208zM208 352c79.5 0 144-64.5 144-144S287.5 64 208 64S64 128.5 64 208s64.5 144 144 144z'/></svg>");
  background-repeat: no-repeat;
  background-position: 12px center;
  background-size: 14px;
}
.search-input:focus { border-color: #6366f1; }
</style>
