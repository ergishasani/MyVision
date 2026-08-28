import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function SectionPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>

      <Card>
        <CardTitle>Coming next</CardTitle>
        <CardDescription>
          This section is wired into the app shell. API client helpers live in{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">src/lib/api</code>.
        </CardDescription>
      </Card>
    </div>
  );
}
