import { calculateDocumentTotals } from '../../utils/calculations';
import { DocumentData } from '../../types/document';

describe('Document Calculations', () => {
  it('should calculate totals from line items', () => {
    const data: DocumentData = {
      title: 'Test Invoice',
      issueDate: '2024-01-01',
      lineItems: [
        {
          id: '1',
          description: 'Item 1',
          quantity: 2,
          unitPrice: 100,
          total: 200,
          vatRate: 20,
        },
        {
          id: '2',
          description: 'Item 2',
          quantity: 1,
          unitPrice: 50,
          total: 50,
          vatRate: 20,
        },
      ],
    };

    const totals = calculateDocumentTotals(data, 20);

    expect(totals.subtotal).toBe(250);
    expect(totals.vatRate).toBe(20);
    expect(totals.vatAmount).toBe(50);
    expect(totals.total).toBe(300);
  });

  it('should calculate totals from windows', () => {
    const data: DocumentData = {
      title: 'Test Invoice',
      issueDate: '2024-01-01',
      lineItems: [],
      windows: [
        {
          id: '1',
          type: 'double',
          width: 1000,
          height: 1200,
          frameMaterial: 'aluminum',
          glassType: 'double',
          quantity: 2,
          unitPrice: 500,
        },
      ],
    };

    const totals = calculateDocumentTotals(data, 0);

    expect(totals.subtotal).toBe(1000);
    expect(totals.vatAmount).toBe(0);
    expect(totals.total).toBe(1000);
  });

  it('should calculate totals from multiple sources', () => {
    const data: DocumentData = {
      title: 'Test Invoice',
      issueDate: '2024-01-01',
      lineItems: [
        {
          id: '1',
          description: 'Item 1',
          quantity: 1,
          unitPrice: 100,
          total: 100,
        },
      ],
      windows: [
        {
          id: '1',
          type: 'double',
          width: 1000,
          height: 1200,
          frameMaterial: 'aluminum',
          glassType: 'double',
          quantity: 1,
          unitPrice: 200,
        },
      ],
      doors: [
        {
          id: '1',
          type: 'entrance',
          width: 900,
          height: 2100,
          frameMaterial: 'aluminum',
          doorMaterial: 'composite',
          openingDirection: 'left',
          hasGlass: false,
          quantity: 1,
          unitPrice: 300,
        },
      ],
    };

    const totals = calculateDocumentTotals(data, 10);

    expect(totals.subtotal).toBe(600);
    expect(totals.vatRate).toBe(10);
    expect(totals.vatAmount).toBe(60);
    expect(totals.total).toBe(660);
  });

  it('should handle empty document data', () => {
    const data: DocumentData = {
      title: 'Test Invoice',
      issueDate: '2024-01-01',
      lineItems: [],
    };

    const totals = calculateDocumentTotals(data, 0);

    expect(totals.subtotal).toBe(0);
    expect(totals.vatAmount).toBe(0);
    expect(totals.total).toBe(0);
  });
});
