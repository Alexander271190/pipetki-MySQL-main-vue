import { apiRequest } from './client';

export interface SystemSettingsRaw {
  warn_days?: string;
  bulk_identity_fields?: string;
  barcode_label_size?: string;
  [key: string]: unknown;
}

export interface FieldConfig {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required: boolean;
  enabled: boolean;
  options?: string[];
  default?: string;
  order: number;
}

export interface EquipmentType {
  value: string;
  label: string;
  prefix?: string;
  calibrationPlace?: 'external' | 'internal';
  interval?: number;
  allowReplacement?: boolean;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date-period';
  enabled: boolean;
  optionsSource?: string;
  order?: number;
  options?: { value: string; label: string }[];
}

export interface ExportSettingsRaw {
  fields?: string[];
  exportEnabled?: boolean;
  actSendEnabled?: boolean;
  actSendFields?: string[];
  actReturnEnabled?: boolean;
  actReturnFields?: string[];
  historyEnabled?: boolean;
  historyFields?: string[];
  headerEnabled?: boolean;
  headerText?: string;
  headerAlign?: 'left' | 'center' | 'right';
  [key: string]: unknown;
}

export interface PrintDocsEffective {
  hasPermission: boolean;
  export: boolean;
  actSend: boolean;
  actReturn: boolean;
  history: boolean;
  exportFields?: string[];
  actSendFields?: string[];
  actReturnFields?: string[];
  historyFields?: string[];
  headerEnabled?: boolean;
  headerText?: string;
  headerAlign?: 'left' | 'center' | 'right';
}

export interface UserPrefsRaw {
  visibleFields?: string[];
  columnOrder?: string[];
  columnWidths?: Record<string, number>;
  defaultPageSize?: number;
  printDocuments?: Record<string, unknown>;
  _virtualsInitialized?: boolean;
  [key: string]: unknown;
}

export const getSystemSettings    = () => apiRequest<SystemSettingsRaw>('/settings/system');
export const getFields            = () => apiRequest<FieldConfig[]>('/settings/fields');
export const getEquipmentTypes    = () => apiRequest<EquipmentType[]>('/settings/equipment-types');
export const getDepartments       = () => apiRequest<string[]>('/settings/departments');
export const getFilters           = () => apiRequest<FilterConfig[]>('/settings/filters');
export const getExport            = () => apiRequest<ExportSettingsRaw | string[]>('/settings/export');
export const getPrintDocsEffective = () => apiRequest<PrintDocsEffective>('/settings/print-documents/effective');
export const getMyPrefsEffective  = () => apiRequest<UserPrefsRaw>('/settings/my-preferences/effective');
export const getMyPrefs           = () => apiRequest<UserPrefsRaw>('/settings/my-preferences');
export const saveMyPrefs          = (data: UserPrefsRaw) => apiRequest('/settings/my-preferences', 'PUT', data);

// === 3.1 === user-preferences для конкретного пользователя (админ)
export const getUserPrefs          = (id: string) =>
  apiRequest<UserPrefsRaw>(`/settings/user-preferences/${id}`);
export const getUserPrefsEffective = (id: string) =>
  apiRequest<UserPrefsRaw>(`/settings/user-preferences/${id}/effective`);
export const saveUserPrefs         = (id: string, data: UserPrefsRaw) =>
  apiRequest(`/settings/user-preferences/${id}`, 'PUT', data);
export const resetUserPrefs        = (id: string) =>
  apiRequest(`/settings/user-preferences/${id}`, 'DELETE');
export const applyFieldsToAll      = (payload: { visibleFields: string[]; mode: 'missing' | 'add' }) =>
  apiRequest<{ updated: number; message?: string }>('/settings/apply-fields-to-all', 'POST', payload);

// ═══ МУТАЦИИ ═══
export const saveFields = (fields: FieldConfig[]) =>
  apiRequest<FieldConfig[]>('/settings/fields', 'PUT', fields);

export const saveFieldsWithConfirm = (fields: FieldConfig[]) =>
  apiRequest<FieldConfig[]>('/settings/fields?confirmDelete=true', 'PUT', fields);

export interface DepartmentFull {
  name: string;
  enabled: boolean;
  oldName?: string | null;
}

export const getDepartmentsFull = () =>
  apiRequest<DepartmentFull[]>('/settings/departments-full');

export const saveDepartments = (items: DepartmentFull[]) =>
  apiRequest('/settings/departments', 'PUT', items);

export const saveFilters = (filters: FilterConfig[]) =>
  apiRequest('/settings/filters', 'PUT', filters);

export const saveExport = (data: ExportSettingsRaw) =>
  apiRequest('/settings/export', 'PUT', data);

export const saveEquipmentTypes = (types: EquipmentType[]) =>
  apiRequest<EquipmentType[]>('/settings/equipment-types', 'PUT', types);

export const saveSystem = (data: Record<string, string>) =>
  apiRequest('/settings/system', 'PUT', data);

export const resetAllData = () =>
  apiRequest('/settings/reset-all-data', 'POST', { confirm: true });
