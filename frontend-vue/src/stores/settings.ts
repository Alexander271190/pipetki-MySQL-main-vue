import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '@/api/settings';
import { pluralizeType } from '@/utils/string';
import type {
  FieldConfig, EquipmentType, FilterConfig, PrintDocsEffective,
} from '@/api/settings';

export type { FieldConfig, EquipmentType, FilterConfig, PrintDocsEffective };

const DEFAULT_EQUIPMENT_TYPES: EquipmentType[] = [
  { value: 'pipette',     label: 'Пипетка',     prefix: 'P', calibrationPlace: 'external', interval: 12 },
  { value: 'analyzer',    label: 'Анализатор',  prefix: 'A', calibrationPlace: 'external', interval: 12 },
  { value: 'thermometer', label: 'Термометр',   prefix: 'T', calibrationPlace: 'internal', interval: 12 },
  { value: 'scales',      label: 'Весы',        prefix: 'S', calibrationPlace: 'internal', interval: 12 },
  { value: 'photometer',  label: 'Фотометр',    prefix: 'F', calibrationPlace: 'internal', interval: 12 },
  { value: 'microscope',  label: 'Микроскоп',   prefix: 'M', calibrationPlace: 'internal', interval: 12 },
];

export const useSettingsStore = defineStore('settings', () => {
  const loaded = ref(false);
  const warnDays = ref(30);
  const bulkIdentityFields = ref<string[]>(['id', 'model', 'serial', 'inventorynumber', 'department']);
  const equipmentTypes = ref<EquipmentType[]>([]);
  const departments = ref<string[]>([]);
  const fields = ref<FieldConfig[]>([]);
  const filters = ref<FilterConfig[]>([]);
  const printDocs = ref<PrintDocsEffective>({
    hasPermission: false,
    export: false, actSend: false, actReturn: false, history: false,
  });
  const systemSettings = ref<Record<string, unknown>>({});

  const responsibles = ref<string[]>([]);

  const exportFields = ref<string[]>([]);

  async function loadResponsibles(force = false) {
    if (!force && responsibles.value.length > 0) return;
    try {
      const { getResponsibles } = await import('@/api/users');
      const users = await getResponsibles();
      responsibles.value = users.map(u => u.fullName).filter(Boolean);
    } catch { /* ignore */ }
  }

  function invalidateResponsibles() {
    responsibles.value = [];
  }

  async function loadAll() {
    const [
      systemRes, typesRes, fieldsRes, depsRes, filtersRes, printRes, exportRes,
    ] = await Promise.allSettled([
      api.getSystemSettings(),
      api.getEquipmentTypes(),
      api.getFields(),
      api.getDepartments(),
      api.getFilters(),
      api.getPrintDocsEffective(),
      api.getExport(),
    ]);

    if (systemRes.status === 'fulfilled') {
      const s = systemRes.value;
      systemSettings.value = systemRes.value as Record<string, unknown>;
      warnDays.value = parseInt(s.warn_days || '') || 30;
      if (s.bulk_identity_fields) {
        try {
          const parsed = JSON.parse(s.bulk_identity_fields);
          if (Array.isArray(parsed)) bulkIdentityFields.value = parsed;
          } catch { /* ignore */ }
      }
    }

    // Fallback на дефолтные типы оборудования, если API вернул пустой массив или упал
    if (typesRes.status === 'fulfilled' && Array.isArray(typesRes.value) && typesRes.value.length > 0) {
      equipmentTypes.value = typesRes.value;
    } else {
      equipmentTypes.value = DEFAULT_EQUIPMENT_TYPES;
    }

    if (fieldsRes.status === 'fulfilled' && Array.isArray(fieldsRes.value)) {
      fields.value = fieldsRes.value;
    }

    if (depsRes.status === 'fulfilled' && Array.isArray(depsRes.value)) {
      departments.value = depsRes.value;
    }

    if (filtersRes.status === 'fulfilled' && Array.isArray(filtersRes.value)) {
      filters.value = filtersRes.value.filter(f => f.enabled);
      for (const f of filters.value) {
        if (f.type === 'select') {
          if (f.optionsSource === 'departments') {
            f.options = departments.value.map(d => ({ value: d, label: d }));
          } else if (f.optionsSource === 'status_list') {
            f.options = [
              { value: 'ok', label: 'В норме' },
              { value: 'warn', label: 'Скоро поверка' },
              { value: 'danger', label: 'Просрочены' },
              { value: 'inactive', label: 'Неактивны' },
              { value: 'sent', label: '📦 На поверке' },
              { value: 'fail', label: '❌ Брак' },
              { value: 'wip', label: '⏳ В процессе' },
              { value: 'unknown', label: 'Не задано' },
            ];
          } else if (f.optionsSource === 'equipment_type_list') {
            f.options = equipmentTypes.value.map(t => ({
              value: t.value,
              label: pluralizeType(t.label),
            }));
          } else if (f.optionsSource === 'active_list') {
            f.options = [
              { value: 'true', label: 'В работе' },
              { value: 'false', label: 'Неактивны' },
            ];
          }
        }
      }
    }

    if (printRes.status === 'fulfilled') {
      printDocs.value = printRes.value;
    }

    if (exportRes.status === 'fulfilled') {
      const exp = exportRes.value as { fields?: string[] } | string[] | null;
      if (Array.isArray(exp)) {
        exportFields.value = exp;
      } else if (exp?.fields && Array.isArray(exp.fields)) {
        exportFields.value = exp.fields;
      }
    }

    loaded.value = true;
  }

  function getTableViewSettings() {
    const s = systemSettings.value;
    let pageSizes: number[] = [50, 100, 200, 500];
    try {
      const parsed = JSON.parse(String(s.page_sizes || '[50,100,200,500]'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        pageSizes = parsed.map(n => parseInt(String(n), 10)).filter(n => Number.isFinite(n) && n > 0);
      }
    } catch { /* дефолт */ }
    return {
      pageSizes,
      defaultPageSize: parseInt(String(s.default_page_size || '100'), 10) || 100,
      density: ['compact', 'normal', 'loose'].includes(String(s.table_density))
        ? String(s.table_density) as 'compact' | 'normal' | 'loose'
        : 'normal',
    };
  }

  function getPasswordPolicy() {
    const s = systemSettings.value || {};
    
    // Хелпер: приводим '1', 1, 'true', true к boolean
    const parseBool = (val: unknown) => val === '1' || val === 1 || val === true || val === 'true';

    return {
      minLength:      Math.max(6, Math.min(128, parseInt(String(s.password_min_length || '8'), 10) || 8)),
      maxLength:      Math.max(8, Math.min(128, parseInt(String(s.password_max_length || '64'), 10) || 64)),
      requireLower:   parseBool(s.password_require_lower),
      requireUpper:   parseBool(s.password_require_upper),
      requireDigit:   parseBool(s.password_require_digit),
      requireSpecial: parseBool(s.password_require_special),
      forbidSpaces:   parseBool(s.password_forbid_spaces),
    };
  }

  function getEquipmentSettings() {
    const s = systemSettings.value;
    return {
      maxBatchSize:    parseInt(String(s.max_batch_size || '100'), 10) || 100,
      maxBulkSize:     parseInt(String(s.max_bulk_size || '100'), 10) || 100,
      maxModelLength:  parseInt(String(s.max_model_length || '255'), 10) || 255,
      maxSerialLength: parseInt(String(s.max_serial_length || '255'), 10) || 255,
    };
  }

  return {
    loaded, warnDays, bulkIdentityFields, equipmentTypes, departments, fields, filters, printDocs,
    exportFields, responsibles,
    loadAll, loadResponsibles, invalidateResponsibles, systemSettings, getTableViewSettings, getPasswordPolicy, getEquipmentSettings,
  };
});
