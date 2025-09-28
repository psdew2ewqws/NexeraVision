import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  Template,
  TemplateComponent,
  TemplateCategory,
  CanvasSettings,
  PrintSettings,
  ComponentType,
  ComponentPosition,
  TemplateToggleConfig,
  TemplateSection,
  TemplateEditableContent,
  TextStyle
} from '../types/template.types';

interface Printer {
  id: string;
  name: string;
  type: string;
  status: string;
  isOnline: boolean;
  capabilities?: string[];
  location?: string;
}

interface TemplateBuilderState {
  // Current template being edited
  currentTemplate?: Template;

  // Components in the current template (legacy support)
  components: TemplateComponent[];

  // NEW: Toggle-based configuration
  toggleConfig: TemplateToggleConfig;
  availableSections: TemplateSection[];

  // Available categories
  categories: TemplateCategory[];

  // Canvas and print settings
  canvasSettings: CanvasSettings;
  printSettings: PrintSettings;

  // Printer state
  availablePrinters: Printer[];
  selectedPrinterId?: string;
  isLoadingPrinters: boolean;
  printerError?: string;

  // UI state
  selectedComponentId?: string;
  multiSelection: string[];
  isPreviewMode: boolean;
  isDragging: boolean;
  isResizing: boolean;
  zoom: number;
  activePanel: 'toggles' | 'components' | 'properties' | 'preview'; // Updated to include toggles
  showGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;

  // Toggle UI state
  isToggleMode: boolean; // Switch between toggle mode and legacy drag-drop mode
  selectedCategory: string; // For filtering toggle sections

  // History and undo/redo
  history: any[];
  historyIndex: number;
  hasUnsavedChanges: boolean;

  // Advanced selection and editing
  clipboardComponents: TemplateComponent[];
  undoStack: any[];
  redoStack: any[];
  groupedComponents: { [groupId: string]: string[] };
  lockedComponents: string[];
  hiddenComponents: string[];

  // Collaboration (future)
  collaborators: any[];
  cursorPositions: { [userId: string]: { x: number; y: number } };

  // Preview data for testing
  previewData?: any;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  error?: string;

  // Actions
  setCurrentTemplate: (template?: Template) => void;
  setComponents: (components: TemplateComponent[]) => void;
  addComponent: (componentType: ComponentType, position: ComponentPosition) => void;
  updateComponent: (id: string, updates: Partial<TemplateComponent>) => void;
  removeComponent: (id: string) => void;
  getComponentById: (id: string) => TemplateComponent | undefined;
  markAsChanged: () => void;
  addToHistory: () => void;
  setResizing: (resizing: boolean) => void;

  // NEW: Toggle-based actions
  setToggleMode: (enabled: boolean) => void;
  updateToggleConfig: (updates: Partial<TemplateToggleConfig>) => void;
  updateEditableContent: (updates: Partial<TemplateEditableContent>) => void;
  updateContentStyle: (section: keyof TemplateEditableContent, style: Partial<TextStyle>) => void;
  toggleSection: (sectionId: keyof TemplateToggleConfig) => void;
  resetToggleConfig: () => void;
  setAvailableSections: (sections: TemplateSection[]) => void;
  setSelectedCategory: (category: string) => void;
  generateTemplateFromToggles: () => TemplateComponent[];

  // Advanced Selection
  selectComponent: (id?: string, multiSelect?: boolean) => void;
  selectMultiple: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  invertSelection: () => void;

  // Component Operations
  duplicateComponents: (ids: string[]) => void;
  deleteComponents: (ids: string[]) => void;
  copyComponents: (ids: string[]) => void;
  pasteComponents: () => void;
  groupComponents: (ids: string[]) => void;
  ungroupComponents: (groupId: string) => void;
  lockComponents: (ids: string[]) => void;
  unlockComponents: (ids: string[]) => void;
  hideComponents: (ids: string[]) => void;
  showComponents: (ids: string[]) => void;

  // Alignment Tools
  alignLeft: (ids: string[]) => void;
  alignCenter: (ids: string[]) => void;
  alignRight: (ids: string[]) => void;
  alignTop: (ids: string[]) => void;
  alignMiddle: (ids: string[]) => void;
  alignBottom: (ids: string[]) => void;
  distributeHorizontally: (ids: string[]) => void;
  distributeVertically: (ids: string[]) => void;

  // Z-Index Management
  bringToFront: (ids: string[]) => void;
  sendToBack: (ids: string[]) => void;
  bringForward: (ids: string[]) => void;
  sendBackward: (ids: string[]) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  pushToUndoStack: (action: any) => void;

  // UI State
  setActivePanel: (panel: 'toggles' | 'components' | 'properties' | 'preview') => void;
  toggleGrid: () => void;
  toggleRulers: () => void;
  toggleGuides: () => void;
  setError: (error?: string) => void;

  setCategories: (categories: TemplateCategory[]) => void;
  updateCanvasSettings: (settings: Partial<CanvasSettings>) => void;
  setPrintSettings: (settings: Partial<PrintSettings>) => void;

  setPreviewMode: (enabled: boolean) => void;
  setDragging: (dragging: boolean) => void;
  setZoom: (zoom: number) => void;
  setPreviewData: (data: any) => void;

  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;

  // Printer actions
  setAvailablePrinters: (printers: Printer[]) => void;
  setSelectedPrinterId: (printerId?: string) => void;
  setLoadingPrinters: (loading: boolean) => void;
  setPrinterError: (error?: string) => void;
  fetchPrinters: () => Promise<void>;

  // Clear state
  reset: () => void;
}

const defaultCanvasSettings: CanvasSettings = {
  paperSize: '80mm',
  orientation: 'portrait',
  margins: {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10
  },
  backgroundColor: '#ffffff',
  showGrid: true,
  gridSize: 10,
  snapToGrid: true,
  zoom: 1
};

const defaultPrintSettings: PrintSettings = {
  density: 'medium',
  cutType: 'partial',
  encoding: 'cp1252',
  font: { family: 'monospace', size: 12, weight: 'normal' },
  thermalSettings: { speed: 'medium', darkness: 'medium' },
  lineSpacing: 1,
  characterSpacing: 0
};

const defaultTextStyle: TextStyle = {
  fontSize: 12,
  fontWeight: 'normal',
  textAlign: 'left',
  textTransform: 'none',
  color: '#000000'
};

const defaultEditableContent: TemplateEditableContent = {
  // Header Content
  companyName: '{{company.name}}',
  companyPhone: '{{company.phone}}',
  companyAddress: '{{company.address}}',
  branchName: '{{branch.name}}',
  branchAddress: '{{branch.address}}',
  logoText: 'LOGO',

  // Order Content
  orderNumberLabel: 'Order #',
  orderDateLabel: 'Date:',
  orderTimeLabel: 'Time:',
  orderTypeLabel: 'Type:',
  orderSourceLabel: 'Source:',
  scheduleTimeLabel: 'Scheduled:',
  orderNoteLabel: 'Note:',
  orderNumberFormat: '{{order.id}}',
  dateFormat: '{{order.createdAt | date}}',
  timeFormat: '{{order.createdAt | time}}',

  // Customer Content
  customerNameLabel: 'Customer:',
  customerPhoneLabel: 'Phone:',
  customerAddressLabel: 'Address:',
  deliveryNoteLabel: 'Delivery Note:',

  // Product Content
  productsHeaderText: 'ITEMS',
  productNameHeader: 'Item',
  productQuantityHeader: 'Qty',
  productPriceHeader: 'Price',
  productNoteLabel: 'Note:',
  productAttributesLabel: 'Options:',

  // Totals Content
  subtotalLabel: 'Subtotal:',
  deliveryFeesLabel: 'Delivery:',
  taxValueLabel: 'Tax:',
  discountLabel: 'Discount:',
  totalLabel: 'TOTAL:',

  // Footer Content
  taxNumber: '{{company.taxNumber}}',
  thankYouMessage: 'Thank you for your order!',
  contactInfo: '{{company.phone}} | {{company.email}}',
  barcodeContent: '{{order.id}}',
  qrCodeContent: '{{order.trackingUrl}}',
  paymentStatusText: 'PAID',

  // Styling Options
  headerStyle: { ...defaultTextStyle, fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  orderStyle: { ...defaultTextStyle, fontSize: 12 },
  customerStyle: { ...defaultTextStyle, fontSize: 12 },
  productsStyle: { ...defaultTextStyle, fontSize: 11 },
  totalsStyle: { ...defaultTextStyle, fontSize: 12, textAlign: 'right' },
  footerStyle: { ...defaultTextStyle, fontSize: 10, textAlign: 'center' }
};

const defaultToggleConfig: TemplateToggleConfig = {
  // Header Section
  isLogo: true,
  isCompanyName: true,
  isCompanyPhone: false,
  isBranchName: true,
  isBranchAddress: false,

  // Order Information
  isOrderNumber: true,
  isOrderDate: true,
  isOrderTime: true,
  isOrderType: false,
  isOrderSource: false,
  isScheduleTime: false,
  isOrderNote: false,

  // Customer Information
  isCustomerName: true,
  isCustomerPhone: true,
  isCustomerAddress: true,
  isDeliveryNote: false,

  // Product Information
  isProductInfo: true,
  isProductName: true,
  isProductQuantity: true,
  isProductPrice: true,
  isProductNote: false,
  isProductAttributes: true,
  isProductSubAttributes: false,

  // Pricing & Totals
  isSubtotal: true,
  isDeliveryFees: true,
  isTaxValue: true,
  isDiscount: false,
  isTotal: true,

  // Footer Section
  isTaxNumber: false,
  isThankYouMessage: true,
  isContactInfo: false,
  isBarcode: false,
  isQRCode: false,

  // Additional Options
  isPaid: false,

  // Editable Content
  content: defaultEditableContent
};

const defaultAvailableSections: TemplateSection[] = [
  // Header Section
  { id: 'isLogo', name: 'Company Logo', description: 'Display company logo at the top', category: 'header' },
  { id: 'isCompanyName', name: 'Company Name', description: 'Display company name', category: 'header' },
  { id: 'isCompanyPhone', name: 'Company Phone', description: 'Display company phone number', category: 'header' },
  { id: 'isBranchName', name: 'Branch Name', description: 'Display branch name', category: 'header' },
  { id: 'isBranchAddress', name: 'Branch Address', description: 'Display branch address', category: 'header' },

  // Order Information
  { id: 'isOrderNumber', name: 'Order Number', description: 'Display order ID/number', category: 'order', isRequired: true },
  { id: 'isOrderDate', name: 'Order Date', description: 'Display order date', category: 'order' },
  { id: 'isOrderTime', name: 'Order Time', description: 'Display order time', category: 'order' },
  { id: 'isOrderType', name: 'Order Type', description: 'Display delivery/pickup type', category: 'order' },
  { id: 'isOrderSource', name: 'Order Source', description: 'Display order source (app, web, phone)', category: 'order' },
  { id: 'isScheduleTime', name: 'Scheduled Time', description: 'Display scheduled delivery time', category: 'order' },
  { id: 'isOrderNote', name: 'Order Note', description: 'Display customer order notes', category: 'order' },

  // Customer Information
  { id: 'isCustomerName', name: 'Customer Name', description: 'Display customer name', category: 'customer' },
  { id: 'isCustomerPhone', name: 'Customer Phone', description: 'Display customer phone number', category: 'customer' },
  { id: 'isCustomerAddress', name: 'Customer Address', description: 'Display delivery address', category: 'customer' },
  { id: 'isDeliveryNote', name: 'Delivery Note', description: 'Display delivery instructions', category: 'customer' },

  // Product Information
  { id: 'isProductInfo', name: 'Product Information', description: 'Display product details', category: 'products', isRequired: true },
  { id: 'isProductName', name: 'Product Names', description: 'Display product names', category: 'products', dependsOn: ['isProductInfo'] },
  { id: 'isProductQuantity', name: 'Product Quantities', description: 'Display product quantities', category: 'products', dependsOn: ['isProductInfo'] },
  { id: 'isProductPrice', name: 'Product Prices', description: 'Display individual product prices', category: 'products', dependsOn: ['isProductInfo'] },
  { id: 'isProductNote', name: 'Product Notes', description: 'Display product customization notes', category: 'products', dependsOn: ['isProductInfo'] },
  { id: 'isProductAttributes', name: 'Product Attributes', description: 'Display product toppings/options', category: 'products', dependsOn: ['isProductInfo'] },
  { id: 'isProductSubAttributes', name: 'Sub Attributes', description: 'Display detailed attribute values', category: 'products', dependsOn: ['isProductAttributes'] },

  // Pricing & Totals
  { id: 'isSubtotal', name: 'Subtotal', description: 'Display order subtotal', category: 'totals' },
  { id: 'isDeliveryFees', name: 'Delivery Fees', description: 'Display delivery charges', category: 'totals' },
  { id: 'isTaxValue', name: 'Tax Amount', description: 'Display tax amount', category: 'totals' },
  { id: 'isDiscount', name: 'Discount', description: 'Display discount amount', category: 'totals' },
  { id: 'isTotal', name: 'Total Amount', description: 'Display final total', category: 'totals', isRequired: true },

  // Footer Section
  { id: 'isTaxNumber', name: 'Tax Number', description: 'Display company tax number', category: 'footer' },
  { id: 'isThankYouMessage', name: 'Thank You Message', description: 'Display thank you message', category: 'footer' },
  { id: 'isContactInfo', name: 'Contact Information', description: 'Display contact details', category: 'footer' },
  { id: 'isBarcode', name: 'Barcode', description: 'Display order barcode', category: 'footer' },
  { id: 'isQRCode', name: 'QR Code', description: 'Display order QR code', category: 'footer' },

  // Additional Options
  { id: 'isPaid', name: 'Payment Status', description: 'Display payment status', category: 'options' }
];

export const useTemplateBuilderStore = create<TemplateBuilderState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentTemplate: undefined,
      components: [],
      toggleConfig: defaultToggleConfig,
      availableSections: defaultAvailableSections,
      categories: [],
      canvasSettings: defaultCanvasSettings,
      printSettings: defaultPrintSettings,
      selectedComponentId: undefined,
      multiSelection: [],
      isPreviewMode: false,
      isDragging: false,
      isResizing: false,
      zoom: 1,
      activePanel: 'toggles', // Start with toggle panel
      showGrid: true,
      showRulers: false,
      showGuides: false,
      isToggleMode: true, // Start in toggle mode
      selectedCategory: 'all',
      history: [],
      historyIndex: -1,
      hasUnsavedChanges: false,
      clipboardComponents: [],
      undoStack: [],
      redoStack: [],
      groupedComponents: {},
      lockedComponents: [],
      hiddenComponents: [],
      collaborators: [],
      cursorPositions: {},
      previewData: undefined,
      isLoading: false,
      isSaving: false,
      availablePrinters: [],
      selectedPrinterId: undefined,
      isLoadingPrinters: false,
      printerError: undefined,

      // Actions
      setCurrentTemplate: (template) => {
        set({
          currentTemplate: template,
          components: template?.designData?.components || [],
          toggleConfig: template?.designData?.toggleConfig || defaultToggleConfig,
          canvasSettings: template?.canvasSettings || defaultCanvasSettings,
          printSettings: template?.printSettings || defaultPrintSettings,
          selectedComponentId: undefined,
          hasUnsavedChanges: false
        });
      },

      setComponents: (components) => {
        set({ components, hasUnsavedChanges: true });
      },

      addComponent: (componentType, position) => {
        const newComponent: TemplateComponent = {
          id: `temp-${Date.now()}`, // Temporary ID until saved to backend
          type: componentType,
          name: `${componentType} Component`,
          position,
          properties: {},
          styles: {},
          zIndex: get().components.length + 1,
          conditions: [],
          transformations: [],
          isLocked: false,
          isVisible: true,
          sortOrder: get().components.length
        };

        set((state) => ({
          components: [...state.components, newComponent],
          selectedComponentId: newComponent.id,
          hasUnsavedChanges: true
        }));
      },

      updateComponent: (id, updates) => {
        set((state) => ({
          components: state.components.map(component =>
            component.id === id
              ? { ...component, ...updates }
              : component
          ),
          hasUnsavedChanges: true
        }));
      },

      removeComponent: (id) => {
        set((state) => ({
          components: state.components.filter(component => component.id !== id),
          selectedComponentId: state.selectedComponentId === id ? undefined : state.selectedComponentId,
          hasUnsavedChanges: true
        }));
      },

      selectComponent: (id, multiSelect = false) => {
        if (multiSelect) {
          set((state) => ({
            multiSelection: id ? [...state.multiSelection, id] : [],
            selectedComponentId: id
          }));
        } else {
          set({ selectedComponentId: id, multiSelection: [] });
        }
      },

      selectMultiple: (ids) => {
        set({ multiSelection: ids });
      },

      addToSelection: (id) => {
        set((state) => ({
          multiSelection: [...state.multiSelection, id]
        }));
      },

      removeFromSelection: (id) => {
        set((state) => ({
          multiSelection: state.multiSelection.filter(i => i !== id)
        }));
      },

      selectAll: () => {
        const components = get().components;
        set({ multiSelection: components.map(c => c.id) });
      },

      clearSelection: () => {
        set({ selectedComponentId: undefined, multiSelection: [] });
      },

      invertSelection: () => {
        const state = get();
        const allIds = state.components.map(c => c.id);
        const newSelection = allIds.filter(id => !state.multiSelection.includes(id));
        set({ multiSelection: newSelection });
      },

      duplicateComponents: (ids) => {
        // TODO: Implement duplication logic
        console.log('Duplicate components:', ids);
      },

      deleteComponents: (ids) => {
        set((state) => ({
          components: state.components.filter(c => !ids.includes(c.id)),
          selectedComponentId: ids.includes(state.selectedComponentId || '') ? undefined : state.selectedComponentId,
          multiSelection: state.multiSelection.filter(id => !ids.includes(id)),
          hasUnsavedChanges: true
        }));
      },

      copyComponents: (ids) => {
        const state = get();
        const toCopy = state.components.filter(c => ids.includes(c.id));
        set({ clipboardComponents: toCopy });
      },

      pasteComponents: () => {
        // TODO: Implement paste logic
        console.log('Paste components');
      },

      groupComponents: (ids) => {
        // TODO: Implement grouping logic
        console.log('Group components:', ids);
      },

      ungroupComponents: (groupId) => {
        // TODO: Implement ungrouping logic
        console.log('Ungroup components:', groupId);
      },

      lockComponents: (ids) => {
        set((state) => ({
          lockedComponents: [...new Set([...state.lockedComponents, ...ids])]
        }));
      },

      unlockComponents: (ids) => {
        set((state) => ({
          lockedComponents: state.lockedComponents.filter(id => !ids.includes(id))
        }));
      },

      hideComponents: (ids) => {
        set((state) => ({
          hiddenComponents: [...new Set([...state.hiddenComponents, ...ids])]
        }));
      },

      showComponents: (ids) => {
        set((state) => ({
          hiddenComponents: state.hiddenComponents.filter(id => !ids.includes(id))
        }));
      },

      // Alignment methods (stub implementations)
      alignLeft: (ids) => { console.log('Align left:', ids); },
      alignCenter: (ids) => { console.log('Align center:', ids); },
      alignRight: (ids) => { console.log('Align right:', ids); },
      alignTop: (ids) => { console.log('Align top:', ids); },
      alignMiddle: (ids) => { console.log('Align middle:', ids); },
      alignBottom: (ids) => { console.log('Align bottom:', ids); },
      distributeHorizontally: (ids) => { console.log('Distribute horizontally:', ids); },
      distributeVertically: (ids) => { console.log('Distribute vertically:', ids); },

      // Z-index methods (stub implementations)
      bringToFront: (ids) => { console.log('Bring to front:', ids); },
      sendToBack: (ids) => { console.log('Send to back:', ids); },
      bringForward: (ids) => { console.log('Bring forward:', ids); },
      sendBackward: (ids) => { console.log('Send backward:', ids); },

      // Undo/Redo
      undo: () => {
        const state = get();
        if (state.historyIndex > 0) {
          set({
            historyIndex: state.historyIndex - 1,
            hasUnsavedChanges: true
          });
        }
      },

      redo: () => {
        const state = get();
        if (state.historyIndex < state.history.length - 1) {
          set({
            historyIndex: state.historyIndex + 1,
            hasUnsavedChanges: true
          });
        }
      },

      pushToUndoStack: (action) => {
        const state = get();
        set({
          history: [...state.history.slice(0, state.historyIndex + 1), action],
          historyIndex: state.historyIndex + 1
        });
      },

      setActivePanel: (panel) => {
        set({ activePanel: panel });
      },

      toggleGrid: () => {
        set((state) => ({ showGrid: !state.showGrid }));
      },

      toggleRulers: () => {
        set((state) => ({ showRulers: !state.showRulers }));
      },

      toggleGuides: () => {
        set((state) => ({ showGuides: !state.showGuides }));
      },

      setError: (error) => {
        set({ error });
      },

      setCategories: (categories) => {
        set({ categories });
      },

      updateCanvasSettings: (settings) => {
        set((state) => ({
          canvasSettings: { ...state.canvasSettings, ...settings },
          hasUnsavedChanges: true
        }));
      },

      setPrintSettings: (settings) => {
        set((state) => ({
          printSettings: { ...state.printSettings, ...settings },
          hasUnsavedChanges: true
        }));
      },

      setPreviewMode: (enabled) => {
        set({ isPreviewMode: enabled, selectedComponentId: enabled ? undefined : get().selectedComponentId });
      },

      setDragging: (dragging) => {
        set({ isDragging: dragging });
      },

      setZoom: (zoom) => {
        set({ zoom: Math.max(0.25, Math.min(3, zoom)) }); // Clamp between 25% and 300%
      },

      setPreviewData: (data) => {
        set({ previewData: data });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setSaving: (saving) => {
        set({ isSaving: saving });
      },

      // Printer actions
      setAvailablePrinters: (printers) => {
        set({ availablePrinters: printers });
      },

      setSelectedPrinterId: (printerId) => {
        set({ selectedPrinterId: printerId });
      },

      setLoadingPrinters: (loading) => {
        set({ isLoadingPrinters: loading });
      },

      setPrinterError: (error) => {
        set({ printerError: error });
      },

      fetchPrinters: async () => {
        try {
          set({ isLoadingPrinters: true, printerError: undefined });

          // Get printers directly from PrinterMaster for real-time status
          const response = await fetch('http://127.0.0.1:8182/printers');

          if (!response.ok) {
            throw new Error('Failed to fetch printers from PrinterMaster');
          }

          const data = await response.json();
          let printers = data.data || data;

          // Transform PrinterMaster format to expected format
          printers = printers.map((printer: any) => ({
            id: printer.id,
            name: printer.name,
            type: printer.type,
            status: printer.status === 'online' ? 'ready' : 'offline',
            isOnline: printer.status === 'online',
            capabilities: printer.capabilities || (['cut', 'paper_cut', 'thermal']), // Default thermal capabilities including cut
            location: printer.location || ''
          }));

          set({ availablePrinters: printers });
        } catch (error) {
          set({ printerError: error instanceof Error ? error.message : 'Failed to load printers' });
        } finally {
          set({ isLoadingPrinters: false });
        }
      },

      getComponentById: (id) => {
        return get().components.find(component => component.id === id);
      },

      markAsChanged: () => {
        set({ hasUnsavedChanges: true });
      },

      addToHistory: () => {
        const state = get();
        const newHistoryItem = {
          components: [...state.components],
          canvasSettings: { ...state.canvasSettings },
          timestamp: Date.now()
        };
        set({
          history: [...state.history.slice(0, state.historyIndex + 1), newHistoryItem],
          historyIndex: state.historyIndex + 1
        });
      },

      setResizing: (resizing) => {
        set({ isResizing: resizing });
      },

      // NEW: Toggle-based methods
      setToggleMode: (enabled) => {
        set({
          isToggleMode: enabled,
          activePanel: enabled ? 'toggles' : 'components'
        });
      },

      updateToggleConfig: (updates) => {
        set((state) => ({
          toggleConfig: { ...state.toggleConfig, ...updates },
          hasUnsavedChanges: true
        }));
      },

      updateEditableContent: (updates) => {
        set((state) => ({
          toggleConfig: {
            ...state.toggleConfig,
            content: { ...state.toggleConfig.content, ...updates }
          },
          hasUnsavedChanges: true
        }));
      },

      updateContentStyle: (section, style) => {
        set((state) => {
          const contentKey = `${section}Style` as keyof TemplateEditableContent;
          const currentStyle = state.toggleConfig.content[contentKey] as TextStyle;

          return {
            toggleConfig: {
              ...state.toggleConfig,
              content: {
                ...state.toggleConfig.content,
                [contentKey]: { ...currentStyle, ...style }
              }
            },
            hasUnsavedChanges: true
          };
        });
      },

      toggleSection: (sectionId) => {
        set((state) => ({
          toggleConfig: {
            ...state.toggleConfig,
            [sectionId]: !state.toggleConfig[sectionId]
          },
          hasUnsavedChanges: true
        }));
      },

      resetToggleConfig: () => {
        set({
          toggleConfig: { ...defaultToggleConfig },
          hasUnsavedChanges: true
        });
      },

      setAvailableSections: (sections) => {
        set({ availableSections: sections });
      },

      setSelectedCategory: (category) => {
        set({ selectedCategory: category });
      },

      generateTemplateFromToggles: () => {
        const state = get();
        const { toggleConfig } = state;
        const { content } = toggleConfig;
        const components: TemplateComponent[] = [];
        let yPosition = 20;
        let componentIndex = 0;

        const createComponent = (type: ComponentType, name: string, properties: any = {}, height = 30, style?: TextStyle): TemplateComponent => {
          const component: TemplateComponent = {
            id: `toggle-${type}-${componentIndex++}`,
            type,
            name,
            position: { x: 10, y: yPosition, width: 270, height },
            properties: {
              textAlign: style?.textAlign || 'left',
              fontSize: style?.fontSize || 12,
              fontWeight: style?.fontWeight || 'normal',
              textTransform: style?.textTransform || 'none',
              ...properties
            },
            styles: {
              color: style?.color || '#000000',
              backgroundColor: style?.backgroundColor || 'transparent'
            },
            zIndex: componentIndex,
            conditions: [],
            transformations: [],
            isLocked: false,
            isVisible: true,
            sortOrder: componentIndex
          };
          yPosition += height + 5;
          return component;
        };

        // Header Section
        if (toggleConfig.isLogo) {
          components.push(createComponent('logo', 'Company Logo', {
            fit: 'contain',
            text: content.logoText
          }, 40, content.headerStyle));
        }
        if (toggleConfig.isCompanyName) {
          components.push(createComponent('text', 'Company Name', {
            text: content.companyName
          }, 30, content.headerStyle));
        }
        if (toggleConfig.isCompanyPhone) {
          components.push(createComponent('text', 'Company Phone', {
            text: content.companyPhone
          }, 25, content.headerStyle));
        }
        if (toggleConfig.isBranchName) {
          components.push(createComponent('text', 'Branch Name', {
            text: content.branchName
          }, 25, content.headerStyle));
        }
        if (toggleConfig.isBranchAddress) {
          components.push(createComponent('text', 'Branch Address', {
            text: content.branchAddress
          }, 25, content.headerStyle));
        }

        // Add separator
        if (components.length > 0) {
          components.push(createComponent('line', 'Header Separator', { character: '-' }, 10));
        }

        // Order Information
        if (toggleConfig.isOrderNumber) {
          components.push(createComponent('text', 'Order Number', {
            text: `${content.orderNumberLabel} ${content.orderNumberFormat}`
          }, 25, content.orderStyle));
        }
        if (toggleConfig.isOrderDate) {
          components.push(createComponent('text', 'Order Date', {
            text: `${content.orderDateLabel} ${content.dateFormat}`
          }, 25, content.orderStyle));
        }
        if (toggleConfig.isOrderTime) {
          components.push(createComponent('text', 'Order Time', {
            text: `${content.orderTimeLabel} ${content.timeFormat}`
          }, 25, content.orderStyle));
        }
        if (toggleConfig.isOrderType) {
          components.push(createComponent('text', 'Order Type', {
            text: `${content.orderTypeLabel} {{order.type}}`
          }, 25, content.orderStyle));
        }
        if (toggleConfig.isOrderSource) {
          components.push(createComponent('text', 'Order Source', {
            text: `${content.orderSourceLabel} {{order.source}}`
          }, 25, content.orderStyle));
        }

        // Customer Information
        if (toggleConfig.isCustomerName || toggleConfig.isCustomerPhone || toggleConfig.isCustomerAddress) {
          components.push(createComponent('line', 'Customer Separator', { character: '-' }, 10));

          if (toggleConfig.isCustomerName) {
            components.push(createComponent('text', 'Customer Name', {
              text: `${content.customerNameLabel} {{customer.name}}`
            }, 25, content.customerStyle));
          }
          if (toggleConfig.isCustomerPhone) {
            components.push(createComponent('text', 'Customer Phone', {
              text: `${content.customerPhoneLabel} {{customer.phone}}`
            }, 25, content.customerStyle));
          }
          if (toggleConfig.isCustomerAddress) {
            components.push(createComponent('text', 'Customer Address', {
              text: `${content.customerAddressLabel} {{customer.address}}`
            }, 25, content.customerStyle));
          }
        }

        // Products Section
        if (toggleConfig.isProductInfo) {
          components.push(createComponent('line', 'Products Separator', { character: '-' }, 10));
          components.push(createComponent('text', 'Products Header', {
            text: content.productsHeaderText
          }, 30, { ...content.productsStyle, fontWeight: 'bold', textAlign: 'center' }));

          // Product table
          const tableColumns = [];
          if (toggleConfig.isProductQuantity) tableColumns.push(content.productQuantityHeader);
          if (toggleConfig.isProductName) tableColumns.push(content.productNameHeader);
          if (toggleConfig.isProductPrice) tableColumns.push(content.productPriceHeader);

          components.push(createComponent('table', 'Products Table', {
            dataSource: 'order.items',
            columns: tableColumns
          }, 100, content.productsStyle));
        }

        // Totals Section
        components.push(createComponent('line', 'Totals Separator', { character: '-' }, 10));

        if (toggleConfig.isSubtotal) {
          components.push(createComponent('text', 'Subtotal', {
            text: `${content.subtotalLabel} {{order.subtotal | currency}}`
          }, 25, content.totalsStyle));
        }
        if (toggleConfig.isDeliveryFees) {
          components.push(createComponent('text', 'Delivery Fees', {
            text: `${content.deliveryFeesLabel} {{order.deliveryFee | currency}}`
          }, 25, content.totalsStyle));
        }
        if (toggleConfig.isTaxValue) {
          components.push(createComponent('text', 'Tax', {
            text: `${content.taxValueLabel} {{order.tax | currency}}`
          }, 25, content.totalsStyle));
        }
        if (toggleConfig.isDiscount) {
          components.push(createComponent('text', 'Discount', {
            text: `${content.discountLabel} -{{order.discount | currency}}`
          }, 25, content.totalsStyle));
        }
        if (toggleConfig.isTotal) {
          components.push(createComponent('text', 'Total', {
            text: `${content.totalLabel} {{order.total | currency}}`
          }, 30, { ...content.totalsStyle, fontWeight: 'bold', fontSize: 14 }));
        }

        // Footer Section
        if (toggleConfig.isThankYouMessage) {
          components.push(createComponent('spacer', 'Footer Spacer', {}, 10));
          components.push(createComponent('text', 'Thank You Message', {
            text: content.thankYouMessage
          }, 25, content.footerStyle));
        }

        if (toggleConfig.isContactInfo) {
          components.push(createComponent('text', 'Contact Info', {
            text: content.contactInfo
          }, 25, content.footerStyle));
        }

        if (toggleConfig.isTaxNumber) {
          components.push(createComponent('text', 'Tax Number', {
            text: `Tax ID: ${content.taxNumber}`
          }, 25, content.footerStyle));
        }

        if (toggleConfig.isBarcode) {
          components.push(createComponent('barcode', 'Order Barcode', {
            data: content.barcodeContent,
            barcodeType: 'CODE128',
            showText: true
          }, 50, content.footerStyle));
        }

        if (toggleConfig.isQRCode) {
          components.push(createComponent('qr', 'Order QR Code', {
            data: content.qrCodeContent
          }, 60, content.footerStyle));
        }

        return components;
      },

      reset: () => {
        set({
          currentTemplate: undefined,
          components: [],
          toggleConfig: defaultToggleConfig,
          availableSections: defaultAvailableSections,
          selectedComponentId: undefined,
          multiSelection: [],
          canvasSettings: defaultCanvasSettings,
          printSettings: defaultPrintSettings,
          isPreviewMode: false,
          isDragging: false,
          isResizing: false,
          zoom: 1,
          activePanel: 'toggles',
          showGrid: true,
          showRulers: false,
          showGuides: false,
          isToggleMode: true,
          selectedCategory: 'all',
          history: [],
          historyIndex: -1,
          hasUnsavedChanges: false,
          clipboardComponents: [],
          undoStack: [],
          redoStack: [],
          groupedComponents: {},
          lockedComponents: [],
          hiddenComponents: [],
          collaborators: [],
          cursorPositions: {},
          previewData: undefined,
          isLoading: false,
          isSaving: false,
          availablePrinters: [],
          selectedPrinterId: undefined,
          isLoadingPrinters: false,
          printerError: undefined
        });
      }
    }),
    {
      name: 'template-builder-store'
    }
  )
);