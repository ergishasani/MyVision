import nodemailer from 'nodemailer';
import { generatePDF } from './pdfGenerator';
import { DocumentData } from '../types/document';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
}

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Send email
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const transporter = getTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments || [],
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Send document via email
 */
export async function sendDocumentEmail(
  to: string,
  documentData: {
    id: string;
    documentNumber: string;
    title: string;
    type: 'INVOICE' | 'QUOTE' | 'PROFORMA';
    data: DocumentData;
    subtotal: number;
    vatRate: number;
    vatAmount: number;
    total: number;
    currency: string;
    companyInfo?: any;
    clientInfo?: any;
  },
  publicToken: string
): Promise<void> {
  // Generate PDF
  const pdfBuffer = await generatePDF({
    documentData: documentData.data,
    documentNumber: documentData.documentNumber,
    documentType: documentData.type,
    companyInfo: documentData.companyInfo,
    clientInfo: documentData.clientInfo,
    subtotal: documentData.subtotal,
    vatRate: documentData.vatRate,
    vatAmount: documentData.vatAmount,
    total: documentData.total,
    currency: documentData.currency,
  });

  // Create email HTML
  const documentTypeLabel = documentData.type === 'INVOICE' ? 'Invoice' : documentData.type === 'QUOTE' ? 'Quote' : 'Proforma Invoice';
  const viewUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/view/${publicToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0ea5e9; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .details { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${documentTypeLabel}</h1>
            <p>${documentData.documentNumber}</p>
          </div>
          <div class="content">
            <p>Dear ${documentData.clientInfo?.name || 'Client'},</p>
            <p>Please find attached your ${documentTypeLabel.toLowerCase()} <strong>${documentData.documentNumber}</strong> for <strong>${documentData.title}</strong>.</p>
            
            <div class="details">
              <p><strong>Document Details:</strong></p>
              <ul>
                <li>Document Number: ${documentData.documentNumber}</li>
                <li>Issue Date: ${documentData.data.issueDate ? new Date(documentData.data.issueDate).toLocaleDateString() : 'N/A'}</li>
                ${documentData.data.dueDate ? `<li>Due Date: ${new Date(documentData.data.dueDate).toLocaleDateString()}</li>` : ''}
                <li>Total Amount: ${documentData.currency} ${documentData.total.toFixed(2)}</li>
              </ul>
            </div>

            <p>You can also view this document online by clicking the button below:</p>
            <a href="${viewUrl}" class="button">View Document Online</a>

            ${documentData.data.paymentTerms ? `<p><strong>Payment Terms:</strong> ${documentData.data.paymentTerms}</p>` : ''}

            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Best regards,<br>${documentData.companyInfo?.name || 'MyVision Invoicing'}</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>© ${new Date().getFullYear()} MyVision Invoicing. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to,
    subject: `${documentTypeLabel} ${documentData.documentNumber} - ${documentData.title}`,
    html,
    attachments: [
      {
        filename: `${documentData.documentNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}
