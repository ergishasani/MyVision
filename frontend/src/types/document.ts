// Frontend document types (mirrors backend types)

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
  width: number;
  height: number;
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
  width: number;
  height: number;
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
  width: number;
  height: number;
  material: 'aluminum' | 'wood' | 'pvc' | 'composite';
  color?: string;
  slatSize?: number;
  operation: 'manual' | 'motorized';
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface DocumentData {
  title: string;
  description?: string;
  issueDate: string;
  dueDate?: string;
  paymentTerms?: string;
  notes?: string;
  lineItems: DocumentLineItem[];
  windows?: WindowSpec[];
  doors?: DoorSpec[];
  shutters?: ShutterSpec[];
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

export interface Document {
  id: string;
  userId: string;
  clientId?: string;
  documentNumber: string;
  title: string;
  type: 'INVOICE' | 'QUOTE' | 'PROFORMA';
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  data: DocumentData;
  hasWindows: boolean;
  hasDoors: boolean;
  hasShutters: boolean;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  pdfUrl?: string;
  svgData?: any;
  publicToken?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  viewedAt?: string;
  paidAt?: string;
}

export interface CreateDocumentPayload {
  clientId?: string;
  title: string;
  type: 'INVOICE' | 'QUOTE' | 'PROFORMA';
  data: DocumentData;
  hasWindows?: boolean;
  hasDoors?: boolean;
  hasShutters?: boolean;
}
