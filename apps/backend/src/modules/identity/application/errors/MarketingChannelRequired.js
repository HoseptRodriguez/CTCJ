import { DomainError } from '../../domain/errors/DomainError.js';

/** Accepting promotions needs at least one channel (correo o WhatsApp). */
export class MarketingChannelRequired extends DomainError {
  constructor() {
    super('marketing_channel_required', 'Elige al menos un canal: correo o WhatsApp.');
  }
}
