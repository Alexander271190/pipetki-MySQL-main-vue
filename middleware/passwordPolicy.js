'use strict';
const db = require('../db');

// ============================================================
// ПОЛИТИКА ПАРОЛЯ (читает из system_settings с кэшем 60 сек)
// ============================================================

// 🆕 Кэш настроек
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 60_000;

// 🆕 Дефолтные значения (совпадают с хардкодом — обратная совместимость)
const DEFAULTS = {
  minLength:      8,
  maxLength:      64,
  requireLower:   true,
  requireUpper:   true,
  requireDigit:   true,
  requireSpecial: true,
  forbidSpaces:   true,
};

async function getPasswordPolicy() {
  const now = Date.now();
  if (_cache && now - _cacheTime < CACHE_TTL) return _cache;

  try {
    const keys = [
      'password_min_length', 'password_max_length',
      'password_require_lower', 'password_require_upper',
      'password_require_digit', 'password_require_special',
      'password_forbid_spaces',
    ];
    const ph = keys.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN (${ph})`,
      keys
    );
    const s = {};
    for (const r of rows) s[r.setting_key] = r.setting_value;

    _cache = {
      minLength:      Math.max(6, Math.min(128, parseInt(s.password_min_length, 10) || DEFAULTS.minLength)),
      maxLength:      Math.max(8, Math.min(128, parseInt(s.password_max_length, 10) || DEFAULTS.maxLength)),
      requireLower:   s.password_require_lower === undefined ? DEFAULTS.requireLower : s.password_require_lower === '1',
      requireUpper:   s.password_require_upper === undefined ? DEFAULTS.requireUpper : s.password_require_upper === '1',
      requireDigit:   s.password_require_digit === undefined ? DEFAULTS.requireDigit : s.password_require_digit === '1',
      requireSpecial: s.password_require_special === undefined ? DEFAULTS.requireSpecial : s.password_require_special === '1',
      forbidSpaces:   s.password_forbid_spaces === undefined ? DEFAULTS.forbidSpaces : s.password_forbid_spaces === '1',
    };
    _cacheTime = now;
    return _cache;
  } catch (e) {
    // Если БД недоступна — возвращаем дефолты (не ломаем систему)
    console.error('[passwordPolicy] getPasswordPolicy failed, using defaults:', e.message);
    return { ...DEFAULTS };
  }
}

function invalidatePasswordPolicyCache() {
  _cache = null;
  _cacheTime = 0;
}

async function validatePassword(password) {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { ok: false, errors: ['Пароль не задан'] };
  }

  const p = await getPasswordPolicy();

  if (password.length < p.minLength) errors.push(`Минимум ${p.minLength} символов`);
  if (password.length > p.maxLength) errors.push(`Максимум ${p.maxLength} символов`);
  if (p.requireLower && !/[a-z]/.test(password)) errors.push('Хотя бы одна строчная буква (a-z)');
  if (p.requireUpper && !/[A-Z]/.test(password)) errors.push('Хотя бы одна заглавная буква (A-Z)');
  if (p.requireDigit && !/[0-9]/.test(password)) errors.push('Хотя бы одна цифра (0-9)');
  if (p.requireSpecial && !/[^A-Za-z0-9]/.test(password)) errors.push('Хотя бы один спецсимвол (!@#$%^&* и т.п.)');
  if (p.forbidSpaces && /\s/.test(password)) errors.push('Пробелы в пароле недопустимы');

  return { ok: errors.length === 0, errors };
}

// 🆕 Обратная совместимость: MIN_LENGTH как геттер для старого кода
// Если где-то было `const { MIN_LENGTH } = require(...)` — вернёт дефолт 8.
// Но реальная проверка идёт через getPasswordPolicy().
const MIN_LENGTH = DEFAULTS.minLength;

module.exports = {
  validatePassword,
  getPasswordPolicy,
  invalidatePasswordPolicyCache,
  MIN_LENGTH,  // оставлен для обратной совместимости
};
