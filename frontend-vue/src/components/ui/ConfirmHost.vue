<template>
  <div v-if="state.active" class="modal-overlay confirm-overlay active" @click.self="resolveConfirm(false)">
    <div class="modal confirm-modal" @click.stop>
      <div class="confirm-icon" v-html="state.options.icon || '<i class=\'fa-solid fa-triangle-exclamation\'></i>'"></div>
      <h3>{{ state.options.title || 'Подтверждение' }}</h3>
      <p class="confirm-message">{{ state.message }}</p>
      <div class="form-actions confirm-actions">
        <button
          v-if="!state.options.hideCancel"
          type="button"
          class="btn btn-secondary"
          @click="resolveConfirm(false)"
        >{{ state.options.cancelText || 'Отмена' }}</button>
        <button
          type="button"
          class="btn"
          :class="state.options.okClass || 'btn-danger'"
          @click="resolveConfirm(true)"
        >{{ state.options.okText || 'ОК' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useConfirmState, resolveConfirm } from '@/composables/useConfirm';

const state = useConfirmState();

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && state.active) resolveConfirm(false);
}
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>
