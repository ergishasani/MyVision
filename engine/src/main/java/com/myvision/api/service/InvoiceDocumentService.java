package com.myvision.api.service;

import com.myvision.api.dto.DocumentResponse;
import com.myvision.api.dto.StorageObject;
import com.myvision.api.entity.Client;
import com.myvision.api.entity.Document;
import com.myvision.api.entity.Company;
import com.myvision.api.entity.CompanyMember;
import com.myvision.api.entity.CompanyMemberRole;
import com.myvision.api.entity.Invoice;
import com.myvision.api.entity.InvoiceItem;
import com.myvision.api.entity.InvoiceTaxScheme;
import com.myvision.api.exception.ResourceNotFoundException;
import com.myvision.api.repository.ClientRepository;
import com.myvision.api.repository.CompanyMemberRepository;
import com.myvision.api.repository.CompanyRepository;
import com.myvision.api.repository.DocumentRepository;
import com.myvision.api.repository.InvoiceItemRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvoiceDocumentService {

  private static final String PDF_CONTENT_TYPE = "application/pdf";
  private static final String XML_CONTENT_TYPE = "application/xml";

  private final InvoiceService invoiceService;
  private final CompanyAccessService companyAccessService;
  private final CompanyRepository companyRepository;
  private final CompanyMemberRepository companyMemberRepository;
  private final ClientRepository clientRepository;
  private final InvoiceItemRepository invoiceItemRepository;
  private final FileStorageService fileStorageService;
  private final DocumentRepository documentRepository;
  private final AuditLogService auditLogService;

  public InvoiceDocumentService(
      InvoiceService invoiceService,
      CompanyAccessService companyAccessService,
      CompanyRepository companyRepository,
      CompanyMemberRepository companyMemberRepository,
      ClientRepository clientRepository,
      InvoiceItemRepository invoiceItemRepository,
      FileStorageService fileStorageService,
      DocumentRepository documentRepository,
      AuditLogService auditLogService
  ) {
    this.invoiceService = invoiceService;
    this.companyAccessService = companyAccessService;
    this.companyRepository = companyRepository;
    this.companyMemberRepository = companyMemberRepository;
    this.clientRepository = clientRepository;
    this.invoiceItemRepository = invoiceItemRepository;
    this.fileStorageService = fileStorageService;
    this.documentRepository = documentRepository;
    this.auditLogService = auditLogService;
  }

  @Transactional(readOnly = true)
  public byte[] pdf(UUID userId, UUID invoiceId) {
    InvoiceBundle bundle = bundle(userId, invoiceId);
    return renderInvoice(bundle);
  }

  @Transactional
  public DocumentResponse storePdf(UUID userId, UUID invoiceId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Invoice invoice = invoiceService.requireInvoice(invoiceId, companyId);
    byte[] pdf = pdf(userId, invoiceId);
    String fileName = invoice.getInvoiceNumber() + ".pdf";
    StorageObject stored = fileStorageService.put(
        "companies/%s/invoices/%s/%s".formatted(companyId, invoiceId, fileName),
        PDF_CONTENT_TYPE,
        pdf);
    recordDocument(companyId, invoiceId, fileName, PDF_CONTENT_TYPE, stored);
    auditLogService.record(companyId, userId, "invoice", invoiceId, "pdf_generated",
        "{\"path\":\"%s\"}".formatted(stored.path()));
    return new DocumentResponse(fileName, PDF_CONTENT_TYPE, stored.sizeBytes(), stored.path(), stored.publicUrl());
  }

  @Transactional(readOnly = true)
  public byte[] xrechnungXml(UUID userId, UUID invoiceId) {
    InvoiceBundle bundle = bundle(userId, invoiceId);
    String xml = XrechnungBuilder.build(
        bundle.company(), bundle.client(), bundle.invoice(), bundle.items(), bundle.senderName());
    return xml.getBytes(StandardCharsets.UTF_8);
  }

  @Transactional
  public DocumentResponse storeXrechnungXml(UUID userId, UUID invoiceId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Invoice invoice = invoiceService.requireInvoice(invoiceId, companyId);
    byte[] xml = xrechnungXml(userId, invoiceId);
    String fileName = invoice.getInvoiceNumber() + "-xrechnung.xml";
    StorageObject stored = fileStorageService.put(
        "companies/%s/invoices/%s/%s".formatted(companyId, invoiceId, fileName),
        XML_CONTENT_TYPE,
        xml);
    recordDocument(companyId, invoiceId, fileName, XML_CONTENT_TYPE, stored);
    auditLogService.record(companyId, userId, "invoice", invoiceId, "xrechnung_exported",
        "{\"path\":\"%s\",\"requiresValidation\":true}".formatted(stored.path()));
    return new DocumentResponse(fileName, XML_CONTENT_TYPE, stored.sizeBytes(), stored.path(), stored.publicUrl());
  }

  public byte[] zugferdPdf(UUID userId, UUID invoiceId) {
    throw new UnsupportedOperationException(
        "ZUGFeRD export requires PDF/A-3 embedding and validator certification before production use");
  }

  /**
   * Records the stored artifact in the documents table so it can be listed later.
   *
   * <p>Regenerating the same file updates the existing row instead of adding another, so a user
   * clicking "download PDF" repeatedly does not grow the table without bound.
   */
  private void recordDocument(
      UUID companyId,
      UUID invoiceId,
      String fileName,
      String mimeType,
      StorageObject stored
  ) {
    Document document = documentRepository
        .findByCompanyIdAndInvoiceIdAndFileName(companyId, invoiceId, fileName)
        .orElseGet(Document::new);
    document.setCompanyId(companyId);
    document.setInvoiceId(invoiceId);
    document.setFileName(fileName);
    document.setFileUrl(stored.publicUrl() != null ? stored.publicUrl() : stored.path());
    document.setMimeType(mimeType);
    documentRepository.save(document);
  }

  private InvoiceBundle bundle(UUID userId, UUID invoiceId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Invoice invoice = invoiceService.requireInvoice(invoiceId, companyId);
    Company company = companyRepository.findById(companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Company not found"));
    Client client = clientRepository.findByIdAndCompanyId(invoice.getClientId(), companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
    List<InvoiceItem> items = invoiceItemRepository.findByInvoiceIdOrderByPositionAsc(invoice.getId());
    return new InvoiceBundle(company, client, invoice, items, senderName(company, invoice));
  }

  /**
   * The name the document is issued under.
   *
   * <p>An invoice raised with the company name off is issued by the person behind the business, so
   * the owner's own name takes the supplier position. The name is never simply dropped: the
   * supplier's full name is a required field, so a company with no owner on file (which should not
   * happen — registration always creates one) falls back to the company name rather than printing
   * a document with nobody on it.
   */
  private String senderName(Company company, Invoice invoice) {
    if (invoice.isShowCompanyName()) {
      return companyName(company);
    }
    return companyMemberRepository
        .findFirstByCompany_IdAndRoleOrderByCreatedAtAsc(company.getId(), CompanyMemberRole.owner)
        .map(CompanyMember::getUser)
        .map(user -> user.getFullName())
        .filter(name -> name != null && !name.isBlank())
        .orElseGet(() -> companyName(company));
  }

  /**
   * The invoice, laid out as a page.
   *
   * <p>Mirrors what the app shows on screen, because a customer receiving something that looks
   * nothing like the preview the operator approved is a support call waiting to happen. The
   * coordinate system runs from the bottom-left, so the cursor counts downwards.
   *
   * <p>Everything Sec. 14 UStG asks for is here: both parties named and addressed, the invoice
   * number and date, the date of supply, per-line net and VAT rate, and the totals split into net,
   * tax and gross. The delivery date in particular was absent from the previous generator.
   */
  private byte[] renderInvoice(InvoiceBundle bundle) {
    Company company = bundle.company();
    Client client = bundle.client();
    Invoice invoice = bundle.invoice();
    String currency = invoice.getCurrency();
    boolean german = "de".equalsIgnoreCase(invoice.getLanguage());

    PdfCanvas page = new PdfCanvas();
    final float left = 56f;
    final float right = PdfCanvas.PAGE_WIDTH - 56f;
    float y = PdfCanvas.PAGE_HEIGHT - 60f;

    // Letterhead.
    String senderName = bundle.senderName();
    page.textRight(right, y, senderName, 14f, true, 0.1f);
    y -= 46f;

    // The sender line above the address block, as a window envelope expects.
    String senderAddress =
        address(company.getAddressLine1(), company.getPostalCode(), company.getCity(), null);
    String senderLine = senderAddress.isBlank()
        ? senderName
        : senderName + " - " + senderAddress;
    page.text(left, y, senderLine, 7.5f, false, 0.55f);
    page.rule(left, left + 250f, y - 3f, 0.5f, 0.8f);
    y -= 18f;

    // Recipient, from the invoice's own snapshot where it has one.
    float addressTop = y;
    page.text(left, y, firstNonBlank(invoice.getRecipientName(), client.getName()), 10f, true, 0.1f);
    y -= 13f;
    for (String line : recipientLines(invoice, client)) {
      page.text(left, y, line, 10f, false, 0.2f);
      y -= 13f;
    }

    // Meta column, right-aligned against the same top as the address.
    float metaY = addressTop;
    float metaLabel = right - 150f;
    for (String[] row : metaRows(invoice, client, german)) {
      page.text(metaLabel, metaY, row[0], 8f, false, 0.5f);
      page.textRight(right, metaY, row[1], 8f, true, 0.15f);
      metaY -= 12f;
    }

    y = Math.min(y, metaY) - 26f;

    // Subject.
    String subject = invoice.getSubject() != null && !invoice.getSubject().isBlank()
        ? invoice.getSubject()
        : (german ? "Rechnung Nr. " : "Invoice no. ") + invoice.getInvoiceNumber();
    page.text(left, y, subject, 13f, true, 0.05f);
    y -= 22f;

    if (invoice.getNotes() != null && !invoice.getNotes().isBlank()) {
      y = page.paragraph(left, y, right - left, invoice.getNotes(), 9.5f, 13f, 0.2f) - 8f;
    }

    // Items.
    float colQty = right - 210f;
    float colUnit = right - 110f;
    float colTotal = right;

    page.rule(left, right, y + 12f, 0.8f, 0.45f);
    page.text(left, y, german ? "Beschreibung" : "Description", 8.5f, true, 0.2f);
    page.textRight(colQty, y, german ? "Menge" : "Qty", 8.5f, true, 0.2f);
    page.textRight(colUnit, y, german ? "Einzelpreis" : "Unit price", 8.5f, true, 0.2f);
    page.textRight(colTotal, y, german ? "Gesamtpreis" : "Total", 8.5f, true, 0.2f);
    y -= 6f;
    page.rule(left, right, y, 0.8f, 0.45f);
    y -= 15f;

    int position = 1;
    for (InvoiceItem item : bundle.items()) {
      page.text(left, y, position++ + ".", 9f, false, 0.45f);
      // Wrapped, so a long description does not run under the numbers to its right.
      float after = page.paragraph(left + 16f, y, colQty - left - 70f,
          item.getDescription(), 9f, 12f, 0.1f);
      page.textRight(colQty, y, quantity(item.getQuantity(), german)
          + (item.getUnit() == null ? "" : " " + item.getUnit()), 9f, false, 0.25f);
      page.textRight(colUnit, y, money(item.getUnitPrice(), currency, german), 9f, false, 0.25f);
      page.textRight(colTotal, y, money(item.getLineTotal(), currency, german), 9f, false, 0.1f);
      y = Math.min(y - 16f, after - 4f);
      page.rule(left, right, y + 9f, 0.4f, 0.88f);
    }

    // Totals.
    y -= 8f;
    float totalsLabel = right - 150f;
    page.textRight(totalsLabel, y, german ? "Gesamtbetrag netto" : "Total net", 9f, false, 0.4f);
    page.textRight(colTotal, y,
        money(invoice.getSubtotalAmount().subtract(invoice.getDiscountAmount()), currency, german),
        9f, false, 0.15f);
    y -= 14f;

    if (invoice.getDiscountAmount() != null
        && invoice.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
      page.textRight(totalsLabel, y, german ? "Rabatt" : "Discount", 9f, false, 0.4f);
      page.textRight(colTotal, y, "- " + money(invoice.getDiscountAmount(), currency, german),
          9f, false, 0.15f);
      y -= 14f;
    }

    page.textRight(totalsLabel, y, german ? "Umsatzsteuer" : "VAT", 9f, false, 0.4f);
    page.textRight(colTotal, y, money(invoice.getTaxAmount(), currency, german), 9f, false, 0.15f);
    y -= 8f;
    page.rule(totalsLabel - 40f, right, y, 0.8f, 0.45f);
    y -= 14f;
    page.textRight(totalsLabel, y, german ? "Gesamtbetrag brutto" : "Total gross", 10f, true, 0.05f);
    page.textRight(colTotal, y, money(invoice.getTotalAmount(), currency, german), 10f, true, 0.05f);
    y -= 26f;

    // The statutory note, when the treatment obliges one.
    String note = taxNote(invoice.getTaxScheme(), german);
    if (note != null) {
      page.box(left, y - 6f, right - left, 22f, 0.95f);
      page.text(left + 8f, y + 2f, note, 8.5f, false, 0.25f);
      y -= 30f;
    }

    if (invoice.getTerms() != null && !invoice.getTerms().isBlank()) {
      String terms = invoice.getTerms()
          .replace("[%ZAHLUNGSZIEL%]", invoice.getDueDate() == null ? "" : formatDate(invoice.getDueDate()))
          .replace("[%PAYMENT_DUE%]", invoice.getDueDate() == null ? "" : formatDate(invoice.getDueDate()));
      y = page.paragraph(left, y, right - left, terms, 9f, 12f, 0.25f);
    }

    // Footer: who to pay, and the identifiers a German invoice has to carry.
    float footer = 74f;
    page.rule(left, right, footer + 26f, 0.5f, 0.85f);
    page.text(left, footer + 12f, senderName, 7.5f, true, 0.35f);
    page.text(left, footer, address(company.getAddressLine1(), company.getPostalCode(),
        company.getCity(), company.getCountryCode()), 7.5f, false, 0.45f);

    float mid = left + 190f;
    page.text(mid, footer + 12f, taxLine(company), 7.5f, false, 0.45f);
    page.text(mid, footer, safe(company.getEmail()), 7.5f, false, 0.45f);

    float bank = left + 360f;
    page.text(bank, footer + 12f, safe(company.getBankName()), 7.5f, false, 0.45f);
    page.text(bank, footer, "IBAN " + safe(company.getIban()), 7.5f, false, 0.45f);

    return page.build();
  }

  /** The address block under the recipient's name. */
  private List<String> recipientLines(Invoice invoice, Client client) {
    String line1 = firstNonBlank(invoice.getRecipientAddressLine1(), client.getAddressLine1());
    String line2 = invoice.getRecipientAddressLine2();
    String postal = firstNonBlank(invoice.getRecipientPostalCode(), client.getPostalCode());
    String city = firstNonBlank(invoice.getRecipientCity(), client.getCity());
    String country = firstNonBlank(invoice.getRecipientCountryCode(), client.getCountryCode());

    List<String> lines = new ArrayList<>();
    if (line1 != null && !line1.isBlank()) {
      lines.add(line1);
    }
    if (line2 != null && !line2.isBlank()) {
      lines.add(line2);
    }
    String town = ((postal == null ? "" : postal) + " " + (city == null ? "" : city)).trim();
    if (!town.isBlank()) {
      lines.add(town);
    }
    // Domestic addresses conventionally omit the country; a foreign one must name it.
    if (country != null && !country.isBlank() && !"DE".equalsIgnoreCase(country)) {
      lines.add(country);
    }
    return lines;
  }

  /** The label/value pairs in the top-right block. */
  private List<String[]> metaRows(Invoice invoice, Client client, boolean german) {
    List<String[]> rows = new ArrayList<>();
    rows.add(new String[] {german ? "Rechnungs-Nr." : "Invoice no.", invoice.getInvoiceNumber()});
    rows.add(new String[] {german ? "Rechnungsdatum" : "Invoice date",
        formatDate(invoice.getIssueDate())});

    // Sec. 14 UStG wants the date of supply, or the period. Absent from the old generator.
    if (invoice.getServicePeriodStart() != null && invoice.getServicePeriodEnd() != null) {
      rows.add(new String[] {german ? "Leistungszeitraum" : "Service period",
          formatDate(invoice.getServicePeriodStart()) + " - "
              + formatDate(invoice.getServicePeriodEnd())});
    } else if (invoice.getDeliveryDate() != null) {
      rows.add(new String[] {german ? "Lieferdatum" : "Delivery date",
          formatDate(invoice.getDeliveryDate())});
    }

    if (invoice.getDueDate() != null) {
      rows.add(new String[] {german ? "Zahlungsziel" : "Payment due",
          formatDate(invoice.getDueDate())});
    }
    if (client.getCustomerNumber() != null) {
      rows.add(new String[] {german ? "Kundennummer" : "Customer no.",
          String.valueOf(client.getCustomerNumber())});
    }
    if (invoice.getReference() != null && !invoice.getReference().isBlank()) {
      rows.add(new String[] {german ? "Referenz" : "Reference", invoice.getReference()});
    }
    return rows;
  }

  /** The note the tax treatment obliges the document to print. */
  private String taxNote(InvoiceTaxScheme scheme, boolean german) {
    if (scheme == null) {
      return null;
    }
    return switch (scheme) {
      case domestic_exempt -> german
          ? "Steuerfreie Leistung nach \u00a7 4 UStG."
          : "Exempt from VAT under \u00a7 4 UStG.";
      case reverse_charge_13b -> german
          ? "Steuerschuldnerschaft des Leistungsempf\u00e4ngers (\u00a7 13b UStG)."
          : "Reverse charge - the recipient is liable for the VAT (\u00a7 13b UStG).";
      case eu_b2b -> german
          ? "Steuerfreie innergemeinschaftliche Lieferung (\u00a7 4 Nr. 1b i.V.m. \u00a7 6a UStG)."
          : "Zero-rated intra-community supply (\u00a7 4 Nr. 1b with \u00a7 6a UStG).";
      case export_non_eu -> german
          ? "Steuerfreie Ausfuhrlieferung (\u00a7 4 Nr. 1a i.V.m. \u00a7 6 UStG)."
          : "Zero-rated export (\u00a7 4 Nr. 1a with \u00a7 6 UStG).";
      default -> null;
    };
  }

  private String taxLine(Company company) {
    if (company.getVatNumber() != null && !company.getVatNumber().isBlank()) {
      return "USt-IdNr. " + company.getVatNumber();
    }
    return "";
  }

  private static String formatDate(java.time.LocalDate date) {
    return date == null ? "" : date.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
  }

  private static String firstNonBlank(String preferred, String fallback) {
    if (preferred != null && !preferred.isBlank()) {
      return preferred;
    }
    return fallback;
  }


  private String companyName(Company company) {
    return company.getLegalName() != null && !company.getLegalName().isBlank()
        ? company.getLegalName()
        : company.getName();
  }

  /**
   * A one-line address, skipping the parts that are missing.
   *
   * <p>Joining unconditionally produced ", ," for a company with no address on file, which then
   * printed on the document as if the address were the word "comma".
   */
  private String address(String line1, String postalCode, String city, String countryCode) {
    List<String> parts = new ArrayList<>();
    if (line1 != null && !line1.isBlank()) {
      parts.add(line1.trim());
    }
    String town = ((postalCode == null ? "" : postalCode) + " "
        + (city == null ? "" : city)).trim();
    if (!town.isBlank()) {
      parts.add(town);
    }
    if (countryCode != null && !countryCode.isBlank()) {
      parts.add(countryCode.trim());
    }
    return String.join(", ", parts);
  }

  private String money(BigDecimal value, String currency) {
    return "%s %s".formatted(moneyless(value), currency);
  }

  /**
   * An amount as the document's reader expects to see it.
   *
   * <p>Always two decimals and grouped thousands: "1250 EUR" on an invoice reads as an error, and
   * a German document separates with a full stop and a comma the other way round from an English
   * one. The previous formatter stripped trailing zeros, so a round figure lost its cents.
   */
  private String money(BigDecimal value, String currency, boolean german) {
    NumberFormat format = NumberFormat.getNumberInstance(german ? Locale.GERMANY : Locale.UK);
    format.setMinimumFractionDigits(2);
    format.setMaximumFractionDigits(2);
    return format.format(value == null ? BigDecimal.ZERO : value) + " " + currency;
  }

  /** A quantity keeps only the decimals it actually has: 3, not 3.000. */
  private String quantity(BigDecimal value, boolean german) {
    NumberFormat format = NumberFormat.getNumberInstance(german ? Locale.GERMANY : Locale.UK);
    format.setMaximumFractionDigits(3);
    return format.format(value == null ? BigDecimal.ZERO : value);
  }

  private String moneyless(BigDecimal value) {
    return value == null ? "0.00" : value.stripTrailingZeros().toPlainString();
  }

  private String safe(String value) {
    return value == null ? "" : value;
  }

  private record InvoiceBundle(
      Company company,
      Client client,
      Invoice invoice,
      List<InvoiceItem> items,
      /** Who the document says it is from — the company, or the owner. */
      String senderName
  ) {
  }
}
