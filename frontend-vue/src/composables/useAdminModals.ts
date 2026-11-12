import { useUiStore } from '@/stores/ui';
import { usePermissions } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { requirePasswordChange } from './useGuard';

export function useAdminModals() {
  const ui = useUiStore();
  const perm = usePermissions();
  const toast = useToastStore();

  function openChangePassword(mode: 'setup' | 'change' = 'change') {
    ui.open('changePassword', mode);
  }

  async function openUserView(userId: string) {
    if (!await requirePasswordChange()) return;
    if (!perm.canManageUsers.value) { toast.error('Нет прав'); return; }
    ui.open('userView', userId);
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
    openChangePassword, openUserView,
    openImport, openAudit, openEquipmentAudit, openHelp,
  };
}
