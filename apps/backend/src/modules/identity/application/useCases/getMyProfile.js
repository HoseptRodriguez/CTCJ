import { UserNotFound } from '../errors/UserNotFound.js';

/**
 * Self-service: the caller's own basic profile. The access token
 * deliberately carries no PII (see TokenService's docstring: claims are
 * {sub, roles, iat, exp} only) -- so the dashboard's "Welcome, {name}"
 * greeting and any future profile page need a real endpoint for this,
 * rather than smuggling a name into the JWT.
 *
 * @param {{ userRepository: import('../ports/UserRepository.js').UserRepository }} deps
 */
export function createGetMyProfile({ userRepository }) {
  /** @param {{ userId: string }} input */
  return async function getMyProfile({ userId }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UserNotFound();
    }
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      birthDate: user.birthDate,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
    };
  };
}
