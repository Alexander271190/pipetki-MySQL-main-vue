<template>
  <div
    v-if="wasVisible"
    v-show="visible"
    class="modal-overlay"
    :class="{ active: visible }"
    :id="id"
    @click.self="onOutsideClick"
  >
    <div class="modal" :class="modalClass" @click.stop>
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

watch(() => props.visible, (v) => {
  if (v) wasVisible.value = true;
}, { immediate: true });

function onOutsideClick() {
  if (props.closeOnOutside !== false) emit('close');
}
</script>
