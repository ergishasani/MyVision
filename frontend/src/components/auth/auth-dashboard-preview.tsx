"use client";

import { useState } from "react";

const CONFIGURED_PREVIEW = process.env.NEXT_PUBLIC_AUTH_PREVIEW_IMAGE;

type AuthDashboardPreviewProps = {
  imageSrc?: string;
};

export function AuthDashboardPreview({
  imageSrc = CONFIGURED_PREVIEW,
}: AuthDashboardPreviewProps) {
  const [resolvedSrc, setResolvedSrc] = useState(imageSrc ?? null);

  if (!resolvedSrc) {
    return <DashboardMockup />;
  }

  return (
    <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-blue-950/30">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedSrc}
        alt="MyVision dashboard preview"
        className="h-auto w-full object-cover"
        onError={() => setResolvedSrc(null)}
      />
    </div>
  );
}

function DashboardMockup() {
  return (
    <div
      className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-blue-950/30"
      aria-label="Dashboard preview placeholder"
    >
      <div className="border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total Revenue" value="$189,374" />
          <StatCard label="Outstanding" value="$25,684" />
          <StatCard label="Active Projects" value="24" accent />
        </div>

        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Revenue Overview</p>
            <div className="mt-4 flex h-24 items-end gap-2">
              {[40, 65, 45, 80, 55, 90, 70].map((height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t-md bg-primary/80"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
          <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Invoice Status</p>
            <div className="mt-4 flex items-center justify-center">
              <div className="relative h-20 w-20 rounded-full border-[10px] border-primary border-r-slate-200 border-b-slate-200" />
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">6,248 Invoices</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100">
          <div className="border-b border-slate-100 px-4 py-2.5">
            <p className="text-xs font-medium text-slate-500">Recent Invoices</p>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            <MockRow id="#INV-2041" name="Kitchen Remodel" amount="$4,280" status="Paid" />
            <MockRow id="#INV-2040" name="Roof Repair" amount="$1,950" status="Pending" />
            <MockRow id="#INV-2039" name="HVAC Install" amount="$8,400" status="Paid" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${accent ? "text-primary" : "text-slate-800"}`}>
        {value}
      </p>
    </div>
  );
}

function MockRow({
  id,
  name,
  amount,
  status,
}: {
  id: string;
  name: string;
  amount: string;
  status: string;
}) {
  const statusColor =
    status === "Paid"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700";

  return (
    <div className="grid grid-cols-4 gap-2 px-4 py-2.5 text-slate-600">
      <span className="font-medium text-slate-800">{id}</span>
      <span className="col-span-1 truncate">{name}</span>
      <span>{amount}</span>
      <span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}>
          {status}
        </span>
      </span>
    </div>
  );
}
