import { downloadFile } from '@/utils/download';
import { todayStr } from '@/utils/format';
import { useAuthStore } from '@/stores/auth';

export async function exportRegistryToXlsx(
  data: { headers: string[]; rows: Record<string, string>[]; fields: string[] }
): Promise<void> {
  const auth = useAuthStore();
  await downloadFile(
    '/api/export/xlsx',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'registry',
        meta: {
          title: 'Реестр оборудования — КГБУЗ «Краевая клиническая больница», КДЛ',
          date: new Date().toLocaleDateString('ru-RU'),
          recordCount: data.rows.length,
          user: auth.user?.fullName || '',
          userPosition: auth.user?.position || '',
        },
        headers: data.headers,
        rows: data.rows,
        fields: data.fields,
      }),
    },
    `pipettes_${todayStr()}.xlsx`
  );
}

export async function exportHistoryToXlsx(payload: {
  meta: Record<string, unknown>;
  headers: string[];
  rows: Record<string, string>[];
  equipmentId: string;
}): Promise<void> {
  await downloadFile(
    '/api/export/xlsx',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'history',
        meta: payload.meta,
        headers: payload.headers,
        rows: payload.rows,
      }),
    },
    `history_${payload.equipmentId}_${todayStr()}.xlsx`
  );
}
