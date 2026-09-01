export const USERNAME_PATTERN = /^[a-z0-9_-]{3,20}$/;

export const USERNAME_ERROR_MESSAGE =
  'Kullanıcı adı 3-20 karakter olmalı; yalnızca İngilizce harf, rakam, - ve _ içerebilir. Türkçe karakter ve emoji kullanılamaz.';

export function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function sanitizeUsernameInput(value) {
  return normalizeUsername(value)
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 20);
}

export function isValidUsername(value) {
  return USERNAME_PATTERN.test(value);
}
