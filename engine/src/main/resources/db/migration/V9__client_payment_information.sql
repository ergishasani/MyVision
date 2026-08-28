-- Payment and tax information held per contact.

alter table clients
  -- The client's own bank details. Used for refunds and credit notes, where money goes back to
  -- them rather than to us.
  add column iban text,
  add column bic text,

  -- Two different identifiers, and conflating them is a compliance error:
  --   vat_number  = USt-IdNr., the EU VAT identification number (DE123456789). Required on the
  --                 invoice for reverse-charge and intra-EU supplies.
  --   tax_number  = Steuernummer, the domestic number issued by the local Finanzamt.
  -- vat_number already exists; this adds the domestic one alongside it.
  add column tax_number text,

  -- Whether to print the client's VAT ID on their documents. Not always wanted for private
  -- individuals, and required for reverse charge.
  add column show_vat_id boolean not null default false,

  -- Whether this contact is sent structured e-invoices (XRechnung) rather than a PDF.
  add column einvoice_standard boolean not null default false,

  -- Overrides the company default when this client has negotiated different terms. Null means
  -- "use the company setting", so changing the default still reaches everyone who has no override.
  add column payment_terms_days integer,
  add column terms text;
