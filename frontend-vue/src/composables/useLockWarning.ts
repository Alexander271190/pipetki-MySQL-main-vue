import { showConfirm } from './useConfirm';
import { useToastStore } from '@/stores/toast';
import { apiRequest } from '@/api/client';

interface LockResponse {
  locked: boolean;
  mine?: boolean;
  lockedBy?: string;
  lockedByPosition?: string;
  pipetteId?: string;
}

export async function showLockWarning(lockRes: LockResponse, actionName: string): Promise<boolean> {
  const toast = useToastStore();
  const name = lockRes.lockedBy || 'Другой пользователь';
  const posText = lockRes.lockedByPosition ? ` (${lockRes.lockedByPosition})` : '';

  const ok = await showConfirm(
    `Пользователь ${name}${posText} уже редактирует этот прибор.\n\nВы хотите снять блокировку, чтобы ${actionName.toLowerCase()}?`,
    {
      icon: '<i class="fa-solid fa-lock" style="color: #eab308;"></i>',
      title: 'Внимание',
      okText: 'Да',
      cancelText: 'Нет',
      okClass: 'btn-danger',
    }
  );

  if (!ok) return false;

  const id = lockRes.pipetteId;
  if (!id) return true;

  try {
    await apiRequest(`/pipettes/${encodeURIComponent(id)}/lock?force=true`, 'DELETE');
    toast.success('Блокировка снята');
    return true;
  } catch {
    toast.error('Ошибка снятия блокировки');
    return false;
  }
}
