import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../utils/errors';

const router = express.Router();

// Validation schemas
const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  vatNumber: z.string().optional(),
});

const updateClientSchema = createClientSchema.partial();

// Get all clients for user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const userId = req.userId!;
    const { search, page = '1', pageSize = '20' } = req.query;

    const where: any = { userId };
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { vatNumber: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          _count: {
            select: { documents: true },
          },
        },
      }),
      prisma.client.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        clients,
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

// Get single client
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const { id } = req.params;
    const userId = req.userId!;

    const client = await prisma.client.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        documents: {
          select: {
            id: true,
            documentNumber: true,
            title: true,
            type: true,
            status: true,
            total: true,
            currency: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    res.json({
      success: true,
      data: { client },
    });
  } catch (error) {
    throw error;
  }
});

// Create client
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const userId = req.userId!;
    const validatedData = createClientSchema.parse(req.body);

    const client = await prisma.client.create({
      data: {
        userId,
        name: validatedData.name,
        email: validatedData.email || undefined,
        phone: validatedData.phone || undefined,
        address: validatedData.address || undefined,
        city: validatedData.city || undefined,
        postalCode: validatedData.postalCode || undefined,
        country: validatedData.country || undefined,
        vatNumber: validatedData.vatNumber || undefined,
      },
    });

    res.status(201).json({
      success: true,
      data: { client },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid client data');
    }
    throw error;
  }
});

// Update client
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const { id } = req.params;
    const userId = req.userId!;
    const validatedData = updateClientSchema.parse(req.body);

    // Check ownership
    const existingClient = await prisma.client.findFirst({
      where: { id, userId },
    });

    if (!existingClient) {
      throw new NotFoundError('Client not found');
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
        city: validatedData.city,
        postalCode: validatedData.postalCode,
        country: validatedData.country,
        vatNumber: validatedData.vatNumber,
      },
    });

    res.json({
      success: true,
      data: { client },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid client data');
    }
    throw error;
  }
});

// Delete client
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const { id } = req.params;
    const userId = req.userId!;

    const client = await prisma.client.findFirst({
      where: { id, userId },
    });

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    await prisma.client.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Client deleted successfully',
    });
  } catch (error) {
    throw error;
  }
});

export default router;
