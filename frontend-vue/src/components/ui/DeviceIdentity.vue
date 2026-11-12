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
  if (fields.value.includes('serial') && p.value.serial) arr.push(`S/N: ${p.value.serial}`);
  if (fields.value.includes('inventorynumber') && p.value.inventorynumber) arr.push(`Инв: ${String(p.value.inventorynumber)}`);
  if (fields.value.includes('department') && p.value.department) arr.push(p.value.department);
  if (fields.value.includes('responsible') && p.value.responsible) arr.push(p.value.responsible);
  return arr;
});
</script>
