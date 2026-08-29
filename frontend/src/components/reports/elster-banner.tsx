"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils/cn";

/* ---------------------------------------------------------------------------
 * The panel at the top of the VAT return screen.
 *
 * The original this is modelled on advertises submitting a return through an Elster certificate.
 * MyVision cannot do that, so rather than a dead promotion for a feature that does not exist, the
 * two cards are wired to the real things they depict: producing the return document, and getting
 * to the payment side. Every string and both actions are props, so the copy can become marketing
 * again — or become German — without touching the layout.
 * ------------------------------------------------------------------------ */

const DISMISS_KEY = "myvision_vat_panel_dismissed";

function readDismissed() {
  // Storage throws outright in some contexts (private windows, blocked site data), so a failure
  // to read must leave the panel showing rather than take the screen down.
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Dismissal, held as a tiny external store.
 *
 * <p>localStorage does not exist during the server render, so the value has to arrive after
 * hydration or React reports a mismatch. useSyncExternalStore is the sanctioned way to do that:
 * the server snapshot is always "showing", and the real value replaces it on the client. The
 * cached snapshot matters too — returning a fresh read each time would hand React a new value on
 * every render and spin.
 */
let dismissedCache: boolean | null = null;
let listeners: Array<() => void> = [];

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  return () => {
    listeners = listeners.filter((listener) => listener !== onChange);
  };
}

function getSnapshot() {
  if (dismissedCache === null) {
    dismissedCache = readDismissed();
  }
  return dismissedCache;
}

function dismissPanel() {
  dismissedCache = true;
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Dismissing for this view still works; it just will not be remembered.
  }
  listeners.forEach((listener) => listener());
}

export function ElsterBanner({
  title = "Take your VAT figures straight to your tax office.",
  body = "Export the return as a document for your advisor or Elster submission, then record what you paid the tax office against it.",
  actionLabel = "Further information",
  actionHref = "/steer/tax-advisor",
  documentLabel = "VAT return document",
  paymentLabel = "Tax office payment",
  paymentHref = "/payments",
  onExport,
  dismissible = true,
}: {
  title?: string;
  body?: string;
  actionLabel?: string;
  actionHref?: string;
  documentLabel?: string;
  paymentLabel?: string;
  paymentHref?: string;
  /** Runs when the document card is used. Without it the card renders inert rather than lying. */
  onExport?: () => void;
  dismissible?: boolean;
}) {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, () => false);

  if (dismissed) {
    return null;
  }

  return (
    <section className="relative isolate overflow-hidden rounded-2xl bg-[#e3e1fb] px-6 py-7 sm:px-8">
      <Rings />

      {dismissible ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismissPanel}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[#312e81] transition-colors hover:bg-white/60"
        >
          <CloseIcon className="size-5" />
        </button>
      ) : null}

      <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="max-w-sm shrink-0">
          <h2 className="pr-8 text-lg font-semibold leading-snug text-[#312e81]">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#312e81]/75">{body}</p>
          <Link
            href={actionHref}
            className="mt-5 inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm font-medium text-[#312e81] shadow-sm transition-shadow hover:shadow-md"
          >
            {actionLabel}
          </Link>
        </div>

        <Flow
          documentLabel={documentLabel}
          paymentLabel={paymentLabel}
          paymentHref={paymentHref}
          onExport={onExport}
        />
      </div>
    </section>
  );
}

/**
 * The two documents and the link between them.
 *
 * <p>Laid out on a diagonal rather than in a row: the second card sits lower so the pair reads as
 * a flow from one thing to the next, which a straight line of two equal boxes does not.
 */
function Flow({
  documentLabel,
  paymentLabel,
  paymentHref,
  onExport,
}: {
  documentLabel: string;
  paymentLabel: string;
  paymentHref: string;
  onExport?: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center pb-8 pt-2 lg:pr-8">
      <FlowCard
        icon={<ReceiptIcon className="size-6" />}
        label={documentLabel}
        sparkle
        onClick={onExport}
        title={onExport ? "Export this return" : undefined}
      />

      <Connector />

      <FlowCard
        icon={<BankIcon className="size-6" />}
        label={paymentLabel}
        href={paymentHref}
        className="translate-y-14"
      />
    </div>
  );
}

function FlowCard({
  icon,
  label,
  sparkle,
  href,
  onClick,
  title,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  sparkle?: boolean;
  href?: string;
  onClick?: () => void;
  title?: string;
  className?: string;
}) {
  const shell = cn(
    "flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-[0_2px_10px_rgba(49,46,129,0.10)]",
    (href || onClick) && "transition-shadow hover:shadow-[0_6px_20px_rgba(49,46,129,0.18)]",
    className,
  );

  const body = (
    <>
      <span className="text-[#312e81]">{icon}</span>
      <span className="whitespace-nowrap text-base font-medium text-[#312e81]">{label}</span>
      {sparkle ? <SparkleIcon className="size-4 shrink-0 text-[#a5b4fc]" /> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={shell} title={title}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={shell} title={title}>
        {body}
      </button>
    );
  }
  // No action wired: still rendered, but not pretending to be pressable.
  return <div className={shell}>{body}</div>;
}

/**
 * The dashed run with the link badge sitting on it.
 *
 * <p>Drawn as SVG rather than a CSS dashed border: `border-dashed` gives thin hairline ticks at
 * whatever spacing the browser picks, and the chunky rounded dashes here need explicit control.
 */
function Connector() {
  return (
    <div className="flex items-center">
      <DashRun />
      <span className="z-10 grid size-11 shrink-0 place-items-center rounded-full bg-white shadow-[0_2px_10px_rgba(49,46,129,0.12)]">
        <LinkIcon className="size-5 text-[#4f46e5]" />
      </span>
      <DashRun />
    </div>
  );
}

function DashRun() {
  return (
    <svg width="34" height="4" viewBox="0 0 34 4" fill="none" aria-hidden className="shrink-0">
      <line
        x1="2"
        y1="2"
        x2="32"
        y2="2"
        stroke="#8b86e6"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="1 9"
      />
    </svg>
  );
}

/** The faint concentric rings. Decorative, so hidden from assistive tech and never clickable. */
function Rings() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 500 500"
      fill="none"
      className="pointer-events-none absolute -right-32 top-1/2 -z-10 h-[560px] -translate-y-1/2 text-[#c9c4f2]"
    >
      {[90, 150, 210, 270].map((r) => (
        <circle key={r} cx="250" cy="250" r={r} stroke="currentColor" strokeWidth="2" />
      ))}
    </svg>
  );
}

/* --- icons --- */
type IconProps = { className?: string };

const CloseIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden="true" className={className}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

const ReceiptIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="M6 3h12v18l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.4Z" />
    <path d="M9.5 8.5h5M9.5 12.5h5" />
  </svg>
);

const BankIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="M3.5 10h17" />
    <path d="m12 3.5 8.5 6.5h-17Z" />
    <path d="M6.5 10v7M12 10v7M17.5 10v7" />
    <path d="M3.5 20h17" />
  </svg>
);

const LinkIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="M10 13.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L11 7.5" />
    <path d="M14 10.5a3.5 3.5 0 0 0-5 0L6.5 13a3.5 3.5 0 0 0 5 5l1.5-1.5" />
  </svg>
);

/** Four-pointed star with a smaller companion, as in the original. */
const SparkleIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M9.5 2c.35 4.2 1.8 5.65 6 6-4.2.35-5.65 1.8-6 6-.35-4.2-1.8-5.65-6-6 4.2-.35 5.65-1.8 6-6Z" />
    <path d="M18 14.5c.16 1.9.8 2.55 2.7 2.7-1.9.16-2.54.8-2.7 2.7-.16-1.9-.8-2.54-2.7-2.7 1.9-.15 2.54-.8 2.7-2.7Z" />
  </svg>
);
