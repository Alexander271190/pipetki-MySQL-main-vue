import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as api from '@/api/pipettes';
import type { Pipette } from '@/types';
import type { Counters } from '@/api/pipettes';

let _loadPagedPromise: Promise<void> | null = null;

export const usePipettesStore = defineStore('pipettes', () => {
  const items = ref<Pipette[]>([]);
  const total = ref(0);
  const page = ref(1);
  const limit = ref(100);
  const totalPages = ref(1);
  const counters = ref<Counters>({ ok: 0, warn: 0, danger: 0, total: 0 });
  const loading = ref(false);

  const sortField = ref('nextCalibration');
  const sortDir = ref<1 | -1>(1);
  const search = ref('');
  const filterState = ref<Record<string, unknown>>({});

  const selected = ref<Set<string>>(new Set());

  const hasSelection = computed(() => selected.value.size > 0);

    async function loadPaged() {
    if (_loadPagedPromise) return _loadPagedPromise;

    _loadPagedPromise = (async () => {
      loading.value = true;
      try {
        const cleanFilters: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(filterState.value)) {
          if (v === undefined || v === null || v === '') continue;
          if (typeof v === 'object' && v !== null && 'period' in v && (v as { period: string }).period === '') continue;
          cleanFilters[k] = v;
        }

        const res = await api.getPaged({
          page: page.value,
          limit: limit.value,
          sort: sortField.value,
          dir: sortDir.value > 0 ? 'asc' : 'desc',
          search: search.value || undefined,
          filters: Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined,
        });

        items.value = Array.isArray(res.items) ? res.items : [];
        total.value = Number(res.total) || 0;
        page.value = Number(res.page) || 1;
        limit.value = Number(res.limit) || limit.value;
        totalPages.value = Math.max(1, Number(res.totalPages) || 1);
        counters.value = res.counters || { ok: 0, warn: 0, danger: 0, total: 0 };

        if (page.value > totalPages.value) page.value = totalPages.value;
      } catch (e) {
        console.error('pipettes.loadPaged:', e);
        items.value = [];
        total.value = 0;
        totalPages.value = 1;
      } finally {
        loading.value = false;
        _loadPagedPromise = null;
      }
    })();

    return _loadPagedPromise;
  }

  function setSearch(s: string) {
    search.value = s;
    page.value = 1;
  }

  function setFilter(key: string, value: unknown) {
    filterState.value = { ...filterState.value, [key]: value };
    page.value = 1;
  }

  function resetFilters() {
    filterState.value = {};
    page.value = 1;
  }

  async function sortBy(field: string) {
    if (sortField.value === field) {
      sortDir.value = sortDir.value === 1 ? -1 : 1;
    } else {
      sortField.value = field;
      sortDir.value = 1;
    }
    page.value = 1;
    clearSelection();
    await loadPaged();
  }

  async function changePage(delta: number) {
    const next = page.value + delta;
    if (next < 1 || next > totalPages.value) return;
    page.value = next;
    clearSelection();
    await loadPaged();
  }

  function toggleSelected(id: string, checked: boolean) {
    const s = new Set(selected.value);
    if (checked) s.add(id); else s.delete(id);
    selected.value = s;
  }

  function selectAllOnPage(checked: boolean) {
    const s = new Set(selected.value);
    if (checked) items.value.forEach(p => s.add(p.id));
    else items.value.forEach(p => s.delete(p.id));
    selected.value = s;
  }

  function clearSelection() {
    selected.value = new Set();
  }

  function syncFilterState(activeFilters: { id: string; type: string; options?: { value: unknown }[] }[]) {
  const activeIds = new Set(activeFilters.map(f => f.id));
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(filterState.value)) {
    if (!activeIds.has(k)) continue;
    const f = activeFilters.find(x => x.id === k);
    if (f?.type === 'select' && f.options && typeof v === 'string' && v) {
      if (!f.options.some(o => String(o.value) === v)) continue;
    }
    cleaned[k] = v;
  }
  filterState.value = cleaned;
}

 //  Всегда с сервера — модалки должны видеть актуальные данные
async function fetchByIds(ids: string[]): Promise<Pipette[]> {
  if (!ids || ids.length === 0) return [];

  const api = await import('@/api/pipettes');
  const byId = new Map<string, Pipette>();

  // Загружаем ВСЕХ с сервера (не смотрим в кеш pip.items)
  const CONCURRENCY = 5;
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map(id => api.getById(id)));
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value) byId.set(batch[idx], r.value);
    });
  }

  const result = ids.map(id => byId.get(id)).filter((p): p is Pipette => !!p);

  //  Обновляем кеш pip.items — чтобы таблица показывала свежие данные
  result.forEach(p => {
    const idx = items.value.findIndex(x => x.id === p.id);
    if (idx !== -1) items.value[idx] = p;
  });

  return result;
}

//  Всегда с сервера
async function fetchOne(id: string): Promise<Pipette | null> {
  try {
    const api = await import('@/api/pipettes');
    const fresh = await api.getById(id);

    //  Обновляем кеш pip.items
    if (fresh) {
      const idx = items.value.findIndex(x => x.id === id);
      if (idx !== -1) items.value[idx] = fresh;
    }

    return fresh;
  } catch {
    return null;
  }
}
  return {
    items, total, page, limit, totalPages, counters, loading,
    sortField, sortDir, search, filterState,
    selected, hasSelection,
    loadPaged, setSearch, setFilter, resetFilters,
    sortBy, changePage, toggleSelected, selectAllOnPage, clearSelection, syncFilterState, fetchByIds,
fetchOne,
  };
});
