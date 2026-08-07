import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '@ctcj/shared';

export { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH };

export function isValidPasswordLength(password) {
  return (
    typeof password === 'string' &&
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH
  );
}

/** Requires at least one letter and one digit -- resists trivially-guessable
 * all-digit or all-letter passwords without demanding symbols/casing rules
 * that mostly just push users toward "P@ssw0rd1"-style patterns. */
export function hasLetterAndNumber(password) {
  return typeof password === 'string' && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}
