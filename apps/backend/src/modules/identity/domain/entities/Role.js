import { ROLE_DEFINITIONS, ROLE_CODES } from '@ctcj/shared';

/** Domain-side view of a role: code + the two invariants that matter for RBAC. */
export class Role {
  constructor(code) {
    const definition = ROLE_DEFINITIONS.find((r) => r.code === code);
    if (!definition) {
      throw new Error(`Unknown role code: ${code}`);
    }
    this.code = definition.code;
    this.selfAssignable = definition.selfAssignable;
    this.requiresMfa = definition.requiresMfa;
  }

  static fromCode(code) {
    return new Role(code);
  }
}

export { ROLE_CODES };
