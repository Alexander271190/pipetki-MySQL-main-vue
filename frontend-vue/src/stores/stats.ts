import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '@/api/pipettes';
import type { Pipette } from '@/types';
import type { Counters } from '@/api/pipettes';

export const useStatsStore = defineStore('stats', () => {
  const counters = ref<Counters>({ ok: 0, warn: 0, danger: 0, total: 0 });
  const reminders = ref<{ danger: Pipette[]; warn: Pipette[] }>({ danger: [], warn: [] });

let _loadPromise: Promise<void> | null = null;

async function load() {
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    try {
      const res = await api.getStats();
      counters.value = res.counters || { ok: 0, warn: 0, danger: 0, total: 0 };
      reminders.value = res.reminders || { danger: [], warn: [] };
    } catch (e) {
      console.warn('stats.load:', e);
    } finally {
      _loadPromise = null;
    }
  })();
  return _loadPromise;
}

  return { counters, reminders, load };
});
