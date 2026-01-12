import express, { Request, Response } from 'express';
import { z } from 'zod';
import { renderWindow, renderDoor, renderShutter } from '../utils/svgRenderer';
import { WindowSpec, DoorSpec, ShutterSpec } from '../types/document';

const router = express.Router();

const windowSpecSchema = z.object({
  id: z.string(),
  type: z.enum(['single', 'double', 'triple', 'sliding', 'casement', 'tilt-turn']),
  width: z.number().positive(),
  height: z.number().positive(),
  frameMaterial: z.string(),
  glassType: z.string(),
  color: z.string().optional(),
  openingDirection: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

const doorSpecSchema = z.object({
  id: z.string(),
  type: z.enum(['entrance', 'interior', 'sliding', 'folding', 'revolving']),
  width: z.number().positive(),
  height: z.number().positive(),
  frameMaterial: z.string(),
  doorMaterial: z.string(),
  openingDirection: z.string(),
  hasGlass: z.boolean(),
  glassType: z.string().optional(),
  color: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

const shutterSpecSchema = z.object({
  id: z.string(),
  type: z.enum(['rolling', 'panel', 'bahama', 'plantation', 'roman']),
  width: z.number().positive(),
  height: z.number().positive(),
  material: z.string(),
  color: z.string().optional(),
  slatSize: z.number().positive().optional(),
  operation: z.enum(['manual', 'motorized']),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

// Render window SVG
router.post('/window', (req: Request, res: Response) => {
  try {
    const spec = windowSpecSchema.parse(req.body);
    const svg = renderWindow(spec as WindowSpec, {
      scale: req.query.scale ? parseFloat(req.query.scale as string) : undefined,
    });
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid window specification',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to render window SVG',
    });
  }
});

// Render door SVG
router.post('/door', (req: Request, res: Response) => {
  try {
    const spec = doorSpecSchema.parse(req.body);
    const svg = renderDoor(spec as DoorSpec, {
      scale: req.query.scale ? parseFloat(req.query.scale as string) : undefined,
    });
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid door specification',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to render door SVG',
    });
  }
});

// Render shutter SVG
router.post('/shutter', (req: Request, res: Response) => {
  try {
    const spec = shutterSpecSchema.parse(req.body);
    const svg = renderShutter(spec as ShutterSpec, {
      scale: req.query.scale ? parseFloat(req.query.scale as string) : undefined,
    });
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid shutter specification',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to render shutter SVG',
    });
  }
});

export default router;
