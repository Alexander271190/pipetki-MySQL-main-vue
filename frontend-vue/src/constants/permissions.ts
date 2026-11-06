export interface PermissionDef {
  key: string;
  group: string;
  label: string;
}

export const ALL_PERMISSIONS: PermissionDef[] = [
  { key: 'add_pipette',       group: 'Оборудование', label: '<i class="fa-solid fa-plus"></i> Добавление оборудования' },
  { key: 'edit_pipette',      group: 'Оборудование', label: '<i class="fa-solid fa-pen"></i> Редактирование оборудования' },
  { key: 'delete_pipette',    group: 'Оборудование', label: '<i class="fa-solid fa-trash"></i> Удаление оборудования' },
  { key: 'quick_calibration', group: 'Оборудование', label: '<i class="fa-solid fa-clipboard-check"></i> Быстрая поверка' },
  { key: 'transfer_pipette',  group: 'Оборудование', label: '<i class="fa-solid fa-right-left"></i> Передача в другой отдел' },
  { key: 'bulk_change_responsible', group: 'Оборудование', label: '<i class="fa-solid fa-user-pen"></i> Массовая смена ответственного' },
  { key: 'bulk_send',         group: 'Поверки',      label: '<i class="fa-solid fa-box"></i> Отправка на поверку' },
  { key: 'bulk_return',       group: 'Поверки',      label: '<i class="fa-solid fa-box-open"></i> Возврат с поверки' },
  { key: 'import_data',       group: 'Данные',       label: '<i class="fa-solid fa-download"></i> Импорт данных' },
  { key: 'export_data',       group: 'Данные',       label: '<i class="fa-solid fa-print"></i> Печать документов' },
  { key: 'scan_barcode',      group: 'Штрихкоды',    label: '<i class="fa-solid fa-barcode"></i> Сканирование' },
  { key: 'print_labels',      group: 'Штрихкоды',    label: '<i class="fa-solid fa-tag"></i> Печать этикеток' },
  { key: 'manage_barcodes',   group: 'Штрихкоды',    label: '<i class="fa-solid fa-wand-magic-sparkles"></i> Управление ШК' },
  { key: 'manage_users',      group: 'Администрирование', label: '<i class="fa-solid fa-users"></i> Управление пользователями' },
  { key: 'manage_settings',   group: 'Администрирование', label: '<i class="fa-solid fa-gear"></i> Настройки системы' },
  { key: 'manage_printers',   group: 'Администрирование', label: '<i class="fa-solid fa-print"></i> Управление принтерами' },
  { key: 'view_log',          group: 'Администрирование', label: '<i class="fa-solid fa-scroll"></i> Просмотр журнала' },
  { key: 'view_history',      group: 'Общие',        label: '<i class="fa-solid fa-clock-rotate-left"></i> История поверок' },
  { key: 'view_audit',        group: 'Общие',        label: '<i class="fa-solid fa-clipboard-list"></i> Аудит изменений' },
];
