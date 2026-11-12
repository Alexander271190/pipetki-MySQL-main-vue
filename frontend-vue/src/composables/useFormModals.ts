import { useUiStore, type MenuItem } from '@/stores/ui';
import { usePermissions } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { usePipettesStore } from '@/stores/pipettes';
import { useStatsStore } from '@/stores/stats';
import { showConfirm } from './useConfirm';
import { calcStatus } from '@/utils/status';
import * as api from '@/api/pipettes';
import type { Pipette } from '@/types';
import { showLockWarning } from '@/composables/useLockWarning';
import { requirePasswordChange } from './useGuard';
import { useAdminModals } from './useAdminModals';   // ← для openEquipmentAudit

export function useFormModals() {
  const ui = useUiStore();
  const perm = usePermissions();
  const toast = useToastStore();
  const pip = usePipettesStore();
  const stats = useStatsStore();

  // onRowActions вызывает openEquipmentAudit из admin-группы
  const { openEquipmentAudit } = useAdminModals();

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

  async function onRowActions(id: string, event: MouseEvent) {
    event.stopPropagation();
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
    const p = pip.items.find(x => x.id === id);
    if (!p) return;

    // ── Быстрая пре-проверка по кэшу (как в старом) ──
    const isSent = !!(
      p.sent_for_calibration &&
      String(p.sent_for_calibration).trim() !== '' &&
      String(p.sent_for_calibration) !== 'null'
    );
    const isReplacing = !!(
      p.replacing &&
      String(p.replacing).trim() !== '' &&
      String(p.replacing) !== 'null' &&
      String(p.replacing) !== '0'
    );

    if (isSent) {
      toast.error(
        `Нельзя удалить ${p.id}: прибор отправлен на поверку` +
        (p.replaced_by ? `, замена: ${p.replaced_by}` : '') +
        `. Сначала отмените отправку или оформите возврат.`
      );
      return;
    }
    if (isReplacing) {
      toast.error(
        `Нельзя удалить ${p.id}: прибор используется как замена для ${p.replacing}. ` +
        `Сначала оформите возврат оригинала с поверки.`
      );
      return;
    }

    // ── Полный флоу ──
    if (!await requirePasswordChange()) return;
    if (!perm.canDeletePipette.value) { toast.error('Нет прав на удаление'); return; }

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
      toast.error(
        `Нельзя удалить ${id}: прибор отправлен на поверку` +
        (fresh.replaced_by ? `, замена: ${fresh.replaced_by}` : '') +
        `. Сначала отмените отправку или оформите возврат.`
      );
      api.releaseLock(id).catch(() => {});
      return;
    }
    if (fresh?.replacing) {
      toast.error(
        `Нельзя удалить ${id}: прибор используется как замена для ${fresh.replacing}. ` +
        `Сначала оформите возврат оригинала с поверки.`
      );
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

  return {
    openForm, openHistory, openQuickCal, openTransfer,
    onRowActions, cancelSendConfirm, deleteConfirm,
  };
}
