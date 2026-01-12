import { createDocumentSchema, updateDocumentSchema } from '../../validators/document';

describe('Document Validators', () => {
  describe('createDocumentSchema', () => {
    it('should validate valid document data', () => {
      const validData = {
        title: 'Test Invoice',
        type: 'INVOICE',
        data: {
          title: 'Test Invoice',
          issueDate: '2024-01-01',
          lineItems: [
            {
              id: '1',
              description: 'Test Item',
              quantity: 1,
              unitPrice: 100,
              total: 100,
            },
          ],
        },
      };

      expect(() => createDocumentSchema.parse(validData)).not.toThrow();
    });

    it('should reject missing title', () => {
      const invalidData = {
        type: 'INVOICE',
        data: {
          title: 'Test Invoice',
          issueDate: '2024-01-01',
          lineItems: [],
        },
      };

      expect(() => createDocumentSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid document type', () => {
      const invalidData = {
        title: 'Test Invoice',
        type: 'INVALID',
        data: {
          title: 'Test Invoice',
          issueDate: '2024-01-01',
          lineItems: [],
        },
      };

      expect(() => createDocumentSchema.parse(invalidData)).toThrow();
    });

    it('should validate window specifications', () => {
      const validData = {
        title: 'Test Invoice',
        type: 'INVOICE',
        hasWindows: true,
        data: {
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
              quantity: 1,
              unitPrice: 500,
            },
          ],
        },
      };

      expect(() => createDocumentSchema.parse(validData)).not.toThrow();
    });
  });

  describe('updateDocumentSchema', () => {
    it('should validate partial update data', () => {
      const validData = {
        title: 'Updated Title',
      };

      expect(() => updateDocumentSchema.parse(validData)).not.toThrow();
    });

    it('should validate status update', () => {
      const validData = {
        status: 'SENT',
      };

      expect(() => updateDocumentSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid status', () => {
      const invalidData = {
        status: 'INVALID',
      };

      expect(() => updateDocumentSchema.parse(invalidData)).toThrow();
    });
  });
});
