<template>
  <div v-if="state.active" class="modal-overlay prompt-overlay active" @click.self="resolvePrompt(null)">
    <div class="modal prompt-modal" @click.stop>
      <div class="prompt-icon" v-html="state.options.icon ? `<i class='fa-solid ${state.options.icon}'></i>` : '<i class=\'fa-solid fa-comment-dots\'></i>'"></div>
      <h3>{{ state.options.title || 'Введите значение' }}</h3>
      <p class="prompt-message">{{ state.message }}</p>
      <div class="form-group">
        <input
          id="prompt-input"
          v-model="state.value"
          :type="state.options.inputType || 'text'"
          :placeholder="state.options.placeholder || ''"
          :class="{ invalid: state.error }"
          @keydown.enter.prevent="submitPrompt"
          @keydown.esc.prevent="resolvePrompt(null)"
        />
      </div>
      <div v-if="state.error" class="prompt-error" style="display:block;">{{ state.error }}</div>
      <div class="form-actions confirm-actions">
        <button type="button" class="btn btn-secondary" @click="resolvePrompt(null)">Отмена</button>
        <button type="button" class="btn" :class="state.options.okClass || 'btn-primary'" @click="submitPrompt">
          {{ state.options.okText || 'ОК' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePromptState, submitPrompt, resolvePrompt } from '@/composables/usePrompt';
import { onMounted, onUnmounted } from 'vue';

  
const state = usePromptState();

function onKey(e: KeyboardEvent) {
  if (!state.active) return;
  if (e.key === 'Escape') { e.preventDefault(); resolvePrompt(null); }
}
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));  
</script>
