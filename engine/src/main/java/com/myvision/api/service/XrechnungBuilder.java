package com.myvision.api.service;

import com.myvision.api.entity.Client;
import com.myvision.api.entity.Company;
import com.myvision.api.entity.Invoice;
import com.myvision.api.entity.InvoiceItem;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;

final class XrechnungBuilder {

  private XrechnungBuilder() {
  }

  /**
   * @param senderName the supplier name as printed on the PDF, so the XML names the same party.
   */
  static String build(
      Company company,
      Client client,
      Invoice invoice,
      List<InvoiceItem> items,
      String senderName
  ) {
    StringBuilder xml = new StringBuilder();
    xml.append("""
        <?xml version="1.0" encoding="UTF-8"?>
        <rsm:CrossIndustryInvoice
          xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
          xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
          xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
          <rsm:ExchangedDocumentContext>
            <ram:GuidelineSpecifiedDocumentContextParameter>
              <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID>
            </ram:GuidelineSpecifiedDocumentContextParameter>
          </rsm:ExchangedDocumentContext>
        """);
    xml.append("  <rsm:ExchangedDocument>\n");
    element(xml, "ram:ID", invoice.getInvoiceNumber(), 4);
    element(xml, "ram:TypeCode", "380", 4);
    element(xml, "ram:IssueDateTime", dateElement(invoice.getIssueDate().format(DateTimeFormatter.BASIC_ISO_DATE)), 4, false);
    xml.append("  </rsm:ExchangedDocument>\n");
    xml.append("  <rsm:SupplyChainTradeTransaction>\n");
    int lineId = 1;
    for (InvoiceItem item : items) {
      xml.append("    <ram:IncludedSupplyChainTradeLineItem>\n");
      xml.append("      <ram:AssociatedDocumentLineDocument>\n");
      element(xml, "ram:LineID", String.valueOf(lineId++), 8);
      xml.append("      </ram:AssociatedDocumentLineDocument>\n");
      xml.append("      <ram:SpecifiedTradeProduct>\n");
      element(xml, "ram:Name", item.getDescription(), 8);
      xml.append("      </ram:SpecifiedTradeProduct>\n");
      xml.append("      <ram:SpecifiedLineTradeAgreement>\n");
      amount(xml, "ram:NetPriceProductTradePrice", "ram:ChargeAmount", item.getUnitPrice(), invoice.getCurrency(), 8);
      xml.append("      </ram:SpecifiedLineTradeAgreement>\n");
      xml.append("      <ram:SpecifiedLineTradeDelivery>\n");
      xml.append("        <ram:BilledQuantity unitCode=\"").append(esc(unitCode(item.getUnit()))).append("\">")
          .append(amount(item.getQuantity())).append("</ram:BilledQuantity>\n");
      xml.append("      </ram:SpecifiedLineTradeDelivery>\n");
      xml.append("      <ram:SpecifiedLineTradeSettlement>\n");
      xml.append("        <ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>")
          .append(amount(item.getTaxRate())).append("</ram:RateApplicablePercent></ram:ApplicableTradeTax>\n");
      amount(xml, "ram:SpecifiedTradeSettlementLineMonetarySummation", "ram:LineTotalAmount",
          item.getLineTotal(), invoice.getCurrency(), 8);
      xml.append("      </ram:SpecifiedLineTradeSettlement>\n");
      xml.append("    </ram:IncludedSupplyChainTradeLineItem>\n");
    }
    xml.append("    <ram:ApplicableHeaderTradeAgreement>\n");
    party(xml, "ram:SellerTradeParty", senderName, company.getVatNumber(), company.getEmail(), company.getAddressLine1(),
        company.getPostalCode(), company.getCity(), company.getCountryCode(), 6);
    party(xml, "ram:BuyerTradeParty", client.getName(), client.getVatNumber(), client.getEmail(), client.getAddressLine1(),
        client.getPostalCode(), client.getCity(), client.getCountryCode(), 6);
    xml.append("    </ram:ApplicableHeaderTradeAgreement>\n");
    xml.append("    <ram:ApplicableHeaderTradeDelivery/>\n");
    xml.append("    <ram:ApplicableHeaderTradeSettlement>\n");
    element(xml, "ram:InvoiceCurrencyCode", invoice.getCurrency(), 6);
    if (company.getIban() != null && !company.getIban().isBlank()) {
      xml.append("      <ram:SpecifiedTradeSettlementPaymentMeans>\n");
      element(xml, "ram:TypeCode", "58", 8);
      xml.append("        <ram:PayeePartyCreditorFinancialAccount>\n");
      element(xml, "ram:IBANID", company.getIban(), 10);
      xml.append("        </ram:PayeePartyCreditorFinancialAccount>\n");
      xml.append("      </ram:SpecifiedTradeSettlementPaymentMeans>\n");
    }
    xml.append("      <ram:ApplicableTradeTax><ram:CalculatedAmount currencyID=\"").append(esc(invoice.getCurrency())).append("\">")
        .append(amount(invoice.getTaxAmount())).append("</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode><ram:BasisAmount currencyID=\"")
        .append(esc(invoice.getCurrency())).append("\">").append(amount(invoice.getSubtotalAmount().subtract(invoice.getDiscountAmount())))
        .append("</ram:BasisAmount><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>19</ram:RateApplicablePercent></ram:ApplicableTradeTax>\n");
    xml.append("      <ram:SpecifiedTradePaymentTerms>\n");
    if (invoice.getDueDate() != null) {
      element(xml, "ram:DueDateDateTime", dateElement(invoice.getDueDate().format(DateTimeFormatter.BASIC_ISO_DATE)), 8, false);
    }
    xml.append("      </ram:SpecifiedTradePaymentTerms>\n");
    xml.append("      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>\n");
    amount(xml, "ram:LineTotalAmount", invoice.getSubtotalAmount(), invoice.getCurrency(), 8);
    amount(xml, "ram:TaxBasisTotalAmount", invoice.getSubtotalAmount().subtract(invoice.getDiscountAmount()), invoice.getCurrency(), 8);
    amount(xml, "ram:TaxTotalAmount", invoice.getTaxAmount(), invoice.getCurrency(), 8);
    amount(xml, "ram:GrandTotalAmount", invoice.getTotalAmount(), invoice.getCurrency(), 8);
    amount(xml, "ram:DuePayableAmount", invoice.getBalanceDue(), invoice.getCurrency(), 8);
    xml.append("      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>\n");
    xml.append("    </ram:ApplicableHeaderTradeSettlement>\n");
    xml.append("  </rsm:SupplyChainTradeTransaction>\n");
    xml.append("</rsm:CrossIndustryInvoice>\n");
    return xml.toString();
  }

  private static void party(StringBuilder xml, String tag, String name, String vatNumber, String email,
      String address, String postalCode, String city, String countryCode, int indent) {
    spaces(xml, indent).append("<").append(tag).append(">\n");
    element(xml, "ram:Name", name, indent + 2);
    if (vatNumber != null && !vatNumber.isBlank()) {
      spaces(xml, indent + 2).append("<ram:SpecifiedTaxRegistration><ram:ID schemeID=\"VA\">")
          .append(esc(vatNumber)).append("</ram:ID></ram:SpecifiedTaxRegistration>\n");
    }
    if (email != null && !email.isBlank()) {
      spaces(xml, indent + 2).append("<ram:URIUniversalCommunication><ram:URIID schemeID=\"EM\">")
          .append(esc(email)).append("</ram:URIID></ram:URIUniversalCommunication>\n");
    }
    spaces(xml, indent + 2).append("<ram:PostalTradeAddress>\n");
    element(xml, "ram:PostcodeCode", postalCode, indent + 4);
    element(xml, "ram:LineOne", address, indent + 4);
    element(xml, "ram:CityName", city, indent + 4);
    element(xml, "ram:CountryID", countryCode, indent + 4);
    spaces(xml, indent + 2).append("</ram:PostalTradeAddress>\n");
    spaces(xml, indent).append("</").append(tag).append(">\n");
  }

  private static void amount(StringBuilder xml, String wrapper, String tag, BigDecimal value, String currency, int indent) {
    spaces(xml, indent).append("<").append(wrapper).append(">\n");
    amount(xml, tag, value, currency, indent + 2);
    spaces(xml, indent).append("</").append(wrapper).append(">\n");
  }

  private static void amount(StringBuilder xml, String tag, BigDecimal value, String currency, int indent) {
    spaces(xml, indent).append("<").append(tag).append(" currencyID=\"").append(esc(currency)).append("\">")
        .append(amount(value)).append("</").append(tag).append(">\n");
  }

  private static void element(StringBuilder xml, String tag, String value, int indent) {
    element(xml, tag, value, indent, true);
  }

  private static void element(StringBuilder xml, String tag, String value, int indent, boolean escape) {
    spaces(xml, indent).append("<").append(tag).append(">")
        .append(escape ? esc(value) : value)
        .append("</").append(tag).append(">\n");
  }

  private static String dateElement(String value) {
    return "<udt:DateTimeString format=\"102\">" + esc(value) + "</udt:DateTimeString>";
  }

  private static StringBuilder spaces(StringBuilder xml, int indent) {
    return xml.append(" ".repeat(indent));
  }

  private static String unitCode(String unit) {
    return "h".equalsIgnoreCase(unit) || "hour".equalsIgnoreCase(unit) ? "HUR" : "C62";
  }

  private static String amount(BigDecimal value) {
    return value == null ? "0.00" : value.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
  }

  private static String esc(String value) {
    return value == null ? "" : value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&apos;");
  }
}
