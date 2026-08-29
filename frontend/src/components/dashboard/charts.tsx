"use client";

import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/utils/format";

/* ---------------------------------------------------------------------------
 * Charts for the overview screen.
 *
 * Hand-rolled rather than pulled from a charting library: three shapes are needed and each is a
 * few dozen lines, which is far less to carry than a dependency and its theming layer.
 *
 * The bar chart is laid out with CSS rather than SVG so its labels stay at the browser's own text
 * size — SVG text scales with the viewBox and goes blurry or tiny in a narrow card.
 * ------------------------------------------------------------------------ */

/** Rounds a maximum up to something a person would choose for an axis: 1, 2, 2.5 or 5 × 10ⁿ. */
function niceCeiling(value: number) {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10;
  return step * magnitude;
}

export type RevenueBar = {
  label: string;
  invoiced: number;
  collected: number;
};

/**
 * Twelve months of invoiced against collected.
 *
 * <p>Both series share one axis, because the point of showing them together is the gap between
 * them — separate scales would hide exactly the thing worth seeing.
 */
export function RevenueChart({
  data,
  currency,
}: {
  data: RevenueBar[];
  currency: string;
}) {
  const peak = Math.max(0, ...data.map((point) => Math.max(point.invoiced, point.collected)));
  const ceiling = niceCeiling(peak);
  // Four gridlines plus the baseline. Drawn top-down so the array reads like the axis.
  const lines = ceiling === 0 ? [0] : [1, 0.75, 0.5, 0.25, 0].map((fraction) => fraction * ceiling);

  return (
    <div>
      <div className="flex gap-3">
        <div className="flex w-20 shrink-0 flex-col justify-between py-1 text-right text-xs tabular-nums text-muted">
          {lines.map((line) => (
            <span key={line}>{compactMoney(line, currency)}</span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Gridlines sit behind the bars; the bars are laid out in normal flow on top. */}
          <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
            {lines.map((line) => (
              <span key={line} className="h-px w-full bg-border" />
            ))}
          </div>

          <div className="relative flex h-52 items-end gap-1">
            {data.map((point) => (
              <div key={point.label} className="flex h-full min-w-0 flex-1 items-end justify-center gap-[3px]">
                <Bar
                  value={point.invoiced}
                  ceiling={ceiling}
                  className="bg-primary"
                  title={`${point.label} · invoiced ${formatMoney(point.invoiced, currency)}`}
                />
                <Bar
                  value={point.collected}
                  ceiling={ceiling}
                  className="bg-emerald-500"
                  title={`${point.label} · collected ${formatMoney(point.collected, currency)}`}
                />
              </div>
            ))}
          </div>

          <div className="mt-2 flex gap-1">
            {data.map((point) => (
              <span
                key={point.label}
                className="min-w-0 flex-1 truncate text-center text-[11px] text-muted"
              >
                {point.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({
  value,
  ceiling,
  className,
  title,
}: {
  value: number;
  ceiling: number;
  className: string;
  title: string;
}) {
  const height = ceiling > 0 ? (value / ceiling) * 100 : 0;
  return (
    <span
      title={title}
      // A month with no revenue keeps a hairline so the column reads as "nothing" rather than as
      // a rendering gap.
      style={{ height: `${Math.max(height, value > 0 ? 1.5 : 0)}%` }}
      className={cn("w-full max-w-4 rounded-t-sm", height === 0 ? "bg-slate-200" : className)}
    >
      <span className="sr-only">{title}</span>
    </span>
  );
}

/** "12.500 €" rather than "12.500,00 €" — axis labels do not need the cents. */
function compactMoney(value: number, currency: string) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export type DonutSlice = {
  label: string;
  value: number;
  color: string;
};

/**
 * A ring with the total in the middle.
 *
 * <p>Segments are drawn as dashes on one circle, which is why the stroke maths looks the way it
 * does: each slice sets a dash the length of its share and is pushed round by everything before
 * it. The whole thing is rotated a quarter turn so the first slice starts at twelve o'clock.
 */
export function DonutChart({
  slices,
  total,
  currency,
  size = 180,
}: {
  slices: DonutSlice[];
  total: number;
  currency: string;
  size?: number;
}) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const sum = slices.reduce((running, slice) => running + slice.value, 0);

  let consumed = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 180 180" className="size-full -rotate-90">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="currentColor" strokeWidth="22" className="text-slate-100" />
        {sum > 0
          ? slices.map((slice) => {
              const length = (slice.value / sum) * circumference;
              const offset = -consumed;
              consumed += length;
              return (
                <circle
                  key={slice.label}
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="22"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={offset}
                >
                  <title>{`${slice.label}: ${formatMoney(slice.value, currency)}`}</title>
                </circle>
              );
            })
          : null}
      </svg>

      <div className="absolute inset-0 grid place-items-center">
        <span className="px-6 text-center text-sm font-semibold tabular-nums text-foreground">
          {formatMoney(total, currency)}
        </span>
      </div>
    </div>
  );
}

/**
 * A semicircular gauge, 0–100.
 *
 * <p>Used for the bookkeeping score. Rendered greyed when there is no data behind it, so it reads
 * as "not measured" rather than as a real hundred per cent.
 */
export function Gauge({ percent, muted = false }: { percent: number; muted?: boolean }) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  // Semicircle of radius 70: half the circumference is the full sweep.
  const sweep = Math.PI * 70;
  const filled = (clamped / 100) * sweep;

  return (
    <div className="relative mx-auto w-[200px]">
      <svg viewBox="0 0 180 100" className="w-full">
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          strokeWidth="18"
          strokeLinecap="round"
          className="stroke-slate-200"
        />
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${sweep}`}
          className={muted ? "stroke-slate-300" : "stroke-emerald-500"}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <span
          className={cn(
            "text-3xl font-semibold tabular-nums",
            muted ? "text-muted" : "text-foreground",
          )}
        >
          {Math.round(clamped)}%
        </span>
      </div>
    </div>
  );
}

/** The palette the customer ring cycles through. Distinct at a glance, and colour-blind safe. */
export const DONUT_COLORS = ["#3730a3", "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc"];
