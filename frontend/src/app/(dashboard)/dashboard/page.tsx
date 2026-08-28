"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { getSession } from "@/lib/auth/session";
import { formatMoney } from "@/lib/utils/cn";
import type { DashboardSummary } from "@/types/api";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description?: string;
}) {
  return (
    <Card>
      <CardDescription>{title}</CardDescription>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {description ? (
        <p className="mt-1 text-sm text-muted">{description}</p>
      ) : null}
    </Card>
  );
}

export default function DashboardPage() {
  const session = getSession();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : "Failed to load dashboard",
        );
      });
  }, []);

  const currency = session?.company.defaultCurrency ?? "EUR";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Overview for {session?.company.name}
        </p>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardTitle className="text-red-700">Could not load dashboard</CardTitle>
          <CardDescription className="text-red-600">{error}</CardDescription>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Invoiced this month"
          value={formatMoney(summary?.totalInvoicedThisMonth ?? 0, currency)}
        />
        <MetricCard
          title="Paid this month"
          value={formatMoney(summary?.paidAmountThisMonth ?? 0, currency)}
        />
        <MetricCard
          title="Outstanding"
          value={formatMoney(summary?.unpaidAmount ?? 0, currency)}
        />
        <MetricCard
          title="Overdue"
          value={formatMoney(summary?.overdueAmount ?? 0, currency)}
          description={
            summary
              ? `${summary.overdueInvoiceCount} overdue invoice(s)`
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Active projects</CardTitle>
          <p className="mt-3 text-3xl font-semibold">
            {summary?.activeProjectCount ?? "—"}
          </p>
        </Card>
        <Card>
          <CardTitle>Pending quotes</CardTitle>
          <p className="mt-3 text-3xl font-semibold">
            {summary?.pendingQuoteCount ?? "—"}
          </p>
        </Card>
      </div>
    </div>
  );
}
