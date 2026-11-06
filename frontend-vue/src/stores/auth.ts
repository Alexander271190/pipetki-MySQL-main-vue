import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '@/types';
import * as authApi from '@/api/auth';
import { setAuthToken, loadTokenFromSession } from '@/api/client';

const SESSION_KEY = 'pipette_session';

interface SessionData {
  user: User;
  token: string;
  originalUser?: User;
  originalToken?: string;
}

function readSession(): SessionData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.user && data?.token) return data;
  } catch { /* ignore */ }
  return null;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const originalUser = ref<User | null>(null);
  const originalToken = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value && !!token.value);
  const isAdmin = computed(() => user.value?.isAdmin === true);
  const isImpersonating = computed(() => !!originalUser.value && !!originalToken.value);

  function applySession(data: SessionData) {
    user.value = data.user;
    token.value = data.token;
    originalUser.value = data.originalUser || null;
    originalToken.value = data.originalToken || null;
    setAuthToken(data.token);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  function initFromStorage() {
    const s = readSession();
    if (s) {
      user.value = s.user;
      token.value = s.token;
      originalUser.value = s.originalUser || null;
      originalToken.value = s.originalToken || null;
      loadTokenFromSession();
    }
  }

  async function login(loginStr: string, password: string) {
    const result = await authApi.login(loginStr, password);
    applySession({ user: result.user, token: result.token });
    return result;
  }

  function logout() {
    user.value = null;
    token.value = null;
    originalUser.value = null;
    originalToken.value = null;
    setAuthToken(null);
    sessionStorage.removeItem(SESSION_KEY);
  }

  async function refreshUser() {
    if (!token.value) return;
    try {
      const { user: fresh } = await authApi.verify();
      if (fresh) {
        user.value = fresh;
        const s = readSession();
        if (s) {
          s.user = fresh;
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
        }
      }
    } catch { /* тихо */ }
  }

  function hasPermission(key: string): boolean {
    if (!user.value) return false;
    if (user.value.isAdmin === true) return true;
    const perms = user.value.permissions || user.value.extraPermissions || [];
    return perms.includes(key);
  }

  return {
    user, token, originalUser, originalToken,
    isAuthenticated, isAdmin, isImpersonating,
    initFromStorage, applySession, login, logout, refreshUser, hasPermission,
  };
});

export function usePermissions() {
  const auth = useAuthStore();
  const p = (key: string) => auth.hasPermission(key);

  return {
    canAddPipette:              computed(() => p('add_pipette') || p('manage_pipettes')),
    canEditPipette:             computed(() => p('edit_pipette') || p('manage_pipettes')),
    canDeletePipette:           computed(() => p('delete_pipette') || p('manage_pipettes')),
    canQuickCal:                computed(() => p('quick_calibration') || p('manage_pipettes')),
    canTransferPipette:         computed(() => p('transfer_pipette') || p('manage_pipettes')),
    canBulkSend:                computed(() => p('bulk_send') || p('manage_pipettes')),
    canBulkReturn:              computed(() => p('bulk_return') || p('manage_pipettes')),
    canBulkChangeResponsible:   computed(() => p('bulk_change_responsible') || p('manage_pipettes')),
    canScanBarcode:             computed(() => p('scan_barcode')),
    canPrintLabels:             computed(() => p('print_labels')),
    canExport:                  computed(() => p('export_data')),
    canImport:                  computed(() => p('import_data')),
    canManageUsers:             computed(() => p('manage_users')),
    canManageSettings:          computed(() => p('manage_settings')),
    canManagePrinters:          computed(() => p('manage_printers')),
    canViewLog:                 computed(() => p('view_log')),
    canViewAudit:               computed(() => p('view_audit')),
    canViewHistory:             computed(() => true),
    canManagePipettes:          computed(() =>
      p('manage_pipettes') || p('add_pipette') || p('edit_pipette') ||
      p('delete_pipette') || p('quick_calibration') || p('bulk_send') || p('bulk_return')
    ),
  };
}
