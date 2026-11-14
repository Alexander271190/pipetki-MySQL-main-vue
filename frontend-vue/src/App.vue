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
  <BulkDeleteModal />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineAsyncComponent, watch, h } from 'vue'; 
import type { Component } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { setUnauthorizedHandler, setPasswordRequiredHandler } from '@/api/client';
import { useRouter } from 'vue-router';
import { useUiStore } from '@/stores/ui';
import ToastHost from '@/components/ui/ToastHost.vue';
import ConfirmHost from '@/components/ui/ConfirmHost.vue';
import PromptHost from '@/components/ui/PromptHost.vue';
import RowActionsMenu from '@/components/ui/RowActionsMenu.vue';

// Синхронно — критичные модалки (могут открыться сразу после логина / создания юзера)
import ChangePasswordModal from '@/components/modals/ChangePasswordModal.vue';
import TempPasswordModal from '@/components/modals/TempPasswordModal.vue';
import RemindersModal from '@/components/modals/RemindersModal.vue';
import { useSettingsStore } from '@/stores/settings';

 //  Устойчивая обёртка для async-компонентов
// - при обрыве сети — 2 попытки загрузить чанк
// - при окончательной неудаче — понятное сообщение вместо белого экрана
function safeAsync(loader: () => Promise<unknown>) {
  return defineAsyncComponent({
    loader: loader as () => Promise<Component>,
    timeout: 15000,
    onError(error, retry, fail, attempts) {
      console.warn(`[safeAsync] load failed (attempt ${attempts}):`, error);
      if (attempts <= 2) retry();
      else fail();
    },
    loadingComponent: { render: () => null },
    errorComponent: {
      render: () => h('div', { class: 'modal-overlay active' }, [
        h('div', {
          class: 'modal',
          style: { maxWidth: '400px', textAlign: 'center', padding: '30px' },
        }, [
          h('div', { style: { fontSize: '3rem', marginBottom: '10px' } }, '⚠️'),
          h('h3', { style: { color: '#dc2626' } }, 'Ошибка загрузки'),
          h('p', { style: { color: '#64748b', marginBottom: '20px' } },
            'Не удалось загрузить компонент. Проверьте соединение.'),
          h('button', {
            class: 'btn btn-primary',
            onClick: () => location.reload(),
          }, 'Обновить'),
        ]),
      ]),
    },
  });
}
  
// Асинхронно — большие/редкие модалки (грузятся при первом открытии)
const PipetteFormModal = safeAsync(() => import('@/components/modals/PipetteFormModal.vue'));
const HistoryModal = safeAsync(() => import('@/components/modals/HistoryModal.vue'));
const QuickCalModal = safeAsync(() => import('@/components/modals/QuickCalModal.vue'));
const TransferModal = safeAsync(() => import('@/components/modals/TransferModal.vue'));
const BulkSendModal = safeAsync(() => import('@/components/modals/BulkSendModal.vue'));
const BulkReturnModal = safeAsync(() => import('@/components/modals/BulkReturnModal.vue'));
const BulkResponsibleModal = safeAsync(() => import('@/components/modals/BulkResponsibleModal.vue'));
const BarcodeScannerModal = safeAsync(() => import('@/components/modals/BarcodeScannerModal.vue'));
const BarcodePrintModal = safeAsync(() => import('@/components/modals/BarcodePrintModal.vue'));
const ImportModal = safeAsync(() => import('@/components/modals/ImportModal.vue'));
const SettingsModal = safeAsync(() => import('@/components/settings/SettingsModal.vue'));
const UserEditModal = safeAsync(() => import('@/components/modals/UserEditModal.vue'));
const HistoryExportModal = safeAsync(() => import('@/components/modals/HistoryExportModal.vue'));
const AuditModal = safeAsync(() => import('@/components/modals/AuditModal.vue'));
const EquipmentAuditModal = safeAsync(() => import('@/components/modals/EquipmentAuditModal.vue'));
const HotkeysModal = safeAsync(() => import('@/components/modals/HotkeysModal.vue'));
const UserViewModal = safeAsync(() => import('@/components/modals/UserViewModal.vue'));
const auth = useAuthStore();
const settings = useSettingsStore();  
const router = useRouter();
const ui = useUiStore();
const sessionKey = ref(0);
const BulkDeleteModal = safeAsync(() => import('@/components/modals/BulkDeleteModal.vue'));
  
let _lastUserId: string | null = null;
    
function checkMustChangePassword() {
  if (!auth.user) return;
  if (auth.user.mustSetPassword) {
    ui.open('changePassword', 'setup');
  } else if (auth.user.mustChangePassword) {
    ui.open('changePassword', 'change');
  }
}

function onAuthChanged() {
  const currentId = auth.user?.id ?? null;
  const userChanged = _lastUserId !== currentId;
  _lastUserId = currentId;
  
  if (userChanged) {
    ui.close();
    sessionKey.value++;
  }

  checkMustChangePassword();
}
function onVisibilityChange() {
  if (document.visibilityState === 'visible' && auth.isAuthenticated) {
    auth.refreshUser();
  }
}
function onWindowFocus() {
  if (auth.isAuthenticated) auth.refreshUser();
}

// Применять плотность при загрузке настроек (если пользователь не переключал)
watch(
  () => settings.systemSettings,
  (s) => {
    if (!s || Object.keys(s).length === 0) return;
    const userChoice = localStorage.getItem('pipette_compact_mode');
    if (userChoice !== null) return;
    try {
      const tv = settings.getTableViewSettings();
      document.body.classList.remove('compact-mode', 'loose-mode');
      if (tv.density === 'compact') document.body.classList.add('compact-mode');
      else if (tv.density === 'loose') document.body.classList.add('loose-mode');
    } catch (e) {
      console.warn('[App] density apply failed:', e);
    }
  },
  { immediate: true, deep: true }
);

onMounted(() => {
  auth.initFromStorage();
  _lastUserId = auth.user?.id ?? null; 
  checkMustChangePassword();        
  void auth.refreshUser();          

  //  Применить дефолтную плотность (если пользователь не переключал)
  try {
    const tv = settings.getTableViewSettings();
    const userChoice = localStorage.getItem('pipette_compact_mode');
    if (userChoice === null) {
      if (tv.density === 'compact') document.body.classList.add('compact-mode');
      else if (tv.density === 'loose') document.body.classList.add('loose-mode');
    }
  } catch (e) {
    console.warn('[App] density apply failed:', e);
  }  

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
