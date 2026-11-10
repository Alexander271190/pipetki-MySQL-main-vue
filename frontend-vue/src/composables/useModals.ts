import { useUiStore, type MenuItem } from '@/stores/ui';
import { useAuthStore, usePermissions } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { usePipettesStore } from '@/stores/pipettes';
import { useStatsStore } from '@/stores/stats';
import { showConfirm } from './useConfirm';
import { calcStatus } from '@/utils/status';
import * as api from '@/api/pipettes';
import type { Pipette } from '@/types';
import { showLockWarning } from '@/composables/useLockWarning';
import { requirePasswordChange } from './useGuard';

export function useModals() {
  const ui = useUiStore();
  const auth = useAuthStore();
  const perm = usePermissions();
  const toast = useToastStore();
  const pip = usePipettesStore();
  const stats = useStatsStore();

  async function openForm(id?: string) {
    if (!await requirePasswordChange()) return;
    const isEdit = !!id;
    const can = isEdit ? perm.canEditPipette.value : perm.canAddPipette.value;
    if (!can) { toast.error(isEdit ? 'Нет прав на редактирование' : 'Нет прав на добавление'); return; }
    ui.open('form', id ?? null);
  }

  async function openHistory(id: string) {
    if (!await requirePasswordChange()) return;
    ui.open('history', id);
  }

  async function openQuickCal(id: string) {
    if (!await requirePasswordChange()) return;
    if (!perm.canQuickCal.value) { toast.error('Нет прав на быструю поверку'); return; }
    ui.open('quickCal', id);
  }

  async function openTransfer(id: string) {
    if (!await requirePasswordChange()) return;
    if (!perm.canTransferPipette.value) { toast.error('Нет прав на передачу'); return; }
    ui.open('transfer', id);
  }

  function openChangePassword(mode: 'setup' | 'change' = 'change') {
    ui.open('changePassword', mode);
  }

  async function openUserView(userId: string) {
    if (!await requirePasswordChange()) return;
    if (!perm.canManageUsers.value) { toast.error('Нет прав'); return; }
    ui.open('userView', userId);
  }

  async function onRowActions(id: string, event: MouseEvent) {
    event.stopPropagation();
    if (!await requirePasswordChange()) return;
    const p = pip.items.find(x => x.id === id);
    if (!p) return;
    const status = calcStatus(p);
    const items: MenuItem[] = [];

    if (perm.canQuickCal.value) {
      items.push({
        label: status === 'sent'
          ? '<i class="fa-solid fa-rotate-left"></i> Вернулась с поверки'
          : '<i class="fa-solid fa-clipboard-check"></i> Быстрая поверка',
        class: 'item-success',
        action: () => openQuickCal(id),
      });
    }
    if (perm.canEditPipette.value) {
      items.push({
        label: '<i class="fa-solid fa-pen"></i> Редактировать',
        action: () => openForm(id),
      });
    }
    if (perm.canTransferPipette.value) {
      items.push({
        label: '<i class="fa-solid fa-right-left"></i> Передать в другой отдел',
        action: () => openTransfer(id),
      });
    }
    if (perm.canViewHistory.value) {
      const count = p.history_count || 0;
      items.push({
        label: `<i class="fa-solid fa-clock-rotate-left"></i> История поверок${count > 0 ? ` (${count})` : ''}`,
        action: () => openHistory(id),
      });
    }
    if (perm.canViewAudit.value) {
      items.push({
        label: '<i class="fa-solid fa-clipboard-list"></i> Аудит изменений',
        action: () => openEquipmentAudit(id),
      });
    }

    if (status === 'sent' && perm.canBulkSend.value) {
      items.push({ divider: true });
      items.push({
        label: '<i class="fa-solid fa-xmark"></i> Отменить отправку',
        class: 'item-warning',
        action: () => cancelSendConfirm(id),
      });
    }

    if (perm.canDeletePipette.value) {
      items.push({ divider: true });
      items.push({
        label: '<i class="fa-solid fa-trash"></i> Удалить',
        class: 'item-danger',
        action: () => deleteConfirm(id),
      });
    }

    ui.openRowActions(event.currentTarget as HTMLElement, items);
  }

  async function cancelSendConfirm(id: string) {
    if (!await requirePasswordChange()) return;
    if (!perm.canBulkSend.value) {
      toast.error('Нет прав на отмену отправки');
      return;
    }

    const p = pip.items.find(x => x.id === id);
    if (!p) return;

    try {
      const lockRes = await api.getLock(id);
      if (lockRes.locked && !lockRes.mine) {
        const proceed = await showLockWarning(lockRes, 'Отмены отправки');
        if (!proceed) return;
      }
      await api.setLock(id);
    } catch {
      toast.error('Ошибка проверки блокировки');
      return;
    }

    const hasRepl = !!p.replaced_by;
    const msg = hasRepl
      ? `Отменить отправку «${id}» на поверку?\n\nЗамена «${p.replaced_by}» вернётся на склад.`
      : `Отменить отправку «${id}» на поверку?`;

    const ok = await showConfirm(msg, {
      icon: '↩️', title: 'Отмена отправки', okText: 'Отменить', okClass: 'btn-warning',
    });
    if (!ok) {
      api.releaseLock(id).catch(() => {});
      return;
    }

    try {
      await api.cancelSend(id);
      toast.success('Отправка отменена');
      await pip.loadPaged();
      await stats.load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      api.releaseLock(id).catch(() => {});
    }
  }

  async function deleteConfirm(id: string) {
    if (!await requirePasswordChange()) return;
    if (!perm.canDeletePipette.value) { toast.error('Нет прав на удаление'); return; }
    const p = pip.items.find(x => x.id === id);
    if (!p) return;

    try {
      const lockRes = await api.getLock(id);
      if (lockRes.locked && !lockRes.mine) {
        const proceed = await showLockWarning(lockRes, 'Удаления');
        if (!proceed) return;
      }
      await api.setLock(id);
    } catch {
      toast.error('Ошибка проверки блокировки');
      return;
    }

    let fresh: Pipette | null = null;
    try { fresh = await api.getById(id); } catch { /* ignore */ }

    if (fresh?.sent_for_calibration) {
      toast.error(`Нельзя удалить ${id}: прибор отправлен на поверку`);
      api.releaseLock(id).catch(() => {});
      return;
    }
    if (fresh?.replacing) {
      toast.error(`Нельзя удалить ${id}: прибор используется как замена для ${fresh.replacing}`);
      api.releaseLock(id).catch(() => {});
      return;
    }

    const ok = await showConfirm(
      `Удалить оборудование «${id}» вместе со всей историей поверок? Действие необратимо.`,
      { icon: '🗑️', title: 'Удаление', okText: 'Удалить', okClass: 'btn-danger' }
    );
    if (!ok) {
      api.releaseLock(id).catch(() => {});
      return;
    }

    try {
      await api.deletePipette(id);
      toast.success('Оборудование удалено');
      await pip.loadPaged();
      await stats.load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      api.releaseLock(id).catch(() => {});
    }
  }

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

  async function openImport() {
    if (!await requirePasswordChange()) return;
    if (!perm.canImport.value) { toast.error('Нет прав на импорт'); return; }
    ui.open('import');
  }

  async function openAudit() {
    if (!await requirePasswordChange()) return;
    if (!perm.canViewLog.value) { toast.error('Нет прав на журнал'); return; }
    ui.open('audit');
  }

  async function openEquipmentAudit(id: string) {
    if (!await requirePasswordChange()) return;
    if (!perm.canViewAudit.value) { toast.error('Нет прав на аудит'); return; }
    ui.open('equipmentAudit', id);
  }

  function openHelp() { ui.open('help'); }

  return {
    openForm, openHistory, openQuickCal, openTransfer, openChangePassword,
    onRowActions, cancelSendConfirm, deleteConfirm,
    openBulkSend, openBulkReturn, openBulkResponsible,
    openBarcodeScanner, openBarcodePrint, openImport,
    openAudit, openEquipmentAudit, openHelp,
    openUserView,
  };
}
