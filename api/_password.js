import crypto from 'crypto';

export const PASSWORD_PATTERN = /^[A-Za-z0-9!@#$%^&*()_+\-=]{4,8}$/;

export function hashPassword(password) {
  const salt = crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
  return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
  if (!salt || !hash || !password) return false;
  const check = crypto.createHash('sha256').update(salt + password).digest('hex');
  return check === hash;
}
