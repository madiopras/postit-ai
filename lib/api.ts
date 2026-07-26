/**
 * Shared helpers for route handlers.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Check a dynamic route segment before using it in a query.
 *
 * Every id column in the schema is `uuid`, and Postgres raises a parse error on
 * anything else — which surfaced as a 500 for a request that is simply asking
 * for something that cannot exist. Callers should answer 404 instead.
 */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
