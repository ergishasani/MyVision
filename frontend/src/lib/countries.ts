/**
 * Countries for the address pickers.
 *
 * <p>The full ISO 3166-1 alpha-2 set, not a curated shortlist. A `<select>` whose value matches
 * none of its options silently renders the first one instead, so a shortlist does not merely
 * inconvenience someone invoicing an unusual country — it displays a different country than the
 * record holds, and the recipient's country is a required field on an invoice.
 *
 * <p>Names come from the browser's own locale data rather than a hand-typed table, so they are
 * translated and spelled correctly without this file having to know how.
 */

const CODES = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ",
  "CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ",
  "DE","DJ","DK","DM","DO","DZ",
  "EC","EE","EG","EH","ER","ES","ET",
  "FI","FJ","FK","FM","FO","FR",
  "GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY",
  "HK","HM","HN","HR","HT","HU",
  "ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT",
  "JE","JM","JO","JP",
  "KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ",
  "LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY",
  "MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ",
  "NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ",
  "OM",
  "PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY",
  "QA",
  "RE","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ",
  "TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ",
  "UA","UG","UM","US","UY","UZ",
  "VA","VC","VE","VG","VI","VN","VU",
  "WF","WS",
  "YE","YT",
  "ZA","ZM","ZW",
];

/** Codes a German business reaches for most, floated to the top of the list. */
const PINNED = ["DE", "AT", "CH"];

function displayName(code: string, locale: string) {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    // Ancient browsers, or a code the runtime does not know. The code itself is still honest.
    return code;
  }
}

export type Country = { code: string; name: string };

/**
 * The picker's options, with the common ones first and the rest alphabetical.
 *
 * <p>`current` is always included even when it is not a code this list knows, so the select can
 * never display a country other than the one actually stored.
 */
export function countryOptions(locale = "en", current?: string | null): Country[] {
  const known = new Set(CODES);
  const codes = [...CODES];
  if (current && !known.has(current)) {
    codes.push(current);
  }

  const named = codes.map((code) => ({ code, name: displayName(code, locale) }));
  const pinned = PINNED.map((code) => named.find((entry) => entry.code === code)).filter(
    (entry): entry is Country => Boolean(entry),
  );
  const rest = named
    .filter((entry) => !PINNED.includes(entry.code))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  return [...pinned, ...rest];
}

/** The printable name for a single code, for the document itself. */
export function countryName(code: string | null | undefined, locale = "en") {
  if (!code) return null;
  return displayName(code, locale);
}
