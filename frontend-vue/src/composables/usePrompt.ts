import { reactive } from 'vue';

export interface PromptOptions {
  icon?: string;
  title?: string;
  okText?: string;
  okClass?: string;
  placeholder?: string;
  defaultValue?: string;
  inputType?: string;
  validator?: (v: string) => string | null;
}

const state = reactive({
  active: false,
  message: '',
  value: '',
  error: '',
  options: {} as PromptOptions,
  resolver: null as ((v: string | null) => void) | null,
});

export function showPrompt(message: string, options: PromptOptions = {}): Promise<string | null> {
  if (state.resolver) {
    const prev = state.resolver;
    state.resolver = null;
    prev(null);
  }
  return new Promise<string | null>(resolve => {
    state.message = message;
    state.options = options;
    state.value = options.defaultValue || '';
    state.error = '';
    state.active = true;
    state.resolver = resolve;
    setTimeout(() => {
     const el = document.getElementById('prompt-input') as HTMLInputElement | null;
     if (el) { el.focus(); el.select(); }
    }, 100);
  });
}

export function submitPrompt() {
  if (!state.resolver) return;
  const value = state.value.trim();
  if (state.options.validator) {
    const err = state.options.validator(value);
    if (err) { state.error = err; return; }
  }
  state.active = false;
  state.error = '';
  const r = state.resolver;
  state.resolver = null;
  if (r) r(value);
}

export function resolvePrompt(value: string | null) {
  state.active = false;
  state.error = '';
  const r = state.resolver;
  state.resolver = null;
  if (r) r(value);
}

export function usePromptState() {
  return state;
}
