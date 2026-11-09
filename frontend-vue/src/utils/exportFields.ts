import type { Pipette } from '@/types';
import { formatDate } from './format';
import { calcStatus, getNextDate, daysLeft } from './status';
import { STATUS_LABELS } from '@/constants';
import { useSettingsStore } from '@/stores/settings';

interface FieldDef {
  label: string;
  get: (p: Pipette) => string;
}

export function getSystemExportField(id: string): FieldDef | null {
  const settings = useSettingsStore();

  const map: Record<string, FieldDef> = {
    id:              { label: 'ID',              get: p => p.id || '' },
    serial:          { label: 'Серийный',        get: p => p.serial || '' },
    manufacturer:    { label: 'Производитель',   get: p => p.manufacturer || '' },
    model:           { label: 'Модель',          get: p => p.model || '' },
    equipmentType:   {
      label: 'Тип',
      get: p => {
        const t = settings.equipmentTypes.find(x => x.value === p.equipment_type);
        return t ? t.label : 'Прочее';
      },
    },
    volume:          { label: 'Объём',           get: p => p.volume ? String(p.volume) : '' },
    department:      { label: 'Отдел',           get: p => p.department || '' },
    lastCalibration: { label: 'Дата поверки',    get: p => formatDate(p.last_calibration) },
    nextCalibration: { label: 'Следующая',       get: p => formatDate(getNextDate(p)) },
    interval:        { label: 'МПИ',             get: p => p.interval ? String(p.interval) : '' },
    daysLeft:        {
      label: 'Дней',
      get: p => {
        const s = calcStatus(p);
        const dl = daysLeft(p);
        if (s === 'inactive' || s === 'unknown') return '—';
        if (s === 'sent') return 'на поверке';
        if (s === 'wip') return 'в процессе';
        if (s === 'fail') return 'брак';
        return dl < 0 ? `просрочка ${Math.abs(dl)} дн.` : `${dl} дн.`;
      },
    },
    responsible:     { label: 'Ответственный',   get: p => p.responsible || '' },
    location:        { label: 'Место',           get: p => p.location || '' },
    status:          { label: 'Статус',          get: p => STATUS_LABELS[calcStatus(p)] || calcStatus(p) },
    cert:            { label: 'Свидетельство',   get: p => p.cert || '' },
    notes:           { label: 'Примечание',      get: p => p.notes || '' },
  };
  return map[id] || null;
}

export function getExportField(id: string): FieldDef | null {
  const sys = getSystemExportField(id);
  if (sys) return sys;
  const settings = useSettingsStore();
  const custom = settings.fields.find(f => f.id === id);
  if (!custom) return null;
  return {
    label: custom.label,
    get: p => {
      const v = (p as Record<string, unknown>)[id];
      return v === undefined || v === null ? '' : String(v);
    },
  };
}

export function getActiveExportFields(printDocsFields?: string[]): string[] {
  // 1) индивидуальные
  if (printDocsFields && printDocsFields.length > 0) {
    return printDocsFields.filter(id => !!getExportField(id));
  }

  // 2) глобальные из /settings/export (если есть кеш)
  const settings = useSettingsStore();
  const globalFields = (settings as any).exportFields as string[] | undefined;
  if (globalFields && globalFields.length > 0) {
    return globalFields.filter(id => !!getExportField(id));
  }

  // 3) все доступные
  const custom = settings.fields.filter(f => f.enabled).map(f => f.id);
  const system = ['id','serial','manufacturer','model','equipmentType','volume','department',
    'lastCalibration','nextCalibration','interval','daysLeft','responsible','location',
    'status','cert','notes'];
  return [...system, ...custom].filter(id => !!getExportField(id));
}
