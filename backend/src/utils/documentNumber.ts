// Generate unique document numbers
// Format: INV-YYYY-XXXXX or QUO-YYYY-XXXXX or PRO-YYYY-XXXXX

export const generateDocumentNumber = (
  type: 'INVOICE' | 'QUOTE' | 'PROFORMA',
  sequence: number
): string => {
  const year = new Date().getFullYear();
  const prefix = type === 'INVOICE' ? 'INV' : type === 'QUOTE' ? 'QUO' : 'PRO';
  const paddedSequence = sequence.toString().padStart(5, '0');
  return `${prefix}-${year}-${paddedSequence}`;
};

// Extract sequence from document number
export const extractSequenceFromDocumentNumber = (docNumber: string): number => {
  const parts = docNumber.split('-');
  if (parts.length !== 3) {
    throw new Error('Invalid document number format');
  }
  return parseInt(parts[2], 10);
};
