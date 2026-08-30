import { Fragment } from "react";

/**
 * Fills `{name}` placeholders in a translated sentence with React nodes.
 *
 * <p>The string version in `format.ts` handles plain values. This one exists because some
 * sentences carry a link or an emphasised span in the middle of them — the activity feed says
 * "Anna created invoice <a>R-2026-014</a> for Acme." — and the node cannot survive being turned
 * into text.
 *
 * <p>Building those by concatenating JSX fragments is what hard-codes English word order: German
 * puts the participle at the end ("… hat Rechnung R-2026-014 für Acme erstellt"), so each
 * language has to own the whole sentence and say where the pieces go.
 */
export function Interpolate({
  template,
  values,
}: {
  template: string;
  values: Record<string, React.ReactNode>;
}) {
  // Splitting on a capturing group interleaves literals and placeholder names, so odd indices
  // are always the names.
  const parts = template.split(/\{(\w+)\}/g);

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <Fragment key={index}>{values[part] ?? `{${part}}`}</Fragment>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
