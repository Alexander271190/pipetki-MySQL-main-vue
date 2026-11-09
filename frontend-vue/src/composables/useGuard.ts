import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { useToastStore } from '@/stores/toast';

/**
 * Проверяет: должен ли пользователь сменить пароль.
 * Если да — открывает модалку и возвращает false.
 * Если нет — true (можно продолжать).
 */
export function requirePasswordChange(): boolean {
  const auth = useAuthStore();
  const ui = useUiStore();
  const toast = useToastStore();

  const u = auth.user;
  if (!u) return true;
  if (!u.mustSetPassword && !u.mustChangePassword) return true;

  const mode = u.mustSetPassword ? 'setup' : 'change';
  ui.open('changePassword', mode);
  toast.warn('Для продолжения работы необходимо сменить пароль');
  return false;
}
