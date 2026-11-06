import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ToastMessage } from '@/types';

let _id = 0;

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastMessage[]>([]);

  function show(text: string, type: ToastMessage['type'] = '') {
    const id = ++_id;
    toasts.value.push({ id, text, type });
    const delay = Math.min(10000, Math.max(3000, 2000 + String(text).length * 40));
    setTimeout(() => dismiss(id), delay);
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }

  return {
    toasts,
    show,
    success: (t: string) => show(t, 'success'),
    error: (t: string) => show(t, 'error'),
    warn: (t: string) => show(t, 'warn'),
    dismiss,
  };
});
