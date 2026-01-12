import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get dashboard statistics
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const userId = req.userId!;
    const { period = 'month' } = req.query; // 'week', 'month', 'year', 'all'

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Get all documents for user
    const documents = await prisma.document.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate statistics
    const invoices = documents.filter(doc => doc.type === 'INVOICE');
    const quotes = documents.filter(doc => doc.type === 'QUOTE');
    const proformas = documents.filter(doc => doc.type === 'PROFORMA');

    // Revenue calculations (only from paid invoices)
    const paidInvoices = invoices.filter(doc => doc.status === 'PAID');
    const totalRevenue = paidInvoices.reduce((sum, doc) => sum + Number(doc.total), 0);
    
    // Unpaid invoices
    const unpaidInvoices = invoices.filter(
      doc => doc.status === 'SENT' || doc.status === 'VIEWED' || doc.status === 'DRAFT'
    );
    const unpaidAmount = unpaidInvoices.reduce((sum, doc) => sum + Number(doc.total), 0);
    
    // Overdue invoices (assuming due date is in document data)
    const overdueInvoices = invoices.filter(doc => {
      if (doc.status === 'PAID' || doc.status === 'CANCELLED') return false;
      const data = doc.data as any;
      if (!data.dueDate) return false;
      const dueDate = new Date(data.dueDate);
      return dueDate < now && doc.status !== 'PAID';
    });
    const overdueAmount = overdueInvoices.reduce((sum, doc) => sum + Number(doc.total), 0);

    // VAT calculations
    const allInvoices = invoices.filter(doc => doc.status !== 'CANCELLED');
    const totalVATAmount = allInvoices.reduce((sum, doc) => sum + Number(doc.vatAmount), 0);
    const totalSubtotal = allInvoices.reduce((sum, doc) => sum + Number(doc.subtotal), 0);
    
    // VAT exposure (VAT collected but not yet paid to tax authority)
    // This is a simplified calculation - in reality, you'd need to track when VAT is paid
    const vatExposure = totalVATAmount;

    // Document counts by status
    const statusCounts = {
      draft: documents.filter(doc => doc.status === 'DRAFT').length,
      sent: documents.filter(doc => doc.status === 'SENT').length,
      viewed: documents.filter(doc => doc.status === 'VIEWED').length,
      paid: documents.filter(doc => doc.status === 'PAID').length,
      overdue: documents.filter(doc => doc.status === 'OVERDUE').length,
      cancelled: documents.filter(doc => doc.status === 'CANCELLED').length,
    };

    // Recent documents
    const recentDocuments = documents
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map(doc => ({
        id: doc.id,
        documentNumber: doc.documentNumber,
        title: doc.title,
        type: doc.type,
        status: doc.status,
        total: Number(doc.total),
        currency: doc.currency,
        createdAt: doc.createdAt,
        clientName: doc.client?.name || null,
      }));

    // Revenue trend (last 6 months)
    const revenueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthRevenue = paidInvoices
        .filter(doc => {
          const paidAt = doc.paidAt || doc.updatedAt;
          return paidAt >= monthStart && paidAt <= monthEnd;
        })
        .reduce((sum, doc) => sum + Number(doc.total), 0);

      revenueTrend.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
      });
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          unpaidAmount,
          overdueAmount,
          totalVATAmount,
          vatExposure,
          totalSubtotal,
        },
        counts: {
          total: documents.length,
          invoices: invoices.length,
          quotes: quotes.length,
          proformas: proformas.length,
          paid: paidInvoices.length,
          unpaid: unpaidInvoices.length,
          overdue: overdueInvoices.length,
        },
        statusCounts,
        recentDocuments,
        revenueTrend,
        period,
      },
    });
  } catch (error) {
    throw error;
  }
});

export default router;
