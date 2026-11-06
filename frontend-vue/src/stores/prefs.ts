import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '@/api/settings';

const VIRTUAL_IDS = ['status', 'nextCalibration'];

export const usePrefsStore = defineStore('prefs', () => {
  const loaded = ref(false);
  const visibleFields = ref<string[]>([]);
  const columnOrder = ref<string[]>([]);
  const columnWidths = ref<Record<string, number>>({});
  const virtualsInitialized = ref(false);

  let _saveTimer: number | null = null;

  async function load() {
    try {
      const raw = await api.getMyPrefsEffective();
      applyRaw(raw);
    } catch {
      try {
        const raw = await api.getMyPrefs();
        applyRaw(raw);
      } catch { /* пусть будет пусто */ }
    } finally {
      loaded.value = true;
    }
  }

  function applyRaw(raw: api.UserPrefsRaw) {
    if (Array.isArray(raw.visibleFields)) visibleFields.value = [...raw.visibleFields];
    if (Array.isArray(raw.columnOrder))   columnOrder.value = [...raw.columnOrder];
    if (raw.columnWidths && typeof raw.columnWidths === 'object') {
      columnWidths.value = { ...raw.columnWidths };
    }
    virtualsInitialized.value = !!raw._virtualsInitialized;
  }

  // Синхронизация с активными полями (убирает удалённые, добавляет новые)
  function syncWithFields(activeFieldIds: string[]) {
    const allowed = new Set([...activeFieldIds, ...VIRTUAL_IDS]);
    const current = visibleFields.value.length > 0 ? [...visibleFields.value] : [...activeFieldIds];

    if (current.length === 0) {
      visibleFields.value = [...activeFieldIds, ...VIRTUAL_IDS];
      return;
    }

    const set = new Set(current);
    if (!virtualsInitialized.value) {
      for (const v of VIRTUAL_IDS) set.add(v);
    }
    visibleFields.value = [...set].filter(id => allowed.has(id));
  }

  async function save() {
    if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
    try {
      let existing: api.UserPrefsRaw = {};
      try { existing = await api.getMyPrefs(); } catch { /* ignore */ }
      const merged: api.UserPrefsRaw = {
        ...existing,
        visibleFields: visibleFields.value,
        columnOrder: columnOrder.value,
        columnWidths: columnWidths.value,
        _virtualsInitialized: true,
      };
      await api.saveMyPrefs(merged);
    } catch (e) {
      console.warn('Не удалось сохранить prefs:', e);
    }
  }

  function saveDebounced() {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = window.setTimeout(save, 800);
  }

  function setVisibleFields(list: string[]) {
    visibleFields.value = [...list];
    saveDebounced();
  }

  function setColumnOrder(list: string[]) {
    columnOrder.value = [...list];
    saveDebounced();
  }

  function setColumnWidth(colId: string, width: number) {
    columnWidths.value = { ...columnWidths.value, [colId]: Math.round(width) };
    saveDebounced();
  }

  function resetLayout() {
  columnOrder.value = [];
  columnWidths.value = {};
  void save();
}
  return {
    loaded, visibleFields, columnOrder, columnWidths, virtualsInitialized,
    load, syncWithFields, save, saveDebounced,
    setVisibleFields, setColumnOrder, setColumnWidth, resetLayout,
  };
});
