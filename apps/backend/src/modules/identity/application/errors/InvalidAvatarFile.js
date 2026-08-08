import { DomainError } from '../../domain/errors/DomainError.js';

export class InvalidAvatarFile extends DomainError {
  constructor() {
    super('invalid_avatar_file', 'El archivo debe ser una imagen JPEG, PNG o WEBP.');
  }
}
