import { reactive } from 'vue';

export interface ConfirmOptions {
  icon?: string;
  title?: string;
  okText?: string;
  cancelText?: string;
  okClass?: string;
  hideCancel?: boolean;
}

const state = reactive({
  active: false,
  message: '',
  options: {} as ConfirmOptions,
  resolver: null as ((v: boolean) => void) | null,
});

export function showConfirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  if (state.resolver) {
    const prev = state.resolver;
    state.resolver = null;
    prev(false);
  }
  return new Promise<boolean>(resolve => {
    state.message = message;
    state.options = options;
    state.active = true;
    state.resolver = resolve;
  });
}

export function resolveConfirm(result: boolean) {
  state.active = false;
  const r = state.resolver;
  state.resolver = null;
  if (r) r(result);
}

export function useConfirmState() {
  return state;
}
