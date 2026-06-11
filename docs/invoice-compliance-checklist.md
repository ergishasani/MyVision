# Invoice Compliance Checklist

This is an engineering checklist, not legal or tax advice.

## Germany-First Invoice Fields

- Supplier legal name and address.
- Supplier tax number or VAT ID when applicable.
- Customer legal name and address.
- Invoice number with a unique, sequential numbering process.
- Invoice issue date.
- Delivery or service date/period.
- Line descriptions, quantities, units, and net prices.
- VAT rate per line.
- Net amount, VAT amount, gross total.
- Payment terms and bank details.
- Reverse charge note when applicable.
- Small-business note when applicable.

## VAT Rules To Review

- Domestic German standard/reduced VAT rates.
- Reverse charge for applicable B2B cross-border services.
- EU VAT ID validation workflow.
- Kleinunternehmerregelung handling, if you support small businesses using that status.
- Discount handling before VAT calculation.
- Credit notes and cancellation invoices.
- Country-specific rules before expanding outside Germany.

## Product Decision

MyVision should block production e-invoice sending until:

- A qualified German tax/compliance expert reviews invoice wording and VAT behavior.
- XRechnung exports pass a validator.
- ZUGFeRD/PDF-A-3 exports pass a validator after implementation.
