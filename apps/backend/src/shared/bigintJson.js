// `res.json()` (JSON.stringify) throws a TypeError on BigInt by default.
// Court/reservation/payment COP amounts are Postgres bigint (see
// schema.prisma), and this project has no fractional-currency amounts that
// would ever approach Number.MAX_SAFE_INTEGER, so plain-number serialization
// is safe. Importing this module (for its side effect) before anything else
// touches JSON.stringify makes every endpoint that returns a *Cop field work
// without each call site having to remember to convert it.
BigInt.prototype.toJSON = function toJSON() {
  return Number(this);
};
