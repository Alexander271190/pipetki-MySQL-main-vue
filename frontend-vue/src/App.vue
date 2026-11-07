<template>
  <router-view :key="sessionKey" />
  <ToastHost />
  <ConfirmHost />
  <PromptHost />
  <RowActionsMenu />

  <PipetteFormModal />
  <HistoryModal />
  <QuickCalModal />
  <TransferModal />
  <ChangePasswordModal />

  <BulkSendModal />
  <BulkReturnModal />
  <BulkResponsibleModal />
  <BarcodeScannerModal />
  <BarcodePrintModal />
  <ImportModal />

  <SettingsModal />

  <UserEditModal />
  <TempPasswordModal />
  <HistoryExportModal />

  <AuditModal />
  <EquipmentAuditModal />
  <HotkeysModal />
  <RemindersModal />
  <UserViewModal />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { setUnauthorizedHandler, setPasswordRequiredHandler } from '@/api/client';
import { useRouter } from 'vue-router';
import { useUiStore } from '@/stores/ui';
import ToastHost from '@/components/ui/ToastHost.vue';
import ConfirmHost from '@/components/ui/ConfirmHost.vue';
import PromptHost from '@/components/ui/PromptHost.vue';
import RowActionsMenu from '@/components/ui/RowActionsMenu.vue';
import PipetteFormModal from '@/components/modals/PipetteFormModal.vue';
import HistoryModal from '@/components/modals/HistoryModal.vue';
import QuickCalModal from '@/components/modals/QuickCalModal.vue';
import TransferModal from '@/components/modals/TransferModal.vue';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal.vue';
import BulkSendModal from '@/components/modals/BulkSendModal.vue';
import BulkReturnModal from '@/components/modals/BulkReturnModal.vue';
import BulkResponsibleModal from '@/components/modals/BulkResponsibleModal.vue';
import BarcodeScannerModal from '@/components/modals/BarcodeScannerModal.vue';
import BarcodePrintModal from '@/components/modals/BarcodePrintModal.vue';
import ImportModal from '@/components/modals/ImportModal.vue';
import SettingsModal from '@/components/settings/SettingsModal.vue';
import UserEditModal from '@/components/modals/UserEditModal.vue';
import TempPasswordModal from '@/components/modals/TempPasswordModal.vue';
import HistoryExportModal from '@/components/modals/HistoryExportModal.vue';
import AuditModal from '@/components/modals/AuditModal.vue';
import EquipmentAuditModal from '@/components/modals/EquipmentAuditModal.vue';
import HotkeysModal from '@/components/modals/HotkeysModal.vue';
import RemindersModal from '@/components/modals/RemindersModal.vue';
import UserViewModal from '@/components/modals/UserViewModal.vue';

const auth = useAuthStore();
const router = useRouter();
const ui = useUiStore();
const sessionKey = ref(0);

function checkMustChangePassword() {
  if (!auth.user) return;
  if (auth.user.mustSetPassword) {
    ui.open('changePassword', 'setup');
  } else if (auth.user.mustChangePassword) {
    ui.open('changePassword', 'change');
  }
}

function onAuthChanged() {
  ui.close();                    
  checkMustChangePassword();        
  sessionKey.value++;
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible' && auth.isAuthenticated) {
    auth.refreshUser();
  }
}
function onWindowFocus() {
  if (auth.isAuthenticated) auth.refreshUser();
}

onMounted(() => {
  auth.initFromStorage();
  checkMustChangePassword();        
  void auth.refreshUser();          

  setUnauthorizedHandler(() => {
    ui.close();                     
    auth.logout();
    if (router.currentRoute.value.path !== '/login') router.push('/login');
  });

  setPasswordRequiredHandler((mode) => ui.open('changePassword', mode));

  window.addEventListener('auth:changed', onAuthChanged);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('focus', onWindowFocus);
  document.addEventListener('pointerdown', onModalResizePointerDown);
});

onUnmounted(() => {
  window.removeEventListener('auth:changed', onAuthChanged);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('focus', onWindowFocus);
  document.removeEventListener('pointerdown', onModalResizePointerDown);
});

// ═══ РЕСАЙЗ МОДАЛОК за правый нижний угол ═══
let activeModal: HTMLElement | null = null;
let startX = 0, startY = 0, startW = 0, startH = 0;
let minW = 0, minH = 0;

function onModalResizePointerDown(e: PointerEvent) {
  if (window.innerWidth < 768) return;
  const target = e.target as HTMLElement;
  if (!target || !target.closest) return;
  const modal = target.closest('.modal') as HTMLElement;
  if (!modal) return;

  const rect = modal.getBoundingClientRect();
  const dx = rect.right - e.clientX;
  const dy = rect.bottom - e.clientY;
  if (dx < 0 || dy < 0) return;
  if (dx > 40 || dy > 40) return;

  e.preventDefault();
  activeModal = modal;
  startX = e.clientX;
  startY = e.clientY;
  startW = rect.width;
  startH = rect.height;

  const cs = getComputedStyle(modal);
  minW = parseInt(cs.minWidth, 10) || 400;
  minH = parseInt(cs.minHeight, 10) || 300;

  document.addEventListener('pointermove', onModalResizePointerMove);
  document.addEventListener('pointerup', onModalResizePointerUp);
  document.body.style.cursor = 'nwse-resize';
  document.body.style.userSelect = 'none';
}

function onModalResizePointerMove(e: PointerEvent) {
  if (!activeModal) return;
  const w = Math.max(minW, startW + (e.clientX - startX));
  const h = Math.max(minH, startH + (e.clientY - startY));
  activeModal.style.width = w + 'px';
  activeModal.style.height = h + 'px';
  activeModal.style.maxWidth = 'none';
  activeModal.style.maxHeight = 'none';
}

function onModalResizePointerUp() {
  if (!activeModal) return;
  activeModal = null;
  document.removeEventListener('pointermove', onModalResizePointerMove);
  document.removeEventListener('pointerup', onModalResizePointerUp);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
}
</script>
