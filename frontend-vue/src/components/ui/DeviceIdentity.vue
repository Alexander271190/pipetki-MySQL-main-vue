<template>
  <div>
    <template v-if="main.length > 0">
      <template v-for="(part, i) in main" :key="i">
        <strong v-if="part.bold">{{ part.text }}</strong>
        <template v-else>{{ part.text }}</template>
        <template v-if="i < main.length - 1"> — </template>
      </template>
    </template>
    <strong v-else>{{ p.id }}</strong>

    <br v-if="sub.length > 0">
    <small v-if="sub.length > 0" class="text-muted-sm">{{ sub.join(' · ') }}</small>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Pipette } from '@/types';
import { useSettingsStore } from '@/stores/settings';

const props = defineProps<{ pipette: Pipette }>();
const p = computed(() => props.pipette);
const settings = useSettingsStore();

const fields = computed(() =>
  settings.bulkIdentityFields || ['id', 'model', 'serial', 'inventorynumber', 'department']
);

const main = computed(() => {
  const parts: { text: string; bold: boolean }[] = [];
  if (fields.value.includes('id'))    parts.push({ text: String(p.value.id || ''), bold: true });
  if (fields.value.includes('model')) parts.push({ text: p.value.model || '', bold: false });
  return parts.filter(x => x.text !== '');
});

const sub = computed(() => {
  const arr: string[] = [];
  // Динамический обход всех выбранных полей (включая кастомные 2223)
  for (const f of fields.value) {
    if (f === 'id' || f === 'model') continue;
    
    const val = (p.value as Record<string, unknown>)[f];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      const prefixMap: Record<string, string> = {
        serial: 'S/N: ',
        inventorynumber: 'Инв: ',
      };
      arr.push((prefixMap[f] || '') + String(val));
    }
  }
  return arr;
});
</script>
