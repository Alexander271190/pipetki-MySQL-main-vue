import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '@/api/pipettes';
import type { Pipette } from '@/types';
import type { Counters } from '@/api/pipettes';

export const useStatsStore = defineStore('stats', () => {
  const counters = ref<Counters>({ ok: 0, warn: 0, danger: 0, total: 0 });
  const reminders = ref<{ danger: Pipette[]; warn: Pipette[] }>({ danger: [], warn: [] });

  async function load() {
    try {
      const res = await api.getStats();
      counters.value = res.counters || { ok: 0, warn: 0, danger: 0, total: 0 };
      reminders.value = res.reminders || { danger: [], warn: [] };
    } catch (e) {
      console.warn('stats.load:', e);
    }
  }

  return { counters, reminders, load };
});
