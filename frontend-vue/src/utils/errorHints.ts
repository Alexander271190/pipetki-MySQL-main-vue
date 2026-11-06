interface Hint { title: string; hint: string }

export const ERROR_HINTS: Record<string, Hint> = {
  data_error:             { title: 'Некорректные данные',          hint: 'Проверьте длину полей и формат даты' },
  race:                   { title: 'ID уже занят',                 hint: 'Обновите страницу и повторите' },
  duplicate_role:         { title: 'Роль с таким названием уже существует', hint: 'Придумайте другое название' },
  field_has_data:         { title: 'Поле заполнено',               hint: 'Подтвердите удаление ещё раз' },
  invalid_equipment_type: { title: 'Неизвестный тип оборудования', hint: 'Выберите тип из списка' },
  validation_error:       { title: 'Ошибка валидации',             hint: 'Проверьте введённые данные' },
  password_setup_required:  { title: 'Требуется установка пароля', hint: '' },
  password_change_required: { title: 'Требуется смена пароля',     hint: '' },
  http_400: { title: 'Некорректный запрос',          hint: 'Проверьте введённые данные' },
  http_403: { title: 'Доступ запрещён',              hint: 'Обратитесь к администратору' },
  http_404: { title: 'Не найдено',                   hint: 'Обновите страницу' },
  http_409: { title: 'Конфликт данных',              hint: 'Обновите страницу и повторите' },
  http_422: { title: 'Данные не приняты',            hint: 'Проверьте поля формы' },
  http_500: { title: 'Ошибка сервера',               hint: 'Повторите позже или обратитесь к администратору' },
  http_502: { title: 'Сервер недоступен',            hint: 'Повторите позже' },
  http_503: { title: 'Сервис временно недоступен',   hint: 'Повторите позже' },
};

// Технические сообщения — не показываем пользователю
export function isTechnicalMessage(msg: string): boolean {
  if (!msg) return true;
  return /^(ER_|Error:|SQL|Duplicate entry|Unknown column|Cannot read|TypeError|ReferenceError|SyntaxError)/i.test(msg)
      || /\bER_[A-Z_]+\b/.test(msg)
      || /\bsqlMessage\b/.test(msg)
      || /at\s+[\w.]+\s+\(/.test(msg);
}

export function buildErrorMessage(body: Record<string, unknown> | null, status: number): string {
  const code = body?.code as string | undefined;
  const serverError = body?.error && String(body.error).trim() ? String(body.error).trim() : null;

  if (code && ERROR_HINTS[code]) {
    const i = ERROR_HINTS[code];
    return i.hint ? `${i.title}\n${i.hint}` : i.title;
  }
  if (serverError && !isTechnicalMessage(serverError)) return serverError;
  if (ERROR_HINTS[`http_${status}`]) {
    const i = ERROR_HINTS[`http_${status}`];
    return i.hint ? `${i.title}\n${i.hint}` : i.title;
  }
  return serverError || `Ошибка ${status}`;
}
