export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  permissions: string[];
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  profileImage?: string;
  lastLogin?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductVariant {
  _id?: string;
  name: string;
  value: string;
  additionalPrice: number;
}

export interface ProductImage {
  url: string;
  alt?: string;
  isPrimary: boolean;
  uploadedAt?: string;
}

export interface ProductSpecifications {
  weight?: {
    value: number;
    unit: 'kg' | 'gm' | 'lbs' | 'oz';
  };
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'mm' | 'inch' | 'ft';
  };
  color?: string;
  material?: string;
  size?: string;
  model?: string;
  warranty?: {
    period: number;
    unit: 'days' | 'months' | 'years';
  };
}

export interface Product {
  _id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category: Category | string;
  brand: string;
  unit: 'pcs' | 'kg' | 'gm' | 'ltr' | 'ml' | 'mtr' | 'cm' | 'box' | 'pack' | 'dozen' | 'pair' | 'set';
  costPrice: number;
  sellingPrice: number;
  minimumStock: number;
  currentStock: number;
  stockLocations: StockLocation[];
  images: ProductImage[];
  variants: ProductVariant[];
  specifications?: ProductSpecifications;
  supplier?: Supplier | string;
  tax: number;
  isActive: boolean;
  isPerishable: boolean;
  expiryDate?: string;
  manufacturingDate?: string;
  batchNumber?: string;
  tags: string[];
  notes?: string;
  profitMargin?: string;
  profitAmount?: number;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  stockValue?: number;
  primaryImage?: ProductImage;
  variantCount?: number;
  totalSold: number;
  totalPurchased: number;
  averageRating?: number;
  reviewCount: number;
  lastStockUpdate: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
  updatedBy?: User;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  parentCategory?: Category | string;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  productCount?: number;
  subcategories?: Category[];
  subcategoryCount?: number;
  createdBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  _id: string;
  name: string;
  email: string;
  phone: string;
  contactPerson: {
    name: string;
    phone?: string;
    email?: string;
  };
  address: Address;
  taxNumber?: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    swift?: string;
  };
  paymentTerms: string;
  creditLimit: number;
  currentBalance: number;
  rating?: number;
  notes?: string;
  isActive: boolean;
  lastOrderDate?: string;
  totalOrders: number;
  totalPurchaseAmount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
}

export interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  type: 'individual' | 'business';
  businessName?: string;
  address: Address;
  billingAddress?: Address & { sameAsAddress: boolean };
  taxNumber?: string;
  customerGroup: 'regular' | 'vip' | 'wholesale' | 'retail';
  discountPercentage: number;
  creditLimit: number;
  currentBalance: number;
  paymentTerms: string;
  isActive: boolean;
  lastOrderDate?: string;
  totalOrders: number;
  totalSalesAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface StockLocation {
  location: Location | string;
  quantity: number;
}

export interface Location {
  _id: string;
  name: string;
  code: string;
  type: 'warehouse' | 'store' | 'outlet' | 'factory' | 'office';
  address?: Address;
  contactPerson?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  isActive: boolean;
  capacity?: number;
  currentUtilization: number;
  utilizationPercentage?: number;
  notes?: string;
  productCount?: number;
  stockValue?: number;
  recentMovements?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
}

export interface Purchase {
  _id: string;
  purchaseOrderNumber: string;
  supplier: Supplier | string;
  items: PurchaseItem[];
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  shippingCost: number;
  grandTotal: number;
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
  paymentMethod?: string;
  paymentTerms: string;
  notes?: string;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
  approvedBy?: User;
  approvedAt?: string;
}

export interface PurchaseItem {
  _id?: string;
  product: Product | string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity: number;
  discount: number;
  tax: number;
}

export interface Sale {
  _id: string;
  invoiceNumber: string;
  customer: Customer | string;
  items: SaleItem[];
  status: 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  saleDate: string;
  dueDate?: string;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  shippingCost: number;
  grandTotal: number;
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid' | 'overdue';
  paymentMethod?: string;
  salesPerson?: User | string;
  notes?: string;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
  totalProfit?: number;
  profitMargin?: string;
}

export interface SaleItem {
  _id?: string;
  product: Product | string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
  tax: number;
  profit?: number;
  profitMargin?: string;
}

export interface Attachment {
  filename: string;
  url: string;
  type: string;
}

export interface StockMovement {
  _id: string;
  product: Product | string;
  type: 'in' | 'out' | 'transfer' | 'adjustment';
  reason: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost?: number;
  totalCost?: number;
  location: {
    from?: Location | string;
    to?: Location | string;
  };
  reference?: {
    type: string;
    id: string;
    number: string;
  };
  notes?: string;
  performedBy: User | string;
  movementDate: string;
  createdAt: string;
}

export interface ActivityLog {
  _id: string;
  user: User | string;
  action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import' | 'approve' | 'reject' | 'cancel';
  resource: 'user' | 'product' | 'category' | 'supplier' | 'customer' | 'purchase' | 'sale' | 'inventory' | 'stock_movement' | 'location' | 'settings' | 'activity_log';
  resourceId?: string;
  description: string;
  changes?: {
    before: any;
    after: any;
  };
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface ActivityLogFilters {
  search?: string;
  user?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: string;
}

export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalSuppliers: number;
  totalCustomers: number;
  pendingPurchases: number;
  recentSales: number;
  inventoryValue: number;
  monthlyRevenue: number;
  monthlyProfit: number;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  brand?: string;
  supplier?: string;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  sortBy?: 'name' | 'sku' | 'brand' | 'costPrice' | 'sellingPrice' | 'currentStock' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface SalesFilters {
  search?: string;
  status?: string;
  customer?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  salesPerson?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PurchaseFilters {
  search?: string;
  status?: string;
  supplier?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductAnalytics {
  totalValue: {
    costValue: number;
    sellingValue: number;
    profitValue: number;
  };
  profitMargin: number;
  stockStatus: string;
  totalSold: number;
  totalPurchased: number;
  averageRating?: number;
  reviewCount: number;
  variantCount: number;
  imageCount: number;
  lastStockUpdate: string;
  stockMovements?: {
    total: number;
    lastWeek: number;
    lastMonth: number;
  };
  performance?: {
    daysSinceCreated: number;
    daysSinceLastUpdate: number;
    daysSinceLastStockUpdate: number | null;
  };
}

export interface ActivityLogStats {
  totalLogs: number;
  actionCounts: {
    create: number;
    read: number;
    update: number;
    delete: number;
    login: number;
    logout: number;
    export: number;
    import: number;
    approve: number;
    reject: number;
    cancel: number;
  };
  resourceCounts: {
    user: number;
    product: number;
    category: number;
    supplier: number;
    customer: number;
    purchase: number;
    sale: number;
    inventory: number;
    stock_movement: number;
    location: number;
    settings: number;
    activity_log: number;
  };
  userCounts: Record<string, { name: string; count: number }>;
  dateRange: {
    start: string | null;
    end: string | null;
  };
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  managerUsers: number;
  staffUsers: number;
  recentlyActive: number;
}

export interface UserActivityStats {
  totalActivities: number;
  recentActivities: number;
  lastActivity?: ActivityLog;
  topActions: { _id: string; count: number }[];
  topResources: { _id: string; count: number }[];
}

export interface InvoiceData {
  invoice: {
    number: string;
    date: string;
    dueDate: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
  };
  company: {
    name: string;
    email: string;
    phone: string;
    address: string;
    logo?: string;
    taxNumber?: string;
  };
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    taxNumber?: string;
  };
  items: {
    product: string;
    sku: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    discount: number;
    tax: number;
    total: number;
  }[];
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    shipping: number;
    grandTotal: number;
  };
  notes?: string;
  createdBy: string;
  salesPerson: string;
}

export interface PurchaseOrderData {
  order: {
    number: string;
    date: string;
    expectedDeliveryDate: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    paymentTerms: string;
  };
  company: {
    name: string;
    email: string;
    phone: string;
    address: string;
    logo?: string;
    taxNumber?: string;
  };
  supplier: {
    name: string;
    email: string;
    phone: string;
    address: string;
    contactPerson: string;
    taxNumber?: string;
  };
  items: {
    product: string;
    sku: string;
    quantity: number;
    receivedQuantity: number;
    unit: string;
    unitPrice: number;
    discount: number;
    tax: number;
    total: number;
  }[];
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    shipping: number;
    grandTotal: number;
  };
  notes?: string;
  createdBy: string;
  approvedBy?: string;
}

export interface SystemSettings {
  company: {
    name: string;
    email: string;
    phone: string;
    address?: Address;
    logo?: string;
    website?: string;
    taxNumber?: string;
  };
  currency: {
    code: string;
    symbol: string;
    position: 'before' | 'after';
  };
  tax: {
    defaultRate: number;
    inclusive: boolean;
    rates: {
      name: string;
      rate: number;
      isDefault: boolean;
    }[];
  };
  inventory: {
    costingMethod: 'fifo' | 'lifo' | 'weighted_average';
    lowStockAlert: boolean;
    negativeStock: boolean;
    autoGenerateSKU: boolean;
    skuPrefix: string;
  };
  notifications: {
    email: {
      enabled: boolean;
      lowStock: boolean;
      newOrder: boolean;
      paymentReminder: boolean;
    };
    sms: {
      enabled: boolean;
      lowStock: boolean;
      newOrder: boolean;
    };
  };
  backup: {
    autoBackup: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    retentionDays: number;
  };
  updatedBy?: User;
  createdAt?: string;
  updatedAt?: string;
}

export interface SystemInfo {
  version: string;
  nodeVersion: string;
  platform: string;
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
  databaseSize: string;
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  lastBackup: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters?: any;
}