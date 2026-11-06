import { apiRequest } from './client';

export interface EquipmentTemplate {
  id: number;
  name: string;
  data: Record<string, string>;
}

export function getTemplates(): Promise<EquipmentTemplate[]> {
  return apiRequest<EquipmentTemplate[]>('/equipment-templates');
}

export function saveTemplate(name: string, data: Record<string, string>): Promise<EquipmentTemplate> {
  return apiRequest<EquipmentTemplate>('/equipment-templates', 'POST', { name, data });
}

export function deleteTemplate(id: number): Promise<void> {
  return apiRequest<void>(`/equipment-templates/${id}`, 'DELETE');
}
