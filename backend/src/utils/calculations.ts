import { DocumentData } from '../types/document';

// Calculate financial totals from document data

export interface FinancialTotals {
  subtotal: number;
  vatAmount: number;
  total: number;
  vatRate: number;
}

export const calculateDocumentTotals = (
  data: DocumentData,
  defaultVatRate: number = 0
): FinancialTotals => {
  let subtotal = 0;

  // Calculate from line items
  if (data.lineItems) {
    data.lineItems.forEach((item) => {
      subtotal += item.total || item.quantity * item.unitPrice;
    });
  }

  // Calculate from windows
  if (data.windows) {
    data.windows.forEach((window) => {
      subtotal += window.quantity * window.unitPrice;
    });
  }

  // Calculate from doors
  if (data.doors) {
    data.doors.forEach((door) => {
      subtotal += door.quantity * door.unitPrice;
    });
  }

  // Calculate from shutters
  if (data.shutters) {
    data.shutters.forEach((shutter) => {
      subtotal += shutter.quantity * shutter.unitPrice;
    });
  }

  // Determine VAT rate (use first line item's VAT rate or default)
  const vatRate =
    data.lineItems?.[0]?.vatRate ?? defaultVatRate;

  const vatAmount = (subtotal * vatRate) / 100;
  const total = subtotal + vatAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    vatRate,
  };
};
