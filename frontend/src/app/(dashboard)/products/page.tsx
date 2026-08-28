import { PageShell } from "@/components/layout/page-shell";

export default function ProductsPage() {
  return (
    <PageShell
      title="Products"
      description="Reusable line items with a price, used on quotes and invoices."
      tabs={["All", "Services", "Materials"]}
      columns={[
        { key: "name", label: "Name" },
        { key: "unit", label: "Unit" },
        { key: "price", label: "Unit price", numeric: true },
        { key: "tax", label: "VAT rate", numeric: true },
      ]}
      emptyTitle="No products yet"
      emptyHint="A product catalogue would let you add a priced line to a quote without retyping it. Not in the API yet."
    />
  );
}
