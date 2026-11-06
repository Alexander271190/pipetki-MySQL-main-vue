<template>
  <router-view />
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
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
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
const auth = useAuthStore();
const router = useRouter();
const ui = useUiStore();

onMounted(() => {
  auth.initFromStorage();

  setUnauthorizedHandler(() => {
    auth.logout();
    if (router.currentRoute.value.path !== '/login') router.push('/login');
  });

  setPasswordRequiredHandler((mode) => ui.open('changePassword', mode));
});
</script>
