/** Money and date formatting shared by the list screens. */

export function formatMoney(amount: string | number | null, currency = "EUR") {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(date);
}

/** Whole days an invoice is past its due date; negative means still to come. */
export function daysOverdue(dueDate: string | null) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;
  const ms = Date.now() - due.getTime();
  return Math.floor(ms / 86_400_000);
}

/** "partially_paid" -> "Partially paid" */
export function humanizeStatus(status: string) {
  const spaced = status.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
