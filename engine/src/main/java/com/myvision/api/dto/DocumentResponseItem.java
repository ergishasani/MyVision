package com.myvision.api.dto;

import com.myvision.api.entity.Document;
import java.time.OffsetDateTime;
import java.util.UUID;

/** A stored document (invoice PDF, XRechnung XML) as listed on the documents screens. */
public record DocumentResponseItem(
    UUID id,
    UUID invoiceId,
    UUID quoteId,
    String fileName,
    String fileUrl,
    String mimeType,
    OffsetDateTime createdAt
) {

  public static DocumentResponseItem from(Document document) {
    return new DocumentResponseItem(
        document.getId(),
        document.getInvoiceId(),
        document.getQuoteId(),
        document.getFileName(),
        document.getFileUrl(),
        document.getMimeType(),
        document.getCreatedAt()
    );
  }
}
