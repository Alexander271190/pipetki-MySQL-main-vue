import type { Pipette, Status } from '@/types';
import { parseLocalDate, addMonths } from './format';

export function calcStatus(p: Pipette | null): Status {
  return (p && (p.computed_status as Status)) || 'unknown';
}

export function getNextDate(p: Pipette): Date | null {
  if (!p.last_calibration || !p.interval) return null;
  const d = parseLocalDate(p.last_calibration);
  if (!d) return null;
  return addMonths(d, p.interval);
}

export function daysLeft(p: Pipette): number {
  const next = getNextDate(p);
  if (!next) return -9999;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((next.getTime() - now.getTime()) / 86400000);
}
