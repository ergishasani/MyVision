# E-Invoice Validation

## XRechnung

The backend exports XRechnung-style XML at:

```txt
GET /api/invoices/{id}/xrechnung
POST /api/invoices/{id}/xrechnung
```

Before production use, validate exported XML with a KoSIT-compatible validator and keep validator output with the release artifact.

Validation acceptance criteria:

- XML is well-formed.
- EN 16931 business rules pass.
- XRechnung CIUS rules pass.
- Supplier and buyer electronic address rules are satisfied for the chosen delivery channel.
- Real examples from at least three invoice shapes pass: standard VAT, discount, and reverse-charge/no-VAT.

## Current Status

The repository does not include a bundled KoSIT validator runtime. To complete certification, install the validator in CI/staging, run it against exported XML, and commit only the validation report, not bulky validator binaries.

## ZUGFeRD

The backend exposes:

```txt
GET /api/invoices/{id}/zugferd
```

It currently returns `501 NOT_IMPLEMENTED` by design. Real ZUGFeRD requires:

- PDF/A-3 generation.
- Embedded XML invoice attachment.
- Correct ZUGFeRD/Factur-X metadata.
- Validator pass for the selected profile, usually EN 16931 or XRechnung.

Do not replace the current 501 response with generated output until those requirements are implemented and validated.
