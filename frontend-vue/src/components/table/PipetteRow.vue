<template>
  <tr
    :class="[rowClass, { 'mobile-expanded': expanded }]"
    @click="onRowClick"
  >
    <td class="col-checkbox">
      <input
        type="checkbox"
        class="row-checkbox"
        :checked="isSelected"
        @change="onCheckChange"
        @click.stop
      />
    </td>

    <td
      v-for="(colId, index) in columns"
      :key="colId"
      :class="[`col-${colId}`, { 'mobile-essential': isEssential(index, colId) }]"
      :data-label="columnLabel(colId)"
    >
      <template v-if="colId === 'id'">
        <span class="id-cell">
          <strong>{{ p.id }}</strong>
          <StatusDot :status="status" />
        </span>
        <template v-if="p.replaced_by && p.replacement">
          <br><small style="color:#0ea5e9;">↔ замена: {{ p.replaced_by }}</small>
        </template>
        <template v-else-if="p.replaced_by">
          <br><small style="color:#dc2626;">⚠ замена удалена: {{ p.replaced_by }}</small>
        </template>
        <template v-if="p.replacing && p.replacedFor">
          <br><small style="color:#eab308;">↔ заменяет: {{ p.replacing }}</small>
        </template>
      </template>

      <template v-else-if="colId === 'type'">
        {{ typeLabel }}
      </template>

      <template v-else-if="colId === 'model'">
        {{ p.model }}
        <br v-if="p.manufacturer">
        <small v-if="p.manufacturer" style="color:#94a3b8;">{{ p.manufacturer }}</small>
      </template>

      <template v-else-if="colId === 'volume'">
        {{ p.volume ? p.volume + ' мкл' : '—' }}
      </template>

      <template v-else-if="colId === 'department'">
        {{ p.department || '—' }}
      </template>

      <template v-else-if="colId === 'lastCalibration'">
        {{ formatDate(p.last_calibration) }}
      </template>

      <template v-else-if="colId === 'nextCalibration'">
        <template v-if="status === 'sent'">
          <small style="color:#0ea5e9;font-weight:600;">
            <i class="fa-solid fa-box"></i> {{ formatDate(p.sent_for_calibration) }}
          </small>
        </template>
        <template v-else-if="status === 'wip'">
          <small style="color:#eab308;font-weight:600;">
            <i class="fa-solid fa-hourglass-half"></i> В процессе
          </small>
        </template>
        <template v-else-if="status === 'unknown'">
          <small style="color:#94a3b8;">Дата не задана</small>
        </template>
        <template v-else>
          {{ formatDate(nextDate) }}
          <template v-if="daysText">
            <br><small :style="{ color: daysColor }">{{ daysText }}</small>
          </template>
        </template>
      </template>

      <template v-else-if="colId === 'responsible'">
        {{ p.responsible || '—' }}
        <template v-if="p.location">
          <br><small style="color:#94a3b8;">{{ p.location }}</small>
        </template>
      </template>

      <template v-else-if="colId === 'location'">
        {{ p.location || '—' }}
      </template>

      <template v-else-if="colId === 'manufacturer'">
        {{ p.manufacturer || '—' }}
      </template>

      <template v-else-if="colId === 'serial'">
        {{ p.serial || '—' }}
      </template>

      <template v-else-if="colId === 'cert'">
        {{ p.cert || '—' }}
      </template>

      <template v-else-if="colId === 'status'">
        <StatusBadge :status="status" />
      </template>

      <template v-else-if="colId === 'interval'">
        {{ p.interval != null ? p.interval + ' мес.' : '—' }}
      </template>

      <template v-else-if="colId === 'notes'">
        {{ p.notes || '—' }}
      </template>

      <template v-else-if="colId === 'result'">
        {{ RESULT_LABELS[p.last_result as keyof typeof RESULT_LABELS] || p.last_result || '—' }}
      </template>

      <template v-else-if="colId === 'active'">
        {{ p.active ? 'В работе' : 'Не используется' }}
      </template>

      <template v-else>
        {{ (p as Record<string, unknown>)[colId] ?? '—' }}
      </template>
    </td>

    <td class="col-actions">
      <button class="row-actions-btn" @click.stop="onActionsClick" title="Действия">
        <i class="fa-solid fa-ellipsis-vertical"></i>
      </button>
    </td>
  </tr>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Pipette, Status } from '@/types';
import type { TableColumn } from '@/constants';
import { RESULT_LABELS } from '@/constants';
import { calcStatus, getNextDate, daysLeft } from '@/utils/status';
import { formatDate } from '@/utils/format';
import { useSettingsStore } from '@/stores/settings';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import StatusDot from '@/components/ui/StatusDot.vue';

const props = defineProps<{
  p: Pipette;
  columns: string[];
  isSelected: boolean;
  allColumns: TableColumn[];
}>();

const emit = defineEmits<{
  (e: 'toggle-select', id: string, checked: boolean): void;
  (e: 'actions', id: string, event: MouseEvent): void;
}>();

const settings = useSettingsStore();
const expanded = ref(false);

const status = computed<Status>(() => calcStatus(props.p));
const nextDate = computed(() => getNextDate(props.p));
const dl = computed(() => daysLeft(props.p));

const typeLabel = computed(() => {
  const t = settings.equipmentTypes.find(x => x.value === props.p.equipment_type);
  return t?.label || 'Прочее';
});

const daysText = computed(() => {
  const s = status.value;
  if (['inactive', 'sent', 'wip', 'unknown'].includes(s)) return '';
  if (s === 'fail') return ' (брак)';
  if (s === 'danger') return ` (просрочка ${Math.abs(dl.value)} дн.)`;
  return ` (${dl.value} дн.)`;
});

const daysColor = computed(() => {
  const s = status.value;
  if (s === 'danger' || s === 'fail') return '#dc2626';
  if (s === 'warn') return '#eab308';
  return '#16a34a';
});

const rowClass = computed(() => {
  const s = status.value;
  if (s === 'danger') return 'row-danger';
  if (s === 'fail') return 'row-fail';
  if (s === 'warn') return 'row-warn';
  return '';
});

function columnLabel(colId: string): string {
  const def = props.allColumns.find(c => c.id === colId);
  return def?.label || '';
}

function isEssential(index: number, colId: string): boolean {
  return index === 0 || index === 1 || colId === 'status' || colId === 'department'
      || colId === 'nextCalibration' || colId === 'responsible';
}

function onRowClick(e: MouseEvent) {
  if (window.innerWidth > 768) return;
  const target = e.target as HTMLElement;
  if (target.closest('.col-checkbox') || target.closest('.col-actions')
      || target.closest('button') || target.closest('input')) return;
  expanded.value = !expanded.value;
}

function onCheckChange(e: Event) {
  emit('toggle-select', props.p.id, (e.target as HTMLInputElement).checked);
}

function onActionsClick(e: MouseEvent) {
  emit('actions', props.p.id, e);
}
</script>
