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
import { formatDate } from '@/utils/format';
import { getNextDate } from '@/utils/status';

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

  //  Маппинг camelCase (из настроек) → snake_case (из БД)
  const FIELD_ALIASES: Record<string, string> = {
    equipmentType: 'equipment_type',
    lastCalibration: 'last_calibration',
    result: 'last_result',
  };

  for (const f of fields.value) {
    if (f === 'id' || f === 'model') continue;

    let val: unknown = null;
    const key = FIELD_ALIASES[f] || f;

    //  Умное форматирование для системных полей
    if (f === 'equipmentType') {
      const type = settings.equipmentTypes.find(t => t.value === p.value.equipment_type);
      val = type ? type.label : p.value.equipment_type;
    } 
    else if (f === 'lastCalibration') {
      val = formatDate(p.value.last_calibration);
    } 
    else if (f === 'nextCalibration') {
      val = formatDate(getNextDate(p.value));
    } 
    else if (f === 'result') {
      const r = p.value.last_result;
      val = r === 'pass' ? 'Годен' : r === 'fail' ? 'Брак' : r === 'wip' ? 'В процессе' : '';
    } 
    else if (f === 'active') {
      val = p.value.active ? 'В работе' : 'Не используется';
    } 
    else {
      // Системные и кастомные поля — из корня
      val = (p.value as Record<string, unknown>)[key];

      //  Страховка: если в корне нет — ищем в custom_data
      if (val === undefined || val === null) {
        const custom = (p.value.custom_data as Record<string, unknown> | undefined) || {};
        val = custom[f];
      }
    }

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
