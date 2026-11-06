import { apiRequest } from './client';

export interface BarcodePrinterFull {
  id: number;
  name: string;
  mode: 'pdf-a4' | 'pdf-zebra' | 'zebra-ip' | 'zebra-agent';
  department?: string;
  ip?: string;
  port?: number;
  labelSize?: string;
  enabled: boolean;
  isDefault: boolean;
  sortOrder?: number;
}

export const getBarcodePrinters = () => apiRequest<BarcodePrinterFull[]>('/barcode-printers');
export const createBarcodePrinter = (payload: Partial<BarcodePrinterFull>) =>
  apiRequest<BarcodePrinterFull>('/barcode-printers', 'POST', payload);
export const updateBarcodePrinter = (id: number, payload: Partial<BarcodePrinterFull>) =>
  apiRequest<BarcodePrinterFull>('/barcode-printers/' + id, 'PUT', payload);
export const deleteBarcodePrinter = (id: number) =>
  apiRequest('/barcode-printers/' + id, 'DELETE');
export const checkPrinterStatus = (ip: string, port?: number) =>
  apiRequest<{ ok: boolean; message: string }>('/barcodes/printer-status', 'POST', { ip, port });
