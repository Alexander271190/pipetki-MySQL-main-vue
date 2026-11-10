<template>
  <div class="toast-host">
    <transition-group name="toast">
      <div
        v-for="t in toast.toasts"
        :key="t.id"
        class="toast show"
        :class="t.type"
        style="white-space: pre-line;"
        @click="toast.dismiss(t.id)"
      >{{ t.text }}</div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from '@/stores/toast';
const toast = useToastStore();
</script>

<style scoped>
.toast-host {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.toast-host .toast {
  position: static;
  pointer-events: auto;
  cursor: pointer;
  opacity: 1;
  transform: none;
}
</style>
