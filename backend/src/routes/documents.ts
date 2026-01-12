import express, { Request, Response } from 'express';
import { z } from 'zod';
import { createDocumentSchema, updateDocumentSchema } from '../validators/document';
import { generateDocumentNumber } from '../utils/documentNumber';
import { calculateDocumentTotals } from '../utils/calculations';
import { generatePublicToken } from '../utils/publicToken';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../utils/errors';
import { DocumentData } from '../types/document';

const router = express.Router();

// Get all documents for user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const { type, status, page = '1', pageSize = '20' } = req.query;
    const userId = req.userId!;

    const where: any = { userId };
    if (type) where.type = type;
    if (status) where.status = status;

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.document.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          total,
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string),
          totalPages: Math.ceil(total / parseInt(pageSize as string)),
        },
      },
    });
  } catch (error) {
    throw error;
  }
});

// Get single document
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const { id } = req.params;
    const userId = req.userId!;

    const document = await prisma.document.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        client: true,
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    res.json({
      success: true,
      data: { document },
    });
  } catch (error) {
    throw error;
  }
});

// Create document
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const userId = req.userId!;
    const validatedData = createDocumentSchema.parse(req.body);

    // Get next sequence number for document number
    const lastDoc = await prisma.document.findFirst({
      where: {
        userId,
        type: validatedData.type,
      },
      orderBy: { createdAt: 'desc' },
    });

    let sequence = 1;
    if (lastDoc) {
      const lastSequence = parseInt(lastDoc.documentNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    const documentNumber = generateDocumentNumber(validatedData.type, sequence);

    // Calculate financial totals
    const totals = calculateDocumentTotals(validatedData.data as DocumentData);

    // Generate public token
    const publicToken = generatePublicToken();

    // Determine conditional flags
    const hasWindows = validatedData.hasWindows ?? (validatedData.data as DocumentData).windows?.length > 0;
    const hasDoors = validatedData.hasDoors ?? (validatedData.data as DocumentData).doors?.length > 0;
    const hasShutters = validatedData.hasShutters ?? (validatedData.data as DocumentData).shutters?.length > 0;

    const document = await prisma.document.create({
      data: {
        userId,
        clientId: validatedData.clientId,
        documentNumber,
        title: validatedData.title,
        type: validatedData.type,
        status: 'DRAFT',
        data: validatedData.data as any,
        hasWindows,
        hasDoors,
        hasShutters,
        subtotal: totals.subtotal,
        vatRate: totals.vatRate,
        vatAmount: totals.vatAmount,
        total: totals.total,
        publicToken,
      },
      include: {
        client: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        documentId: document.id,
        action: 'created',
        metadata: { userId },
      },
    });

    res.status(201).json({
      success: true,
      data: { document },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid document data');
    }
    throw error;
  }
});

// Update document
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const { id } = req.params;
    const userId = req.userId!;
    const validatedData = updateDocumentSchema.parse(req.body);

    // Check ownership
    const existingDoc = await prisma.document.findFirst({
      where: { id, userId },
    });

    if (!existingDoc) {
      throw new NotFoundError('Document not found');
    }

    // Prepare update data
    const updateData: any = {};
    if (validatedData.title) updateData.title = validatedData.title;
    if (validatedData.status) updateData.status = validatedData.status;

    // Update data if provided
    if (validatedData.data) {
      const newData = { ...(existingDoc.data as any), ...validatedData.data };
      updateData.data = newData;

      // Recalculate totals
      const totals = calculateDocumentTotals(newData as DocumentData);
      updateData.subtotal = totals.subtotal;
      updateData.vatRate = totals.vatRate;
      updateData.vatAmount = totals.vatAmount;
      updateData.total = totals.total;

      // Update conditional flags
      updateData.hasWindows = validatedData.hasWindows ?? newData.windows?.length > 0;
      updateData.hasDoors = validatedData.hasDoors ?? newData.doors?.length > 0;
      updateData.hasShutters = validatedData.hasShutters ?? newData.shutters?.length > 0;
    }

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        documentId: document.id,
        action: validatedData.status ? `status_changed_to_${validatedData.status.toLowerCase()}` : 'updated',
        metadata: { userId },
      },
    });

    res.json({
      success: true,
      data: { document },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid document data');
    }
    throw error;
  }
});

// Delete document
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const { id } = req.params;
    const userId = req.userId!;

    const document = await prisma.document.findFirst({
      where: { id, userId },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    await prisma.document.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    throw error;
  }
});

// Generate PDF for document
router.get('/:id/pdf', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const { generatePDF } = await import('../utils/pdfGenerator');
    
    const { id } = req.params;
    const userId = req.userId!;

    const document = await prisma.document.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        client: true,
        user: true,
      },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    // Generate PDF
    const pdfBuffer = await generatePDF({
      documentData: document.data as any,
      documentNumber: document.documentNumber,
      documentType: document.type,
      companyInfo: {
        name: document.user.companyName || document.user.email,
        email: document.user.email,
      },
      clientInfo: document.client ? {
        name: document.client.name,
        email: document.client.email || undefined,
        address: document.client.address || undefined,
        city: document.client.city || undefined,
        postalCode: document.client.postalCode || undefined,
        country: document.client.country || undefined,
        vatNumber: document.client.vatNumber || undefined,
      } : undefined,
      subtotal: Number(document.subtotal),
      vatRate: Number(document.vatRate),
      vatAmount: Number(document.vatAmount),
      total: Number(document.total),
      currency: document.currency,
    });

    // Log PDF generation
    await prisma.auditLog.create({
      data: {
        documentId: document.id,
        action: 'pdf_generated',
        metadata: { userId },
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.documentNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    throw error;
  }
});

// Send document via email
router.post('/:id/send', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const { sendDocumentEmail } = await import('../utils/email');
    
    const { id } = req.params;
    const userId = req.userId!;
    const { email, message } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required',
      });
    }

    const document = await prisma.document.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        client: true,
        user: true,
      },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    // Send email
    await sendDocumentEmail(
      email,
      {
        id: document.id,
        documentNumber: document.documentNumber,
        title: document.title,
        type: document.type,
        data: document.data as any,
        subtotal: Number(document.subtotal),
        vatRate: Number(document.vatRate),
        vatAmount: Number(document.vatAmount),
        total: Number(document.total),
        currency: document.currency,
        companyInfo: {
          name: document.user.companyName || document.user.email,
          email: document.user.email,
        },
        clientInfo: document.client ? {
          name: document.client.name,
          email: document.client.email || undefined,
          address: document.client.address || undefined,
          city: document.client.city || undefined,
          postalCode: document.client.postalCode || undefined,
          country: document.client.country || undefined,
          vatNumber: document.client.vatNumber || undefined,
        } : undefined,
      },
      document.publicToken || ''
    );

    // Update document status
    await prisma.document.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        documentId: document.id,
        action: 'sent',
        metadata: {
          userId,
          email,
          message: message || null,
        },
      },
    });

    res.json({
      success: true,
      message: 'Document sent successfully',
    });
  } catch (error: any) {
    if (error.code === 'EAUTH' || error.code === 'ECONNECTION') {
      return res.status(500).json({
        success: false,
        error: 'Email configuration error. Please check SMTP settings.',
      });
    }
    throw error;
  }
});

// Get document by public token (for client viewing)
router.get('/public/:token', async (req: Request, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const { token } = req.params;

    const document = await prisma.document.findUnique({
      where: { publicToken: token },
      include: {
        client: true,
      },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    // Log view
    await prisma.auditLog.create({
      data: {
        documentId: document.id,
        action: 'viewed',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    // Update viewedAt
    await prisma.document.update({
      where: { id: document.id },
      data: { viewedAt: new Date() },
    });

    res.json({
      success: true,
      data: { document },
    });
  } catch (error) {
    throw error;
  }
});

export default router;
