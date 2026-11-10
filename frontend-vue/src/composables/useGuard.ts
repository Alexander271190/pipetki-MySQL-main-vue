import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { useToastStore } from '@/stores/toast';

export async function requirePasswordChange(): Promise<boolean> {
  const auth = useAuthStore();
  const ui = useUiStore();
  const toast = useToastStore();

  await auth.refreshUser();

  const u = auth.user;
  if (!u) return true;
  if (!u.mustSetPassword && !u.mustChangePassword) return true;

  const mode = u.mustSetPassword ? 'setup' : 'change';
  ui.open('changePassword', mode);
  toast.warn('Для продолжения работы необходимо сменить пароль');
  return false;
}
