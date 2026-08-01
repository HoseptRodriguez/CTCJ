import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '@ctcj/shared';

export { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH };

export function isValidPasswordLength(password) {
  return (
    typeof password === 'string' &&
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH
  );
}
