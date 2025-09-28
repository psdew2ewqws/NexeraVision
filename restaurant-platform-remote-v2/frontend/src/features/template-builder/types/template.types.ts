export interface TemplateComponent {
  id: string;
  type: ComponentType;
  name?: string;
  properties: ComponentProperties;
  position: ComponentPosition;
  styles: ComponentStyles;
  zIndex: number;
  dataBinding?: string;
  dataSource?: DataSource;
  dataFormatter?: DataFormatter;
  conditions: DisplayCondition[];
  transformations: DataTransformation[];
  isLocked: boolean;
  isVisible: boolean;
  sortOrder: number;
  parentId?: string;
}

export type ComponentType =
  | 'text'
  | 'image'
  | 'barcode'
  | 'qr'
  | 'table'
  | 'line'
  | 'spacer'
  | 'container'
  | 'logo'
  | 'datetime'
  | 'counter';

export interface ComponentProperties {
  [key: string]: any;
  // Text properties
  text?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  lineHeight?: number;

  // Image properties
  src?: string;
  alt?: string;
  fit?: 'contain' | 'cover' | 'fill';

  // Barcode properties
  data?: string;
  barcodeType?: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC' | 'QR';
  showText?: boolean;

  // Table properties
  columns?: string[];
  dataSource?: string;

  // Line properties
  thickness?: number;
  style?: 'solid' | 'dashed' | 'dotted' | 'double';
  character?: string;

  // Spacer properties
  height?: number;

  // DateTime properties
  format?: 'date' | 'time' | 'datetime' | 'timestamp' | 'custom';
  customFormat?: string;

  // Counter properties
  counterType?: 'order' | 'receipt' | 'daily' | 'custom';
  prefix?: string;
  suffix?: string;
  padding?: number;
}

export interface ComponentPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComponentStyles {
  backgroundColor?: string;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  borderRadius?: number;
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  opacity?: number;
  rotation?: number;
}

export type DataSource =
  | 'order'
  | 'customer'
  | 'company'
  | 'branch'
  | 'user'
  | 'system'
  | 'static';

export type DataFormatter =
  | 'currency'
  | 'date'
  | 'time'
  | 'datetime'
  | 'phone'
  | 'address'
  | 'uppercase'
  | 'lowercase'
  | 'capitalize'
  | 'truncate';

export interface DisplayCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'exists' | 'not_exists';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface DataTransformation {
  type: 'currency' | 'date' | 'uppercase' | 'lowercase' | 'truncate' | 'replace' | 'format';
  parameters: { [key: string]: any };
}

export interface Template {
  id: string;
  companyId: string;
  branchId?: string;
  categoryId: string;
  name: string;
  description?: string;
  designData: TemplateDesignData;
  canvasSettings: CanvasSettings;
  printSettings: PrintSettings;
  previewImage?: string;
  tags: string[];
  usageCount: number;
  lastUsedAt?: Date;
  isDefault: boolean;
  isActive: boolean;
  isPublic: boolean;
  version: number;
  parentTemplateId?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  category?: TemplateCategory;
  company?: { name: string };
  branch?: { name: string };
  components?: TemplateComponent[];
  permissions?: TemplatePermission[];
  versions?: TemplateVersion[];
  analytics?: TemplateAnalytics[];
}

export interface TemplateDesignData {
  components: TemplateComponent[];
  settings: { [key: string]: any };
  metadata: { [key: string]: any };
  toggleConfig?: TemplateToggleConfig; // New toggle-based configuration
}

// New toggle-based template configuration with editable content
export interface TemplateToggleConfig {
  // Header Section
  isLogo: boolean;
  isCompanyName: boolean;
  isCompanyPhone: boolean;
  isBranchName: boolean;
  isBranchAddress: boolean;

  // Order Information
  isOrderNumber: boolean;
  isOrderDate: boolean;
  isOrderTime: boolean;
  isOrderType: boolean;
  isOrderSource: boolean;
  isScheduleTime: boolean;
  isOrderNote: boolean;

  // Customer Information
  isCustomerName: boolean;
  isCustomerPhone: boolean;
  isCustomerAddress: boolean;
  isDeliveryNote: boolean;

  // Product Information
  isProductInfo: boolean;
  isProductName: boolean;
  isProductQuantity: boolean;
  isProductPrice: boolean;
  isProductNote: boolean;
  isProductAttributes: boolean;
  isProductSubAttributes: boolean;

  // Pricing & Totals
  isSubtotal: boolean;
  isDeliveryFees: boolean;
  isTaxValue: boolean;
  isDiscount: boolean;
  isTotal: boolean;

  // Footer Section
  isTaxNumber: boolean;
  isThankYouMessage: boolean;
  isContactInfo: boolean;
  isBarcode: boolean;
  isQRCode: boolean;

  // Additional Options
  isPaid: boolean; // For payment status

  // Editable Content Fields
  content: TemplateEditableContent;
}

// Editable content for each template section
export interface TemplateEditableContent {
  // Header Content
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  branchName: string;
  branchAddress: string;
  logoText: string;

  // Order Content
  orderNumberLabel: string;
  orderDateLabel: string;
  orderTimeLabel: string;
  orderTypeLabel: string;
  orderSourceLabel: string;
  scheduleTimeLabel: string;
  orderNoteLabel: string;
  orderNumberFormat: string;
  dateFormat: string;
  timeFormat: string;

  // Customer Content
  customerNameLabel: string;
  customerPhoneLabel: string;
  customerAddressLabel: string;
  deliveryNoteLabel: string;

  // Product Content
  productsHeaderText: string;
  productNameHeader: string;
  productQuantityHeader: string;
  productPriceHeader: string;
  productNoteLabel: string;
  productAttributesLabel: string;

  // Totals Content
  subtotalLabel: string;
  deliveryFeesLabel: string;
  taxValueLabel: string;
  discountLabel: string;
  totalLabel: string;

  // Footer Content
  taxNumber: string;
  thankYouMessage: string;
  contactInfo: string;
  barcodeContent: string;
  qrCodeContent: string;
  paymentStatusText: string;

  // Styling Options
  headerStyle: TextStyle;
  orderStyle: TextStyle;
  customerStyle: TextStyle;
  productsStyle: TextStyle;
  totalsStyle: TextStyle;
  footerStyle: TextStyle;
}

// Text styling options
export interface TextStyle {
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  color?: string;
  backgroundColor?: string;
}

// Predefined template sections for toggle interface
export interface TemplateSection {
  id: keyof TemplateToggleConfig;
  name: string;
  description: string;
  category: 'header' | 'order' | 'customer' | 'products' | 'totals' | 'footer' | 'options';
  isRequired?: boolean;
  dependsOn?: string[]; // Other sections this depends on
}

export interface CanvasSettings {
  paperSize: PaperSize;
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  backgroundColor: string;
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
  zoom: number;
}

export type PaperSize = '58mm' | '80mm' | '112mm' | 'A4' | 'Letter' | 'custom';

export interface PrintSettings {
  density: 'light' | 'medium' | 'dark';
  cutType: 'none' | 'partial' | 'full';
  encoding: 'cp1252' | 'utf8' | 'cp437' | 'cp865' | 'cp866';
  font: {
    family: string;
    size: number;
    weight: 'normal' | 'bold';
  };
  thermalSettings: {
    speed: 'slow' | 'medium' | 'fast';
    darkness: 'light' | 'medium' | 'dark';
  };
  lineSpacing: number;
  characterSpacing: number;
}

export interface TemplateCategory {
  id: string;
  name: string;
  type: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  settings: { [key: string]: any };
  isActive: boolean;
}

export interface TemplatePermission {
  id: string;
  templateId: string;
  role: string;
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
    test_print: boolean;
    export: boolean;
    share: boolean;
    duplicate: boolean;
    publish: boolean;
  };
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  designData: TemplateDesignData;
  canvasSettings: CanvasSettings;
  printSettings: PrintSettings;
  changes?: string;
  createdBy: string;
  createdAt: Date;
}

export interface TemplateAnalytics {
  id: string;
  templateId: string;
  companyId: string;
  branchId?: string;
  userId?: string;
  action: TemplateAction;
  actionDetails: { [key: string]: any };
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  processingTimeMs?: number;
  errorMessage?: string;
  createdAt: Date;
}

export type TemplateAction =
  | 'create'
  | 'edit'
  | 'duplicate'
  | 'delete'
  | 'print'
  | 'preview'
  | 'test_print'
  | 'export'
  | 'share'
  | 'render';

export interface TemplateSearchParams {
  search?: string;
  categoryId?: string;
  branchId?: string;
  tags?: string[];
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TemplateRenderRequest {
  templateId: string;
  data: { [key: string]: any };
  printerId?: string;
  format?: 'escpos' | 'html' | 'markdown';
  priority?: number;
}

export interface TemplateRenderResult {
  content: string;
  data: string;
  format: string;
  escposCommands?: ArrayBuffer;
  errors?: string[];
}

export interface DragItem {
  type: ComponentType;
  componentId?: string;
  isNew?: boolean;
}

export interface DropResult {
  dropEffect: string;
  target?: string;
}

export interface ComponentLibraryItem {
  type: ComponentType;
  name: string;
  description: string;
  icon: string;
  category: 'basic' | 'data' | 'layout' | 'advanced';
  defaultProperties: ComponentProperties;
  defaultPosition: ComponentPosition;
  defaultStyles: ComponentStyles;
}

export interface TemplatePreview {
  templateId: string;
  previewImage: string;
  markdown: string;
  html: string;
  lastGenerated: Date;
}

export interface ComponentValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}