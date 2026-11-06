import type { Status, ResultType } from '@/types';

export const STATUS_LABELS: Record<Status, string> = {
  ok: 'В норме',
  warn: 'Скоро поверка',
  danger: 'Просрочена',
  inactive: 'Неактивна',
  sent: 'На поверке',
  fail: 'Брак',
  wip: 'В процессе',
  unknown: 'Не задано',
};

export const STATUS_ICONS: Record<Status, string> = {
  ok: 'fa-circle-check',
  warn: 'fa-clock',
  danger: 'fa-triangle-exclamation',
  inactive: 'fa-circle-pause',
  sent: 'fa-box',
  fail: 'fa-xmark',
  wip: 'fa-hourglass-half',
  unknown: 'fa-circle-question',
};

export const STATUS_COLORS: Record<Status, string> = {
  ok: '#16a34a',
  warn: '#eab308',
  danger: '#dc2626',
  inactive: '#94a3b8',
  sent: '#0ea5e9',
  fail: '#dc2626',
  wip: '#eab308',
  unknown: '#94a3b8',
};

export const RESULT_LABELS: Record<ResultType, string> = {
  pass: 'Годен',
  fail: 'Брак',
  wip: 'В процессе',
};

export const COLORS = {
  danger: '#dc2626',
  success: '#16a34a',
  warning: '#eab308',
  info: '#0ea5e9',
  primary: '#4f46e5',
  muted: '#64748b',
  faint: '#94a3b8',
};

// Системные колонки таблицы
export interface TableColumn {
  id: string;
  label: string;
  sortable: boolean;
  field: string;
}

export const SYSTEM_TABLE_COLUMNS: TableColumn[] = [
  { id: 'id',              label: 'ID',            sortable: true,  field: 'id' },
  { id: 'type',            label: 'Тип',           sortable: true,  field: 'equipmentType' },
  { id: 'model',           label: 'Модель',        sortable: true,  field: 'model' },
  { id: 'volume',          label: 'Объём',         sortable: true,  field: 'volume' },
  { id: 'department',      label: 'Отдел',         sortable: true,  field: 'department' },
  { id: 'lastCalibration', label: 'Поверка',       sortable: true,  field: 'lastCalibration' },
  { id: 'nextCalibration', label: 'Следующая',     sortable: true,  field: 'nextCalibration' },
  { id: 'responsible',     label: 'Ответственный', sortable: true,  field: 'responsible' },
  { id: 'location',        label: 'Место',         sortable: false, field: 'location' },
  { id: 'manufacturer',    label: 'Производитель', sortable: false, field: 'manufacturer' },
  { id: 'serial',          label: 'Серийный',      sortable: false, field: 'serial' },
  { id: 'cert',            label: 'Свидетельство', sortable: false, field: 'cert' },
  { id: 'status',          label: 'Статус',        sortable: true,  field: 'status' },
];

export const SYSTEM_FIELD_IDS_IN_CONFIG = new Set([
  'id', 'serial', 'manufacturer', 'model', 'equipmentType',
  'volume', 'department', 'interval', 'lastCalibration', 'cert',
  'result', 'active', 'responsible', 'location', 'notes',
]);

export const DEFAULT_TABLE_COLUMNS = [
  'id', 'type', 'model', 'volume', 'department',
  'lastCalibration', 'nextCalibration', 'responsible', 'status',
];
