export interface RequiredPhraseRule {
  phrase: string;
  /** Empty means always required; otherwise a case-insensitive user-query trigger. */
  condition: string;
}

export interface ResponseDictionary {
  forbiddenWords?: string[];
  requiredWords?: RequiredPhraseRule[];
}

export function hasResponseDictionary(dictionary: ResponseDictionary): boolean {
  return Boolean(
    dictionary.forbiddenWords?.length
    || dictionary.requiredWords?.length
  );
}

/**
 * Enforce dictionary rules on a complete model response.
 *
 * Callers must buffer while a dictionary is active: filtering individual SSE
 * chunks would leak a forbidden phrase split across chunk boundaries.
 */
export function enforceResponseDictionary(
  response: string,
  userMessage: string,
  dictionary: ResponseDictionary
): string {
  let result = response;
  const activeRequired = (dictionary.requiredWords ?? []).filter((rule) =>
    !rule.condition.trim()
    || normalized(userMessage).includes(normalized(rule.condition))
  );

  const missing = activeRequired
    .map((rule) => rule.phrase.trim())
    .filter((phrase) => phrase && !normalized(result).includes(normalized(phrase)));
  if (missing.length > 0) {
    result = `${result.trim()}\n\n${missing.join('\n')}`;
  }

  for (const phrase of dictionary.forbiddenWords ?? []) {
    const trimmed = phrase.trim();
    if (!trimmed) continue;
    result = result.replace(new RegExp(escapeRegExp(trimmed), 'giu'), '');
  }

  return result
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalized(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
