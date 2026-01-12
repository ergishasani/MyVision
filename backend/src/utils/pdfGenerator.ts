import PDFDocument from 'pdfkit';
import { DocumentData } from '../types/document';

export interface PDFGenerationOptions {
  documentData: DocumentData;
  documentNumber: string;
  documentType: 'INVOICE' | 'QUOTE' | 'PROFORMA';
  companyInfo?: {
    name: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    vatNumber?: string;
    email?: string;
    phone?: string;
  };
  clientInfo?: {
    name: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    vatNumber?: string;
    email?: string;
    phone?: string;
  };
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency?: string;
}

/**
 * Generate PDF from document data
 */
export async function generatePDF(options: PDFGenerationOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(options.documentType, 50, 50);
      doc.fontSize(12).font('Helvetica').text(`Document #: ${options.documentNumber}`, 50, 75);
      
      if (options.documentData.issueDate) {
        doc.text(`Issue Date: ${new Date(options.documentData.issueDate).toLocaleDateString()}`, 50, 90);
      }
      if (options.documentData.dueDate) {
        doc.text(`Due Date: ${new Date(options.documentData.dueDate).toLocaleDateString()}`, 50, 105);
      }

      let yPos = 130;

      // Company and Client Info
      if (options.companyInfo) {
        doc.fontSize(10).font('Helvetica-Bold').text('From:', 50, yPos);
        doc.font('Helvetica').text(options.companyInfo.name, 50, yPos + 15);
        if (options.companyInfo.address) doc.text(options.companyInfo.address, 50, yPos + 30);
        if (options.companyInfo.city || options.companyInfo.postalCode) {
          doc.text(
            [options.companyInfo.postalCode, options.companyInfo.city].filter(Boolean).join(' '),
            50,
            yPos + 45
          );
        }
        if (options.companyInfo.country) doc.text(options.companyInfo.country, 50, yPos + 60);
        if (options.companyInfo.vatNumber) doc.text(`VAT: ${options.companyInfo.vatNumber}`, 50, yPos + 75);
      }

      if (options.clientInfo) {
        const clientX = 300;
        doc.fontSize(10).font('Helvetica-Bold').text('To:', clientX, yPos);
        doc.font('Helvetica').text(options.clientInfo.name, clientX, yPos + 15);
        if (options.clientInfo.address) doc.text(options.clientInfo.address, clientX, yPos + 30);
        if (options.clientInfo.city || options.clientInfo.postalCode) {
          doc.text(
            [options.clientInfo.postalCode, options.clientInfo.city].filter(Boolean).join(' '),
            clientX,
            yPos + 45
          );
        }
        if (options.clientInfo.country) doc.text(options.clientInfo.country, clientX, yPos + 60);
        if (options.clientInfo.vatNumber) doc.text(`VAT: ${options.clientInfo.vatNumber}`, clientX, yPos + 75);
      }

      yPos += 120;

      // Description
      if (options.documentData.description) {
        doc.fontSize(12).font('Helvetica-Bold').text('Description:', 50, yPos);
        doc.fontSize(10).font('Helvetica').text(options.documentData.description, 50, yPos + 15, {
          width: 500,
        });
        yPos += 40;
      }

      // Line Items Table
      if (options.documentData.lineItems && options.documentData.lineItems.length > 0) {
        yPos += 20;
        doc.fontSize(12).font('Helvetica-Bold').text('Items:', 50, yPos);
        yPos += 20;

        // Table header
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Description', 50, yPos);
        doc.text('Qty', 300, yPos);
        doc.text('Unit Price', 350, yPos);
        doc.text('Total', 450, yPos);
        yPos += 15;

        // Table rows
        doc.font('Helvetica');
        for (const item of options.documentData.lineItems) {
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }

          doc.fontSize(9).text(item.description || '', 50, yPos, { width: 240 });
          doc.text(item.quantity.toString(), 300, yPos);
          doc.text(`${options.currency || '€'}${item.unitPrice.toFixed(2)}`, 350, yPos);
          doc.text(`${options.currency || '€'}${(item.total || item.quantity * item.unitPrice).toFixed(2)}`, 450, yPos);
          yPos += 20;
        }
        yPos += 10;
      }

      // Technical Specifications
      if (options.documentData.windows && options.documentData.windows.length > 0) {
        if (yPos > 650) {
          doc.addPage();
          yPos = 50;
        }

        doc.fontSize(12).font('Helvetica-Bold').text('Windows:', 50, yPos);
        yPos += 20;

        for (const window of options.documentData.windows) {
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }

          // Window description
          doc.fontSize(10).font('Helvetica-Bold').text(
            `${window.type.charAt(0).toUpperCase() + window.type.slice(1)} Window - ${window.width}mm × ${window.height}mm`,
            50,
            yPos
          );
          yPos += 15;

          doc.fontSize(9).font('Helvetica');
          doc.text(`Frame: ${window.frameMaterial}`, 50, yPos);
          doc.text(`Glass: ${window.glassType}`, 200, yPos);
          doc.text(`Qty: ${window.quantity}`, 350, yPos);
          doc.text(`Price: ${options.currency || '€'}${window.unitPrice.toFixed(2)}`, 450, yPos);
          yPos += 20;

          // Window specifications displayed in text format
          // SVG rendering can be added later if needed with proper SVG-to-PDF conversion
          yPos += 10;
        }
        yPos += 10;
      }

      if (options.documentData.doors && options.documentData.doors.length > 0) {
        if (yPos > 650) {
          doc.addPage();
          yPos = 50;
        }

        doc.fontSize(12).font('Helvetica-Bold').text('Doors:', 50, yPos);
        yPos += 20;

        for (const door of options.documentData.doors) {
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }

          doc.fontSize(10).font('Helvetica-Bold').text(
            `${door.type.charAt(0).toUpperCase() + door.type.slice(1)} Door - ${door.width}mm × ${door.height}mm`,
            50,
            yPos
          );
          yPos += 15;

          doc.fontSize(9).font('Helvetica');
          doc.text(`Frame: ${door.frameMaterial}`, 50, yPos);
          doc.text(`Material: ${door.doorMaterial}`, 200, yPos);
          doc.text(`Opening: ${door.openingDirection}`, 350, yPos);
          doc.text(`Qty: ${door.quantity}`, 450, yPos);
          yPos += 20;

          if (door.hasGlass) {
            doc.text(`Glass: ${door.glassType || 'N/A'}`, 50, yPos);
            yPos += 15;
          }

          doc.text(`Price: ${options.currency || '€'}${door.unitPrice.toFixed(2)}`, 50, yPos);
          yPos += 30;
        }
        yPos += 10;
      }

      if (options.documentData.shutters && options.documentData.shutters.length > 0) {
        if (yPos > 650) {
          doc.addPage();
          yPos = 50;
        }

        doc.fontSize(12).font('Helvetica-Bold').text('Shutters:', 50, yPos);
        yPos += 20;

        for (const shutter of options.documentData.shutters) {
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }

          doc.fontSize(10).font('Helvetica-Bold').text(
            `${shutter.type.charAt(0).toUpperCase() + shutter.type.slice(1)} Shutter - ${shutter.width}mm × ${shutter.height}mm`,
            50,
            yPos
          );
          yPos += 15;

          doc.fontSize(9).font('Helvetica');
          doc.text(`Material: ${shutter.material}`, 50, yPos);
          doc.text(`Operation: ${shutter.operation}`, 200, yPos);
          doc.text(`Qty: ${shutter.quantity}`, 350, yPos);
          doc.text(`Price: ${options.currency || '€'}${shutter.unitPrice.toFixed(2)}`, 450, yPos);
          yPos += 30;
        }
      }

      // Totals
      if (yPos > 650) {
        doc.addPage();
        yPos = 50;
      }

      yPos += 20;
      const totalsX = 350;
      doc.fontSize(10).font('Helvetica');
      doc.text('Subtotal:', totalsX, yPos);
      doc.text(`${options.currency || '€'}${options.subtotal.toFixed(2)}`, 450, yPos);
      yPos += 20;

      if (options.vatRate > 0) {
        doc.text(`VAT (${options.vatRate}%):`, totalsX, yPos);
        doc.text(`${options.currency || '€'}${options.vatAmount.toFixed(2)}`, 450, yPos);
        yPos += 20;
      }

      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Total:', totalsX, yPos);
      doc.text(`${options.currency || '€'}${options.total.toFixed(2)}`, 450, yPos);

      // Payment Terms
      if (options.documentData.paymentTerms) {
        yPos += 40;
        doc.fontSize(10).font('Helvetica-Bold').text('Payment Terms:', 50, yPos);
        doc.font('Helvetica').text(options.documentData.paymentTerms, 50, yPos + 15);
      }

      // Notes
      if (options.documentData.notes) {
        yPos += 40;
        doc.fontSize(10).font('Helvetica-Bold').text('Notes:', 50, yPos);
        doc.font('Helvetica').text(options.documentData.notes, 50, yPos + 15, { width: 500 });
      }

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).font('Helvetica').text(
          `Page ${i + 1} of ${pageCount}`,
          50,
          doc.page.height - 30,
          { align: 'center', width: 500 }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
