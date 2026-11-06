import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface MenuItem {
  label?: string;
  class?: string;
  divider?: boolean;
  action?: () => void;
}

export const useUiStore = defineStore('ui', () => {
  // Активная модалка: null | 'form' | 'history' | 'quickCal' | 'transfer' | 'changePassword'
  const activeModal = ref<string | null>(null);
  const modalData = ref<unknown>(null);

  function open(name: string, data: unknown = null) {
    activeModal.value = name;
    modalData.value = data;
  }
  function close() {
    activeModal.value = null;
    modalData.value = null;
  }

  // Меню ⋮
  const rowActions = ref<{ anchor: HTMLElement | null; items: MenuItem[] }>({
    anchor: null, items: [],
  });
  function openRowActions(anchor: HTMLElement, items: MenuItem[]) {
    rowActions.value = { anchor, items };
  }
  function closeRowActions() {
    rowActions.value = { anchor: null, items: [] };
  }

  return { activeModal, modalData, open, close, rowActions, openRowActions, closeRowActions };
});
