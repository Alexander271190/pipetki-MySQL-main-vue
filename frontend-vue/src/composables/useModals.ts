import { useFormModals } from './useFormModals';
import { useBulkModals } from './useBulkModals';
import { useAdminModals } from './useAdminModals';

export function useModals() {
  return {
    ...useFormModals(),
    ...useBulkModals(),
    ...useAdminModals(),
  };
}
