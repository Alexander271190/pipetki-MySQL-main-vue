import { apiRequest } from './client';

export interface ViewTemplate {
  id: number;
  name: string;
  visibleFields: string[];
  isDefault: boolean;
}

export const getViewTemplates = () => apiRequest<ViewTemplate[]>('/view-templates');
export const createViewTemplate = (payload: { name: string; visibleFields: string[]; isDefault: boolean }) =>
  apiRequest<ViewTemplate>('/view-templates', 'POST', payload);
export const updateViewTemplate = (id: number, payload: { name: string; visibleFields: string[]; isDefault: boolean }) =>
  apiRequest<ViewTemplate>('/view-templates/' + id, 'PUT', payload);
export const deleteViewTemplate = (id: number) =>
  apiRequest('/view-templates/' + id, 'DELETE');
export const applyViewTemplateToUser = (tplId: number, userId: string) =>
  apiRequest(`/view-templates/${tplId}/apply-to-user/${userId}`, 'POST', {});
export const resetViewTemplateFromUser = (userId: string) =>
  apiRequest(`/view-templates/apply-to-user/${userId}`, 'DELETE');
