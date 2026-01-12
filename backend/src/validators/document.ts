import { z } from 'zod';
import { DocumentData } from '../types/document';

// Validation schemas for document creation/updates

export const windowSpecSchema = z.object({
  id: z.string(),
  type: z.enum(['single', 'double', 'triple', 'sliding', 'casement', 'tilt-turn']),
  width: z.number().positive(),
  height: z.number().positive(),
  frameMaterial: z.enum(['aluminum', 'wood', 'pvc', 'composite']),
  glassType: z.enum(['single', 'double', 'triple', 'laminated', 'tempered']),
  color: z.string().optional(),
  openingDirection: z.enum(['left', 'right', 'both', 'fixed']).optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  notes: z.string().optional(),
});

export const doorSpecSchema = z.object({
  id: z.string(),
  type: z.enum(['entrance', 'interior', 'sliding', 'folding', 'revolving']),
  width: z.number().positive(),
  height: z.number().positive(),
  frameMaterial: z.enum(['aluminum', 'wood', 'steel', 'composite']),
  doorMaterial: z.enum(['wood', 'glass', 'metal', 'composite']),
  openingDirection: z.enum(['left', 'right', 'both', 'sliding']),
  hasGlass: z.boolean(),
  glassType: z.enum(['single', 'double', 'laminated', 'tempered']).optional(),
  color: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  notes: z.string().optional(),
});

export const shutterSpecSchema = z.object({
  id: z.string(),
  type: z.enum(['rolling', 'panel', 'bahama', 'plantation', 'roman']),
  width: z.number().positive(),
  height: z.number().positive(),
  material: z.enum(['aluminum', 'wood', 'pvc', 'composite']),
  color: z.string().optional(),
  slatSize: z.number().positive().optional(),
  operation: z.enum(['manual', 'motorized']),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  notes: z.string().optional(),
});

export const lineItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
  vatRate: z.number().min(0).max(100).optional(),
});

export const documentDataSchema: z.ZodType<DocumentData> = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  issueDate: z.string(), // ISO date string
  dueDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema),
  windows: z.array(windowSpecSchema).optional(),
  doors: z.array(doorSpecSchema).optional(),
  shutters: z.array(shutterSpecSchema).optional(),
  companyInfo: z.object({
    name: z.string(),
    address: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    vatNumber: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
  clientInfo: z.object({
    name: z.string(),
    address: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    vatNumber: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
});

export const createDocumentSchema = z.object({
  clientId: z.string().uuid().optional(),
  title: z.string().min(1),
  type: z.enum(['INVOICE', 'QUOTE', 'PROFORMA']),
  data: documentDataSchema,
  hasWindows: z.boolean().optional(),
  hasDoors: z.boolean().optional(),
  hasShutters: z.boolean().optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  data: documentDataSchema.partial().optional(),
  hasWindows: z.boolean().optional(),
  hasDoors: z.boolean().optional(),
  hasShutters: z.boolean().optional(),
});
