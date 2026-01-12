import { generateDocumentNumber, extractSequenceFromDocumentNumber } from '../../utils/documentNumber';

describe('Document Number Utilities', () => {
  describe('generateDocumentNumber', () => {
    it('should generate invoice number', () => {
      const number = generateDocumentNumber('INVOICE', 1);
      expect(number).toMatch(/^INV-\d{4}-00001$/);
    });

    it('should generate quote number', () => {
      const number = generateDocumentNumber('QUOTE', 42);
      expect(number).toMatch(/^QUO-\d{4}-00042$/);
    });

    it('should generate proforma number', () => {
      const number = generateDocumentNumber('PROFORMA', 123);
      expect(number).toMatch(/^PRO-\d{4}-00123$/);
    });

    it('should pad sequence numbers correctly', () => {
      const number1 = generateDocumentNumber('INVOICE', 1);
      const number2 = generateDocumentNumber('INVOICE', 999);
      const number3 = generateDocumentNumber('INVOICE', 12345);

      expect(number1).toContain('00001');
      expect(number2).toContain('00999');
      expect(number3).toContain('12345');
    });
  });

  describe('extractSequenceFromDocumentNumber', () => {
    it('should extract sequence from invoice number', () => {
      const sequence = extractSequenceFromDocumentNumber('INV-2024-00042');
      expect(sequence).toBe(42);
    });

    it('should extract sequence from quote number', () => {
      const sequence = extractSequenceFromDocumentNumber('QUO-2024-00123');
      expect(sequence).toBe(123);
    });

    it('should throw error for invalid format', () => {
      expect(() => extractSequenceFromDocumentNumber('INVALID')).toThrow();
      expect(() => extractSequenceFromDocumentNumber('INV-2024')).toThrow();
    });
  });
});
