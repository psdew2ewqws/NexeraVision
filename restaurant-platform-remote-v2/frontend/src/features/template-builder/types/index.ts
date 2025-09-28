export interface TemplateCategory {
  id: string;
  name: string;
  type: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  settings: Record<string, any>;
  isActive: boolean;
}

export interface CanvasSettings {
  width: number;
  height: number;
  paperType: string;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface PrintSettings {
  density: string;
  encoding: string;
  autocut?: boolean;
  cashdraw?: boolean;
  copies?: number;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  branchId?: string;
  companyId: string;
  designData: any;
  canvasSettings: CanvasSettings;
  printSettings: PrintSettings;
  previewImage?: string;
  tags: string[];
  usageCount: number;
  lastUsedAt?: string;
  isDefault: boolean;
  isActive: boolean;
  isPublic: boolean;
  version: number;
  parentTemplateId?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  category?: TemplateCategory;
  components?: TemplateComponent[];
}

export interface ComponentPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TemplateComponent {
  id: string;
  templateId: string;
  type: ComponentType;
  name: string;
  position: ComponentPosition;
  properties: Record<string, any>;
  style?: Record<string, any>;
  parentId?: string;
  sortOrder: number;
  dataBinding?: string;
}

export type ComponentType =
  | 'text'
  | 'image'
  | 'barcode'
  | 'qr'
  | 'table'
  | 'line'
  | 'space'
  | 'logo'
  | 'header'
  | 'footer';

export interface TextComponent extends TemplateComponent {
  type: 'text';
  properties: {
    text: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    textAlign: 'left' | 'center' | 'right';
    underline?: boolean;
    doubleWidth?: boolean;
    doubleHeight?: boolean;
  };
}

export interface ImageComponent extends TemplateComponent {
  type: 'image';
  properties: {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    alignment?: 'left' | 'center' | 'right';
  };
}

export interface BarcodeComponent extends TemplateComponent {
  type: 'barcode';
  properties: {
    data: string;
    barcodeType: 'code128' | 'code39' | 'ean13' | 'upca';
    height: number;
    showText?: boolean;
  };
}

export interface QRComponent extends TemplateComponent {
  type: 'qr';
  properties: {
    data: string;
    size: 'S' | 'M' | 'L';
    errorCorrection: 'L' | 'M' | 'Q' | 'H';
  };
}

export interface TableComponent extends TemplateComponent {
  type: 'table';
  properties: {
    dataSource: string;
    columns: TableColumn[];
    showHeaders: boolean;
    borderStyle?: 'none' | 'simple' | 'double';
  };
}

export interface TableColumn {
  field: string;
  header: string;
  width: number;
  alignment?: 'left' | 'center' | 'right';
  format?: string;
}

export interface LineComponent extends TemplateComponent {
  type: 'line';
  properties: {
    character: string;
    length: number;
    style?: 'solid' | 'dashed' | 'dotted';
  };
}

export interface SpaceComponent extends TemplateComponent {
  type: 'space';
  properties: {
    lines: number;
  };
}

// Dragging and dropping
export interface DragItem {
  type: ComponentType;
  id?: string;
  isNew?: boolean;
}

// Template builder state
export interface TemplateBuilderState {
  selectedTemplate?: Template;
  selectedComponent?: TemplateComponent;
  components: TemplateComponent[];
  categories: TemplateCategory[];
  canvasSettings: CanvasSettings;
  printSettings: PrintSettings;
  previewData?: any;
  isPreviewMode: boolean;
  isDragging: boolean;
  zoom: number;
}

// API types
export interface TemplateFilterParams {
  search?: string;
  categoryId?: string;
  branchId?: string;
  tags?: string[];
  isDefault?: boolean;
  isPublic?: boolean;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  categoryId: string;
  branchId?: string;
  designData?: any;
  canvasSettings?: CanvasSettings;
  printSettings?: PrintSettings;
  tags?: string[];
  isDefault?: boolean;
  isPublic?: boolean;
  parentTemplateId?: string;
}

export interface UpdateTemplateData extends Partial<CreateTemplateData> {
  isActive?: boolean;
  version?: number;
}

export interface CreateComponentData {
  templateId: string;
  type: ComponentType;
  name: string;
  position: ComponentPosition;
  properties: Record<string, any>;
  style?: Record<string, any>;
  parentId?: string;
  sortOrder?: number;
  dataBinding?: string;
}

export interface RenderTemplateData {
  templateId: string;
  data: any;
  format?: 'escpos' | 'text' | 'html';
  printerId?: string;
}

export interface TemplateRenderResult {
  data: string;
  format: string;
  settings: PrintSettings;
  metadata: {
    templateId: string;
    templateName: string;
    paperWidth: number;
    encoding: string;
  };
  printJobId?: string;
}