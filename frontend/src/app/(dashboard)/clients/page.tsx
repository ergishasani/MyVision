"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { listClients } from "@/lib/api/dashboard";
import type { Client } from "@/types/api";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listClients()
      .then(setClients)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Failed to load clients");
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Clients</h1>
        <p className="mt-1 text-sm text-muted">
          Active clients for your company.
        </p>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardTitle className="text-red-700">Could not load clients</CardTitle>
          <CardDescription className="text-red-600">{error}</CardDescription>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {clients.length === 0 ? (
          <Card>
            <CardTitle>No clients yet</CardTitle>
            <CardDescription>
              Create clients through the API or add a create form here next.
            </CardDescription>
          </Card>
        ) : (
          clients.map((client) => (
            <Card key={client.id}>
              <CardTitle>{client.name}</CardTitle>
              <CardDescription>
                {[client.email, client.phone].filter(Boolean).join(" · ") ||
                  "No contact details"}
              </CardDescription>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
