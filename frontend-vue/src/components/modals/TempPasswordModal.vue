<template>
  <AppModal :visible="ui.activeModal === 'tempPassword'" @close="close">
    <h2><i class="fa-solid fa-key"></i> Разовый пароль</h2>
    <div class="warning-block" style="margin-bottom:16px;">
      Сообщите пароль пользователю. После входа система попросит его сменить.
    </div>
    <div class="form-group">
      <label>Логин</label>
      <input :value="data.login" readonly style="background:#f1f5f9;cursor:not-allowed;" />
    </div>
    <div class="form-group">
      <label>ФИО</label>
      <input :value="data.fullName" readonly style="background:#f1f5f9;cursor:not-allowed;" />
    </div>
    <div class="form-group">
      <label>Пароль</label>
      <div style="display:flex;gap:8px;">
        <input :value="data.password" readonly style="background:#f1f5f9;font-family:monospace;font-size:1rem;letter-spacing:1px;cursor:not-allowed;" />
        <button type="button" class="btn btn-primary" @click="copy" style="flex-shrink:0;">
          <i class="fa-solid fa-copy"></i> Скопировать
        </button>
      </div>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" @click="close">Закрыть</button>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { useToastStore } from '@/stores/toast';

const ui = useUiStore();
const toast = useToastStore();

const data = computed(() => (ui.modalData as { login: string; fullName: string; password: string }) || { login: '', fullName: '', password: '' });

async function copy() {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(data.value.password);
      toast.success('Скопировано');
      return;
    }
  } catch { /* ignore */ }
  // fallback
  const ta = document.createElement('textarea');
  ta.value = data.value.password;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  toast.show(ok ? 'Скопировано' : 'Не удалось. Скопируйте вручную', ok ? 'success' : 'error');
}

function close() { ui.close(); }
</script>
