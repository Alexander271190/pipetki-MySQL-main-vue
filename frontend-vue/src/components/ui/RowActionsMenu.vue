<template>
  <div v-if="ui.rowActions.anchor" ref="menuRef" class="row-actions-menu" :style="positionStyle">
    <template v-for="(item, i) in ui.rowActions.items" :key="i">
      <div v-if="item.divider" class="row-actions-divider"></div>
      <button
        v-else
        type="button"
        class="row-actions-item"
        :class="item.class"
        @click="onClick(item)"
      >
        <span v-html="item.label"></span>
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useUiStore, type MenuItem } from '@/stores/ui';

const ui = useUiStore();
const menuRef = ref<HTMLElement | null>(null);
const positionStyle = ref({ top: '0px', left: '0px' });

function updatePosition() {
  const anchor = ui.rowActions.anchor;
  if (!anchor || !menuRef.value) return;
  const rect = anchor.getBoundingClientRect();
  const menuRect = menuRef.value.getBoundingClientRect();

  const spaceBelow = window.innerHeight - rect.bottom;
  const top = spaceBelow < menuRect.height + 10
    ? Math.max(8, rect.top - menuRect.height - 6)
    : rect.bottom + 6;

  let left = rect.right - menuRect.width;
  if (left < 8) left = 8;
  if (left + menuRect.width > window.innerWidth - 8) left = window.innerWidth - menuRect.width - 8;

  positionStyle.value = { top: `${top}px`, left: `${left}px` };
}

watch(() => ui.rowActions.anchor, async (anchor) => {
  if (anchor) {
    await nextTick();
    updatePosition();
  }
}, { immediate: true });

function onClick(item: MenuItem) {
  try { item.action?.(); } finally { ui.closeRowActions(); }
}

function onOutsideClick(e: MouseEvent) {
  if (!ui.rowActions.anchor) return;
  const target = e.target as HTMLElement;
  if (menuRef.value && !menuRef.value.contains(target) && !ui.rowActions.anchor.contains(target)) {
    ui.closeRowActions();
  }
}

function onScrollOrResize() {
  if (ui.rowActions.anchor) ui.closeRowActions();
}

onMounted(() => {
  document.addEventListener('mousedown', onOutsideClick, true);
  window.addEventListener('scroll', onScrollOrResize, true);
  window.addEventListener('resize', onScrollOrResize);
});
onUnmounted(() => {
  document.removeEventListener('mousedown', onOutsideClick, true);
  window.removeEventListener('scroll', onScrollOrResize, true);
  window.removeEventListener('resize', onScrollOrResize);
});
</script>
