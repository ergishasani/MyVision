package com.myvision.api.service;

import com.myvision.api.dto.DocumentResponse;
import com.myvision.api.dto.StorageObject;
import com.myvision.api.entity.Client;
import com.myvision.api.entity.Company;
import com.myvision.api.entity.Invoice;
import com.myvision.api.entity.InvoiceItem;
import com.myvision.api.exception.ResourceNotFoundException;
import com.myvision.api.repository.ClientRepository;
import com.myvision.api.repository.CompanyRepository;
import com.myvision.api.repository.InvoiceItemRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
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
  private final ClientRepository clientRepository;
  private final InvoiceItemRepository invoiceItemRepository;
  private final FileStorageService fileStorageService;
  private final AuditLogService auditLogService;

  public InvoiceDocumentService(
      InvoiceService invoiceService,
      CompanyAccessService companyAccessService,
      CompanyRepository companyRepository,
      ClientRepository clientRepository,
      InvoiceItemRepository invoiceItemRepository,
      FileStorageService fileStorageService,
      AuditLogService auditLogService
  ) {
    this.invoiceService = invoiceService;
    this.companyAccessService = companyAccessService;
    this.companyRepository = companyRepository;
    this.clientRepository = clientRepository;
    this.invoiceItemRepository = invoiceItemRepository;
    this.fileStorageService = fileStorageService;
    this.auditLogService = auditLogService;
  }

  @Transactional(readOnly = true)
  public byte[] pdf(UUID userId, UUID invoiceId) {
    InvoiceBundle bundle = bundle(userId, invoiceId);
    return simplePdf(linesForPdf(bundle));
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
    auditLogService.record(companyId, userId, "invoice", invoiceId, "pdf_generated",
        "{\"path\":\"%s\"}".formatted(stored.path()));
    return new DocumentResponse(fileName, PDF_CONTENT_TYPE, stored.sizeBytes(), stored.path(), stored.publicUrl());
  }

  @Transactional(readOnly = true)
  public byte[] xrechnungXml(UUID userId, UUID invoiceId) {
    InvoiceBundle bundle = bundle(userId, invoiceId);
    String xml = XrechnungBuilder.build(bundle.company(), bundle.client(), bundle.invoice(), bundle.items());
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
    auditLogService.record(companyId, userId, "invoice", invoiceId, "xrechnung_exported",
        "{\"path\":\"%s\",\"requiresValidation\":true}".formatted(stored.path()));
    return new DocumentResponse(fileName, XML_CONTENT_TYPE, stored.sizeBytes(), stored.path(), stored.publicUrl());
  }

  public byte[] zugferdPdf(UUID userId, UUID invoiceId) {
    throw new UnsupportedOperationException(
        "ZUGFeRD export requires PDF/A-3 embedding and validator certification before production use");
  }

  private InvoiceBundle bundle(UUID userId, UUID invoiceId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Invoice invoice = invoiceService.requireInvoice(invoiceId, companyId);
    Company company = companyRepository.findById(companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Company not found"));
    Client client = clientRepository.findByIdAndCompanyId(invoice.getClientId(), companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
    List<InvoiceItem> items = invoiceItemRepository.findByInvoiceIdOrderByPositionAsc(invoice.getId());
    return new InvoiceBundle(company, client, invoice, items);
  }

  private List<String> linesForPdf(InvoiceBundle bundle) {
    Company company = bundle.company();
    Client client = bundle.client();
    Invoice invoice = bundle.invoice();
    List<String> lines = new ArrayList<>();
    lines.add("INVOICE " + invoice.getInvoiceNumber());
    lines.add(companyName(company));
    lines.add(address(company.getAddressLine1(), company.getPostalCode(), company.getCity(), company.getCountryCode()));
    lines.add("Email: " + safe(company.getEmail()));
    lines.add("VAT ID: " + safe(company.getVatNumber()));
    lines.add("");
    lines.add("Bill to: " + client.getName());
    lines.add(address(client.getAddressLine1(), client.getPostalCode(), client.getCity(), client.getCountryCode()));
    lines.add("Client VAT ID: " + safe(client.getVatNumber()));
    lines.add("");
    lines.add("Issue date: " + invoice.getIssueDate().format(DateTimeFormatter.ISO_DATE));
    lines.add("Due date: " + (invoice.getDueDate() == null ? "" : invoice.getDueDate().format(DateTimeFormatter.ISO_DATE)));
    lines.add("Currency: " + invoice.getCurrency());
    lines.add("");
    lines.add("Items");
    for (InvoiceItem item : bundle.items()) {
      lines.add("%s x %s %s @ %s = %s, VAT %s%%".formatted(
          moneyless(item.getQuantity()),
          item.getUnit(),
          item.getDescription(),
          money(item.getUnitPrice(), invoice.getCurrency()),
          money(item.getLineTotal(), invoice.getCurrency()),
          moneyless(item.getTaxRate())));
    }
    lines.add("");
    lines.add("Subtotal: " + money(invoice.getSubtotalAmount(), invoice.getCurrency()));
    lines.add("Discount: " + money(invoice.getDiscountAmount(), invoice.getCurrency()));
    lines.add("VAT: " + money(invoice.getTaxAmount(), invoice.getCurrency()));
    lines.add("Total: " + money(invoice.getTotalAmount(), invoice.getCurrency()));
    lines.add("Balance due: " + money(invoice.getBalanceDue(), invoice.getCurrency()));
    lines.add("");
    lines.add("Payment: " + safe(company.getBankName()) + " " + safe(company.getIban()) + " " + safe(company.getBic()));
    if (invoice.getNotes() != null && !invoice.getNotes().isBlank()) {
      lines.add("Notes: " + invoice.getNotes());
    }
    if (invoice.getTerms() != null && !invoice.getTerms().isBlank()) {
      lines.add("Terms: " + invoice.getTerms());
    }
    return lines;
  }

  private byte[] simplePdf(List<String> lines) {
    StringBuilder stream = new StringBuilder();
    stream.append("BT\n/F1 18 Tf\n50 790 Td\n");
    for (int i = 0; i < lines.size(); i++) {
      if (i == 1) {
        stream.append("/F1 11 Tf\n");
      }
      stream.append("(").append(escapePdf(lines.get(i))).append(") Tj\n0 -16 Td\n");
    }
    stream.append("ET\n");

    byte[] streamBytes = stream.toString().getBytes(StandardCharsets.US_ASCII);
    List<String> objects = List.of(
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        "<< /Length " + streamBytes.length + " >>\nstream\n" + stream + "endstream"
    );

    StringBuilder pdf = new StringBuilder("%PDF-1.4\n");
    List<Integer> offsets = new ArrayList<>();
    for (int i = 0; i < objects.size(); i++) {
      offsets.add(pdf.length());
      pdf.append(i + 1).append(" 0 obj\n").append(objects.get(i)).append("\nendobj\n");
    }
    int xrefOffset = pdf.length();
    pdf.append("xref\n0 ").append(objects.size() + 1).append("\n0000000000 65535 f \n");
    for (Integer offset : offsets) {
      pdf.append("%010d 00000 n \n".formatted(offset));
    }
    pdf.append("trailer\n<< /Size ").append(objects.size() + 1).append(" /Root 1 0 R >>\n");
    pdf.append("startxref\n").append(xrefOffset).append("\n%%EOF\n");
    return pdf.toString().getBytes(StandardCharsets.US_ASCII);
  }

  private String escapePdf(String value) {
    return safe(value).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
  }

  private String companyName(Company company) {
    return company.getLegalName() != null && !company.getLegalName().isBlank()
        ? company.getLegalName()
        : company.getName();
  }

  private String address(String line1, String postalCode, String city, String countryCode) {
    return "%s, %s %s, %s".formatted(safe(line1), safe(postalCode), safe(city), safe(countryCode));
  }

  private String money(BigDecimal value, String currency) {
    return "%s %s".formatted(moneyless(value), currency);
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
      List<InvoiceItem> items
  ) {
  }
}
