// Document data structure types
// These define the JSON structure stored in Document.data field

export interface DocumentLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  vatRate?: number;
}

export interface WindowSpec {
  id: string;
  type: 'single' | 'double' | 'triple' | 'sliding' | 'casement' | 'tilt-turn';
  width: number; // in mm
  height: number; // in mm
  frameMaterial: 'aluminum' | 'wood' | 'pvc' | 'composite';
  glassType: 'single' | 'double' | 'triple' | 'laminated' | 'tempered';
  color?: string;
  openingDirection?: 'left' | 'right' | 'both' | 'fixed';
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface DoorSpec {
  id: string;
  type: 'entrance' | 'interior' | 'sliding' | 'folding' | 'revolving';
  width: number; // in mm
  height: number; // in mm
  frameMaterial: 'aluminum' | 'wood' | 'steel' | 'composite';
  doorMaterial: 'wood' | 'glass' | 'metal' | 'composite';
  openingDirection: 'left' | 'right' | 'both' | 'sliding';
  hasGlass: boolean;
  glassType?: 'single' | 'double' | 'laminated' | 'tempered';
  color?: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface ShutterSpec {
  id: string;
  type: 'rolling' | 'panel' | 'bahama' | 'plantation' | 'roman';
  width: number; // in mm
  height: number; // in mm
  material: 'aluminum' | 'wood' | 'pvc' | 'composite';
  color?: string;
  slatSize?: number; // in mm
  operation: 'manual' | 'motorized';
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface DocumentData {
  // Basic document info
  title: string;
  description?: string;
  issueDate: string; // ISO date string
  dueDate?: string; // ISO date string
  paymentTerms?: string;
  notes?: string;
  
  // Line items (general items)
  lineItems: DocumentLineItem[];
  
  // Technical specifications (conditional)
  windows?: WindowSpec[];
  doors?: DoorSpec[];
  shutters?: ShutterSpec[];
  
  // Company/Client info (can be stored here or referenced)
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
}

// SVG data structure for parametric rendering
export interface SVGData {
  windows?: Array<{
    id: string;
    svg: string; // SVG markup
    dimensions: { width: number; height: number };
    position?: { x: number; y: number };
  }>;
  doors?: Array<{
    id: string;
    svg: string; // SVG markup
    dimensions: { width: number; height: number };
    position?: { x: number; y: number };
  }>;
  shutters?: Array<{
    id: string;
    svg: string; // SVG markup
    dimensions: { width: number; height: number };
    position?: { x: number; y: number };
  }>;
  combined?: string; // Combined SVG for all items
}

// Document creation/update payload
export interface CreateDocumentPayload {
  clientId?: string;
  title: string;
  type: 'INVOICE' | 'QUOTE' | 'PROFORMA';
  data: DocumentData;
  hasWindows?: boolean;
  hasDoors?: boolean;
  hasShutters?: boolean;
}

export interface UpdateDocumentPayload {
  title?: string;
  status?: 'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  data?: Partial<DocumentData>;
  hasWindows?: boolean;
  hasDoors?: boolean;
  hasShutters?: boolean;
}
