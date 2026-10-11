/**
 * "KEY BOARD", "key board" and "kEy bOARD" all become "Key Board".
 *
 * Every letter is lowercased, then a letter that starts a word — one not
 * preceded by a letter or digit — is capitalised. That is the same rule as
 * Postgres's initcap(), which converted the rows saved before this existed, so
 * old and new names agree: "copper wire 2.5MM" -> "Copper Wire 2.5mm".
 */
export function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[^\p{L}\p{N}])(\p{L})/gu, (_, before: string, letter: string) =>
      before + letter.toUpperCase(),
    )
}
