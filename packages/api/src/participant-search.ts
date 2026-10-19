export type ParticipantSearchFields = {
  exact: readonly unknown[];
  fuzzy?: readonly unknown[];
};

type SearchIndexEntry<T> = {
  item: T;
  order: number;
  exactValues: string[];
  digitValues: string[];
  fuzzyTokens: string[];
};

export type ParticipantSearchIndex<T> = SearchIndexEntry<T>[];

/** Normalizes user-entered text without changing the value displayed to the user. */
export function normalizeSearchValue(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function toSearchStrings(values: readonly unknown[] | undefined): string[] {
  return (values ?? [])
    .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
    .map((value) => normalizeSearchValue(String(value)))
    .filter(Boolean);
}

function tokenize(value: string): string[] {
  return value.split(/[\s\-_/.,;:()[\]]+/).filter(Boolean);
}

/**
 * Builds the normalized fields once per participant list, avoiding repeated
 * Unicode work on every keystroke in desktop and mobile.
 */
export function createParticipantSearchIndex<T>(
  items: readonly T[],
  getFields: (item: T) => ParticipantSearchFields,
): ParticipantSearchIndex<T> {
  return items.map((item, order) => {
    const fields = getFields(item);
    const exactValues = toSearchStrings(fields.exact);
    const fuzzyValues = toSearchStrings(fields.fuzzy);

    return {
      item,
      order,
      exactValues,
      digitValues: exactValues.map(normalizeDigits).filter((value) => value.length > 0),
      fuzzyTokens: fuzzyValues.flatMap(tokenize),
    };
  });
}

function maxEditDistance(length: number): number {
  if (length <= 3) return 1;
  if (length <= 7) return 2;
  return Math.min(3, Math.floor(length / 4));
}

/** Damerau-Levenshtein distance with an early exit for bounded fuzzy search. */
function boundedDamerauLevenshtein(left: string, right: string, limit: number): number {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;

  const previousPrevious = new Array(right.length + 1).fill(0);
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let row = 1; row <= left.length; row += 1) {
    const current = new Array(right.length + 1).fill(0);
    current[0] = row;
    let rowMinimum = current[0];

    for (let column = 1; column <= right.length; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
      let distance = Math.min(
        (previous[column] ?? limit + 1) + 1,
        (current[column - 1] ?? limit + 1) + 1,
        (previous[column - 1] ?? limit + 1) + substitutionCost,
      );

      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        distance = Math.min(distance, (previousPrevious[column - 2] ?? limit + 1) + 1);
      }

      current[column] = distance;
      rowMinimum = Math.min(rowMinimum, distance);
    }

    if (rowMinimum > limit) return limit + 1;
    previousPrevious.splice(0, previousPrevious.length, ...previous);
    previous = current;
  }

  return previous[right.length] ?? limit + 1;
}

function fuzzyScore(queryTokens: string[], candidateTokens: string[]): number | null {
  let total = 0;

  for (const queryToken of queryTokens) {
    if (queryToken.length < 2) return null;

    const limit = maxEditDistance(queryToken.length);
    let best = Number.POSITIVE_INFINITY;

    for (const candidateToken of candidateTokens) {
      if (candidateToken.includes(queryToken)) {
        best = 0;
        break;
      }

      const distance = boundedDamerauLevenshtein(queryToken, candidateToken, limit);
      if (distance <= limit) best = Math.min(best, distance);
    }

    if (!Number.isFinite(best)) return null;
    total += best / Math.max(queryToken.length, 1);
  }

  return total / queryTokens.length;
}

export function searchParticipantIndex<T>(
  index: ParticipantSearchIndex<T>,
  query: string,
): T[] {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return index.map((entry) => entry.item);

  const queryDigits = normalizeDigits(query);
  const exactMatches = index.filter((entry) =>
    entry.exactValues.some((value) => value.includes(normalizedQuery)) ||
    (queryDigits.length >= 3 && entry.digitValues.some((value) => value.includes(queryDigits))),
  );
  if (exactMatches.length > 0) return exactMatches.map((entry) => entry.item);

  if (normalizedQuery.length < 3) return [];
  const queryTokens = tokenize(normalizedQuery);

  return index
    .map((entry) => ({ entry, score: fuzzyScore(queryTokens, entry.fuzzyTokens) }))
    .filter((result): result is { entry: SearchIndexEntry<T>; score: number } => result.score != null)
    .sort((left, right) => left.score - right.score || left.entry.order - right.entry.order)
    .map(({ entry }) => entry.item);
}
