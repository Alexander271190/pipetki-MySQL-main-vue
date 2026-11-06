<template>
  <div
    v-if="visible"
    class="modal-overlay active"
    :id="id"
    @click.self="onOutsideClick"
  >
    <div class="modal" :class="modalClass" @click.stop>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  visible: boolean;
  id?: string;
  modalClass?: string;
  closeOnOutside?: boolean;
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

function onOutsideClick() {
  if (props.closeOnOutside !== false) emit('close');
}
</script>
