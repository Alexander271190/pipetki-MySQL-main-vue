'use strict';

const HELP_TITLES = {
  'intro': 'Начало работы', 'login': 'Вход в систему', 'screen': 'Что на экране',
  'roles': 'Роли и права', 'view': 'Просмотр таблицы', 'search': 'Поиск и фильтры',
  'add-single': 'Добавить одну единицу', 'add-batch': 'Добавить партию',
  'edit': 'Редактирование', 'delete': 'Удаление', 'quickcal': 'Быстрая поверка',
  'history': 'История поверок', 'send': 'Отправка на поверку', 'return': 'Возврат с поверки',
  'transfer': 'Передача в отдел', 'bulk-responsible': 'Массовая смена ответственного',
  'scan': 'Сканирование штрихкодов', 'print': 'Печать этикеток', 'export': 'Экспорт данных',
  'hotkeys': 'Горячие клавиши', 'theme': 'Тёмная тема', 'help-admin': 'Редактирование справки',
  'faq': 'Частые вопросы', 'print-docs': 'Печать документов',
};

const HELP_PERMISSIONS = {
  'add-batch': ['add_pipette'], 'add-single': ['add_pipette'], 'bulk-responsible': ['bulk_change_responsible'],
  'delete': ['delete_pipette'], 'edit': ['edit_pipette'], 'export': ['export_data'],
  'print': ['print_labels'], 'scan': ['scan_barcode'], 'transfer': ['transfer_pipette'],
  'quickcal': ['quick_calibration'], 'history': ['view_history'], 'send': ['bulk_send'],
  'return': ['bulk_return'], 'roles': ['manage_users'], 'help-admin': ['manage_settings'],
  'print-docs': ['export_data'],
};

module.exports = { HELP_TITLES, HELP_PERMISSIONS };
