<template>
  <div
    v-if="wasVisible"
    v-show="visible"
    class="modal-overlay"
    :class="{ active: visible }"
    :id="id"
    @pointerdown="onPointerDown"
    @click.self="onOutsideClick"
  >
    <div class="modal" :class="modalClass" ref="modalEl" @click.stop>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
  id?: string;
  modalClass?: string;
  closeOnOutside?: boolean;
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

const wasVisible = ref(false);
const modalEl = ref<HTMLElement | null>(null);
const isMouseDownOnModal = ref(false);

watch(() => props.visible, (v) => {
  if (v) {
    wasVisible.value = true;
  } else {
    
    const m = modalEl.value;
    if (m) {
      m.style.width = '';
      m.style.height = '';
      m.style.maxWidth = '';
      m.style.maxHeight = '';
    }
    
    isMouseDownOnModal.value = false;
  }
}, { immediate: true });

function onPointerDown(e: PointerEvent) {
  
  const m = modalEl.value;
  isMouseDownOnModal.value = !!(m && m.contains(e.target as Node));
}

function onOutsideClick() {
  
  if (isMouseDownOnModal.value) {
    isMouseDownOnModal.value = false;
    return;
  }
  if (props.closeOnOutside !== false) emit('close');
}
</script>
