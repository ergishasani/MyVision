/**
 * Fills `{name}` placeholders in a dictionary string.
 *
 * <p>Translations cannot be built by concatenating fragments — German puts the verb in a different
 * place and inflects around the value, so "Showing 1 – 25 of 92 entries" and "Einträge 1 – 25 von
 * 92" do not share a word order. Each language keeps one whole sentence with holes in it.
 */
export function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
