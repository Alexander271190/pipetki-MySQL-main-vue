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

  return {
    loaded, warnDays, bulkIdentityFields, equipmentTypes, departments, fields, filters, printDocs,
    exportFields, responsibles,
    loadAll, loadResponsibles, invalidateResponsibles,
  };
});
