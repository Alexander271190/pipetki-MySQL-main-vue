import type { EquipmentType } from '@/stores/settings';

export function getCalibrationPlace(types: EquipmentType[], equipmentType: string): 'external' | 'internal' {
  const t = types.find(x => x.value === equipmentType);
  return t?.calibrationPlace === 'external' ? 'external' : 'internal';
}

export function isExternalCalibration(types: EquipmentType[], equipmentType: string): boolean {
  return getCalibrationPlace(types, equipmentType) === 'external';
}

export function allowReplacement(types: EquipmentType[], equipmentType: string): boolean {
  const t = types.find(x => x.value === equipmentType);
  return t?.allowReplacement !== false;
}
