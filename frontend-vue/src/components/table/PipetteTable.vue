<template>
  <div class="table-wrapper">
    <table id="pipettes-table" :style="tableStyle">
      <colgroup>
        <col v-for="colId in ['__checkbox', ...columns, '__actions']" :key="colId" :style="colStyle(colId)">
      </colgroup>
      <thead>
        <tr>
          <th class="col-checkbox" data-col-id="__checkbox">
            <input
              type="checkbox"
              id="select-all-checkbox"
              :checked="allChecked"
              :indeterminate.prop="someChecked"
              :disabled="pip.items.length === 0"
              @change="onSelectAll"
              title="Выбрать все"
            />
          </th>
          <th
            v-for="colId in columns"
            :key="colId"
            :class="`col-${colId}`"
            :data-col-id="colId"
            :style="thStyle(colId)"
            draggable="true"
            @dragstart="onDragStart($event, colId)"
            @dragover="onDragOver"
            @drop="onDrop($event, colId)"
            @dragend="onDragEnd"
            @click="onHeaderClick(colId, $event)"
            style="position: relative;"
          >
            {{ labelFor(colId) }}
            <span v-if="isSortable(colId)" class="sort-arrow">{{ sortArrow(colId) }}</span>
            <div
              style="position: absolute; right: 0; top: 0; bottom: 0; width: 6px; cursor: col-resize; z-index: 2;"
              @mousedown="startColumnResize($event, colId)"
            ></div>
          </th>
          <th id="actions-header" data-col-id="__actions">Действия</th>
        </tr>
      </thead>
      <tbody>
        <PipetteRow
          v-for="p in pip.items"
          :key="p.id"
          :p="p"
          :columns="columns"
          :is-selected="pip.selected.has(p.id)"
          :all-columns="allColumns"
          @toggle-select="onToggleSelect"
          @actions="onRowActions"
        />
      </tbody>
    </table>

    <div v-if="pip.items.length === 0 && !pip.loading" class="empty-state" style="display:block;padding:40px 20px;">
      <div class="icon" style="font-size:3rem;margin-bottom:10px;">
        <i class="fa-solid fa-flask-vial"></i>
      </div>
      <p>{{ emptyText }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePipettesStore } from '@/stores/pipettes';
import { usePrefsStore } from '@/stores/prefs';
import { useSettingsStore } from '@/stores/settings';
import { SYSTEM_TABLE_COLUMNS, DEFAULT_TABLE_COLUMNS, SYSTEM_FIELD_IDS_IN_CONFIG } from '@/constants';
import type { TableColumn } from '@/constants';
import PipetteRow from './PipetteRow.vue';
import { useModals } from '@/composables/useModals';

const pip = usePipettesStore();
const prefs = usePrefsStore();
const settings = useSettingsStore();
const modals = useModals();

// Все доступные колонки (системные + кастомные)
const allColumns = computed<TableColumn[]>(() => {
  const result: TableColumn[] = [];
  const added = new Set<string>();

  const fields = [...(settings.fields || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  for (const f of fields) {
    if (!f.enabled) continue;
    const tableId = f.id === 'equipmentType' ? 'type' : f.id;
    const sys = SYSTEM_TABLE_COLUMNS.find(c => c.id === tableId);
    if (sys) { result.push(sys); added.add(tableId); }
    else if (!SYSTEM_FIELD_IDS_IN_CONFIG.has(f.id)) {
      result.push({ id: f.id, label: f.label, sortable: true, field: f.id });
      added.add(f.id);
    }
  }
  const extras: TableColumn[] = [
    { id: 'interval', label: 'МПИ', sortable: true, field: 'interval' },
    { id: 'notes',    label: 'Примечание', sortable: false, field: 'notes' },
    { id: 'result',   label: 'Результат', sortable: false, field: 'last_result' },
    { id: 'active',   label: 'Активность', sortable: false, field: 'active' },
    { id: 'nextCalibration', label: 'Следующая', sortable: true, field: 'nextCalibration' },
  ];
  for (const sys of [...SYSTEM_TABLE_COLUMNS, ...extras]) {
    if (!added.has(sys.id)) { result.push(sys); added.add(sys.id); }
  }
  return result;
});

// Видимые колонки в порядке columnOrder (или по умолчанию)
const columns = computed<string[]>(() => {
  const visible = new Set(prefs.visibleFields.length > 0 ? prefs.visibleFields : DEFAULT_TABLE_COLUMNS);
  const TABLE_ID_MAP: Record<string, string> = { equipmentType: 'type' };

  const cols: string[] = [];
  const added = new Set<string>();

  if (Array.isArray(prefs.columnOrder) && prefs.columnOrder.length > 0) {
    for (const id of prefs.columnOrder) {
      if (added.has(id)) continue;
      let isVisible = visible.has(id);
      if (!isVisible) {
        const f = settings.fields.find(x => x.id === id || (TABLE_ID_MAP[x.id] || x.id) === id);
        if (f && visible.has(f.id)) isVisible = true;
      }
      if (!isVisible) continue;
      const def = allColumns.value.find((c: TableColumn) => c.id === id);
      if (def) { cols.push(id); added.add(id); }
    }
  }

  for (const f of settings.fields) {
    if (!f.enabled) continue;
    if (!visible.has(f.id)) continue;
    const tableId = TABLE_ID_MAP[f.id] || f.id;
    if (added.has(tableId)) continue;
    const def = allColumns.value.find(c => c.id === tableId);
    if (def) { cols.push(tableId); added.add(tableId); }
  }

  for (const vid of ['status', 'nextCalibration']) {
    if (!visible.has(vid)) continue;
    if (added.has(vid)) continue;
    if (vid === 'nextCalibration') {
      const lastIdx = cols.indexOf('lastCalibration');
      if (lastIdx !== -1) cols.splice(lastIdx + 1, 0, vid);
      else cols.push(vid);
    } else cols.push(vid);
    added.add(vid);
  }

  if (cols.length === 0) return [...DEFAULT_TABLE_COLUMNS];
  return cols;
});

const allChecked = computed(() => pip.items.length > 0 && pip.items.every(p => pip.selected.has(p.id)));
const someChecked = computed(() => pip.selected.size > 0 && !allChecked.value);

const emptyText = computed(() => {
  if (pip.total > 0) return 'Ничего не найдено по фильтру.';
  if (!pip.search && Object.keys(pip.filterState).length === 0) {
    return 'Оборудования пока нет. Нажмите «Создать оборудование», чтобы начать.';
  }
  return 'Ничего не найдено по фильтру.';
});

const hasWidths = computed(() => Object.keys(prefs.columnWidths).length > 0);
const tableStyle = computed(() => ({
  tableLayout: hasWidths.value ? ('fixed' as const) : ('auto' as const),
}));

function colStyle(colId: string) {
  const w = prefs.columnWidths[colId];
  return w ? { width: w + 'px' } : {};
}

function thStyle(colId: string) {
  const w = prefs.columnWidths[colId];
  return w ? { width: w + 'px' } : {};
}

function labelFor(colId: string): string {
  const def = allColumns.value.find(c => c.id === colId);
  return def?.label || colId;
}

function isSortable(colId: string): boolean {
  return !!allColumns.value.find(c => c.id === colId)?.sortable;
}

function sortArrow(colId: string): string {
  const def = allColumns.value.find(c => c.id === colId);
  if (!def || def.field !== pip.sortField) return '';
  return pip.sortDir > 0 ? '▲' : '▼';
}

// --- Resize + Drag&Drop ---

let _colDragState: { srcColId: string } | null = null;
let _colResizeState: { colId: string } | null = null;

async function onHeaderClick(colId: string, _e?: MouseEvent) {
  if (_colResizeState || _colDragState) return;
  const def = allColumns.value.find(c => c.id === colId);
  if (!def?.sortable) return;
  await pip.sortBy(def.field);
}

function startColumnResize(e: MouseEvent, colId: string) {
  e.preventDefault();
  e.stopPropagation();
  const table = document.getElementById('pipettes-table');
  if (!table) return;
  const th = (e.target as HTMLElement).closest('th');
  if (!th || !th.parentElement) return;
  
  table.style.tableLayout = 'fixed';
  const ths = Array.from(th.parentElement.children) as HTMLElement[];
  const cols = table.querySelectorAll('colgroup col');

  ths.forEach((t, i) => {
    const col = cols[i] as HTMLElement;
    if (!col) return;
    if (!col.style.width) {
      col.style.width = Math.round(t.getBoundingClientRect().width) + 'px';
    }
    const tColId = (t as HTMLElement).dataset.colId;
    if (tColId && !prefs.columnWidths[tColId]) {
      prefs.setColumnWidth(tColId, Math.round(t.getBoundingClientRect().width));
    }
  });

  const startX = e.clientX;
  const startWidth = th.getBoundingClientRect().width;
  const idx = ths.indexOf(th);
  const colEl = cols[idx] as HTMLElement | null;

  function onMouseMove(ev: MouseEvent) {
    const delta = ev.clientX - startX;
    const newWidth = Math.max(50, Math.round(startWidth + delta));
    if (colEl) colEl.style.width = newWidth + 'px';
    if (typeof prefs.setColumnWidth === 'function') {
      prefs.setColumnWidth(colId, newWidth);
    }
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    _colResizeState = null;
  }

  document.body.style.cursor = 'col-resize';
  _colResizeState = { colId };
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function onDragStart(e: DragEvent, colId: string) {
  
  if (_colResizeState) { e.preventDefault(); return; }
  _colDragState = { srcColId: colId };
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', colId);
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
}

function onDrop(e: DragEvent, targetColId: string) {
  e.preventDefault();
  if (!_colDragState || _colDragState.srcColId === targetColId) {
    _colDragState = null;
    return;
  }
  const src = _colDragState.srcColId;
  const base = Array.isArray(prefs.columnOrder) ? prefs.columnOrder : [];
  const currentOrder = base.length ? [...base] : columns.value.slice();

  const srcIdx = currentOrder.indexOf(src);
  const dstIdx = currentOrder.indexOf(targetColId);

  if (srcIdx !== -1 && dstIdx !== -1) {
    currentOrder.splice(srcIdx, 1);
    currentOrder.splice(dstIdx, 0, src);
    if (typeof prefs.setColumnOrder === 'function') {
      prefs.setColumnOrder(currentOrder);
    }
  }
  _colDragState = null;
}

function onDragEnd() {
  _colDragState = null;
}

function onSelectAll(e: Event) {
  pip.selectAllOnPage((e.target as HTMLInputElement).checked);
}

function onToggleSelect(id: string, checked: boolean) {
  pip.toggleSelected(id, checked);
}

function onRowActions(id: string, event: MouseEvent) {
  modals.onRowActions(id, event);
}
</script>
