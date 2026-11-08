import { apiRequest } from './client';

export interface BarcodeLookupResult {
  id: string;
  model: string;
  sent_for_calibration?: string | null;
  equipment_type: string;
}

export function lookupBarcode(barcode: string): Promise<BarcodeLookupResult> {
  return apiRequest<BarcodeLookupResult>('/barcodes/lookup', 'POST', { barcode });
}

export interface BarcodePrinter {
  id: number;
  name: string;
  mode: 'pdf-a4' | 'pdf-zebra' | 'zebra-ip' | 'zebra-agent';
  department?: string;
  ip?: string;
  port?: number;
  labelSize?: string;
  enabled?: boolean;
  isDefault?: boolean;
}

export interface AvailablePrintersResponse {
  printers: BarcodePrinter[];
  preferredId?: number;
}

export function getAvailablePrinters(): Promise<AvailablePrintersResponse> {
  return apiRequest<AvailablePrintersResponse>('/barcode-printers/available');
}

export interface PrintResult {
  mode: 'zebra-ip' | 'zebra-agent' | 'pdf-zebra' | 'pdf-a4' | 'pdf-a4-fallback';
  message?: string;
  printer?: string;
  printed?: number;
  zpl?: string;
  agentPort?: number;
  reason?: string;
}

export function printBarcodes(ids: string[], copies: number, printerId: number): Promise<PrintResult> {
  return apiRequest<PrintResult>('/barcodes/print', 'POST', { ids, copies, printerId });
}

// === 1.5 === шрифты для этикеток
export interface BarcodeFont {
  value: string;
  label: string;
}

export function getBarcodeFonts(): Promise<BarcodeFont[]> {
  return apiRequest<BarcodeFont[]>('/barcodes/fonts');
}
