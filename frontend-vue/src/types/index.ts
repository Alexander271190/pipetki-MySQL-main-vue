// Пользователь (как в /api/auth/verify)
export interface User {
  id: string;
  login: string;
  fullName: string;
  position: string;
  department?: string;
  role: string;
  roleName?: string;
  isAdmin: boolean;
  permissions?: string[];
  extraPermissions?: string[];
  onlyOwnDepartment?: boolean;
  isActing?: boolean;
  actingForId?: string | null;
  actingForName?: string | null;
  actingDepartment?: string | null;
  mustChangePassword?: boolean;
  mustSetPassword?: boolean;
  viewTemplateId?: number | null;
}

export type Status =
  | 'ok' | 'warn' | 'danger' | 'inactive'
  | 'sent' | 'fail' | 'wip' | 'unknown';

export type ResultType = 'pass' | 'fail' | 'wip';

export interface Pipette {
  id: string;
  model: string;
  manufacturer?: string;
  volume?: string;
  serial?: string;
  department?: string;
  responsible?: string;
  location?: string;
  last_calibration?: string;
  interval?: number;
  equipment_type: string;
  computed_status?: Status;
  sent_for_calibration?: string | null;
  sent_note?: string | null;
 replacing?: string | null;
 replaced_by?: string | null;
 replacement?: {
   id: string;
   model: string;
   manufacturer?: string;
   location?: string;
   active?: boolean;
   department?: string;
 } | null;
 replacedFor?: {
   id: string;
   model: string;
   manufacturer?: string;
   location?: string;
 } | null;
   active?: boolean;
   last_result?: ResultType;
   notes?: string;
   cert?: string;
   history_count?: number;
   updated_at?: string;
   [key: string]: unknown;
 }

export interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'warn' | '';
}

export interface LoginResponse {
  token: string;
  user: User;
  originalUser?: User;
  originalToken?: string;
}
