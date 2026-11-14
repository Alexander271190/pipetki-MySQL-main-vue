import { useUiStore } from '@/stores/ui';
import { usePermissions } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { usePipettesStore } from '@/stores/pipettes';
import { requirePasswordChange } from './useGuard';

export function useBulkModals() {
  const ui = useUiStore();
  const perm = usePermissions();
  const toast = useToastStore();
  const pip = usePipettesStore();

  async function openBulkSend() {
    if (!await requirePasswordChange()) return;
    if (!perm.canBulkSend.value) { toast.error('Нет прав на отправку'); return; }
    const ids = [...pip.selected].filter(id => pip.items.some(p => p.id === id));
    if (ids.length === 0) { toast.error('Ничего не выбрано'); return; }
    ui.open('bulkSend', ids);
  }

  async function openBulkReturn() {
    if (!await requirePasswordChange()) return;
    if (!perm.canBulkReturn.value) { toast.error('Нет прав на возврат'); return; }
    const ids = [...pip.selected].filter(id => pip.items.some(p => p.id === id));
    if (ids.length === 0) { toast.error('Ничего не выбрано'); return; }
    ui.open('bulkReturn', ids);
  }

  async function openBulkResponsible() {
    if (!await requirePasswordChange()) return;
    if (!perm.canBulkChangeResponsible.value) { toast.error('Нет прав на смену ответственного'); return; }
    const ids = [...pip.selected].filter(id => pip.items.some(p => p.id === id));
    if (ids.length === 0) { toast.error('Ничего не выбрано'); return; }
    ui.open('bulkResponsible', ids);
  }

  async function openBarcodeScanner() {
    if (!await requirePasswordChange()) return;
    if (!perm.canScanBarcode.value) { toast.error('Нет прав на сканирование'); return; }
    ui.open('barcodeScanner');
  }

  async function openBarcodePrint() {
    if (!await requirePasswordChange()) return;
    if (!perm.canPrintLabels.value) { toast.error('Нет прав на печать этикеток'); return; }
    ui.open('barcodePrint');
  }

  async function openBulkDelete() {
    if (!await requirePasswordChange()) return;
    if (!perm.canDeletePipette.value) { toast.error('Нет прав на удаление'); return; }
    const ids = [...pip.selected].filter(id => pip.items.some(p => p.id === id));
    if (ids.length === 0) { toast.error('Ничего не выбрано'); return; }
    ui.open('bulkDelete', ids);
  }

  return {
    openBulkSend, openBulkReturn, openBulkResponsible,
    openBarcodeScanner, openBarcodePrint, openBulkDelete,
  };
}
