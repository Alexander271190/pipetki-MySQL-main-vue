import { onMounted, onUnmounted } from 'vue';
import { useUiStore } from '@/stores/ui';
import { useAuthStore, usePermissions } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { usePipettesStore } from '@/stores/pipettes';
import { useExport } from './useExport';
import { useModals } from './useModals';

export function useHotkeys() {
  const ui = useUiStore();
  const auth = useAuthStore();
  const perm = usePermissions();
  const toast = useToastStore();
  const pip = usePipettesStore();
  const exportComposable = useExport();
  const modals = useModals();

  function handler(e: KeyboardEvent) {
  if (!auth.isAuthenticated) return;
  const tag = (e.target as HTMLElement)?.tagName?.toUpperCase() || '';
  const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
  if (isInput) {
    if (e.key === 'Escape') {
      (e.target as HTMLElement).blur();
    }
    return;
  }

  if (e.key === 'Escape') {
    if (ui.filterPanelOpen) { ui.closeFilterPanel(); return; }
    if (ui.rowActions.anchor) { ui.closeRowActions(); return; }
    if (ui.activeModal) {
      // Не закрываем принудительную смену пароля по Escape
      // (кнопка «Отмена» внутри модалки сама проверит forced)
      if (ui.activeModal === 'changePassword') return;
      ui.close();
      return;
    }
    return;
  }

  if (e.key === '?' && e.shiftKey) {
    e.preventDefault();
    ui.open('help');
    return;
  }

  if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    const s = document.querySelector<HTMLInputElement>('.search-input');
    s?.focus();
    return;
  }

  if (e.key === 'F5') {
    e.preventDefault();
    pip.loadPaged();
    toast.success('Данные обновлены');
    return;
  }

  if (!e.ctrlKey && !e.metaKey) return;
  const k = e.key.toLowerCase();

  if (k === 'n' || k === 'т') {
    e.preventDefault();
    if (perm.canAddPipette.value) void modals.openForm();
    return;
  }
  if (k === 'e' || k === 'у') {
    e.preventDefault();
    if (perm.canExport.value) void exportComposable.exportToXlsx();
    return;
  }
  if (k === 'f' || k === 'а') {
    e.preventDefault();
    // Ctrl+F → toggle filter-panel (как в старом 18-init.js)
    if (ui.filterPanelOpen) ui.closeFilterPanel();
    else ui.openFilterPanel();
    return;
  }
  if (k === 'p' || k === 'з') {
    e.preventDefault();
    if (perm.canPrintLabels.value) void modals.openBarcodePrint();
    return;
  }
  if (k === 'h' || k === 'р') {
    e.preventDefault();
    const selected = [...pip.selected];
    if (selected.length === 1) void modals.openHistory(selected[0]);
    else toast.warn('Выберите ровно один прибор');
    return;
  }
  if ((k === 'a' || k === 'ф') && e.shiftKey) {
    e.preventDefault();
    const selected = [...pip.selected];
    if (selected.length === 1) void modals.openEquipmentAudit(selected[0]);
    else toast.warn('Выберите ровно один прибор');
    return;
  }
}
  onMounted(() => document.addEventListener('keydown', handler));
  onUnmounted(() => document.removeEventListener('keydown', handler));
}
