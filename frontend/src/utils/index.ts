export const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatDate = (date: string | Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

export const formatDateTime = (date: string | Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

// Enhanced SKU generation with multiple strategies
export const generateSKU = (options?: {
  prefix?: string;
  category?: string;
  brand?: string;
  strategy?: 'simple' | 'category-brand' | 'timestamp' | 'sequential';
}) => {
  const {
    prefix = 'SKU',
    category = '',
    brand = '',
    strategy = 'simple'
  } = options || {};

  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();

  switch (strategy) {
    case 'category-brand':
      const catCode = category.substring(0, 3).toUpperCase();
      const brandCode = brand.substring(0, 3).toUpperCase();
      return `${catCode}${brandCode}${timestamp}${random}`;
    
    case 'timestamp':
      const year = new Date().getFullYear().toString().slice(-2);
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const day = new Date().getDate().toString().padStart(2, '0');
      return `${prefix}${year}${month}${day}${random}`;
    
    case 'sequential':
      // This would typically use a counter from the backend
      const counter = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      return `${prefix}-${counter}`;
    
    case 'simple':
    default:
      return `${prefix}-${timestamp}-${random}`;
  }
};

// Enhanced barcode generation with different formats
export const generateBarcode = (options?: {
  format?: 'EAN13' | 'UPC' | 'CODE128' | 'CUSTOM';
  prefix?: string;
}) => {
  const { format = 'EAN13', prefix = '' } = options || {};

  switch (format) {
    case 'EAN13':
      // Generate 13-digit EAN barcode
      const countryCode = '123'; // Example country code
      const manufacturerCode = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
      const productCode = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      const checkDigit = calculateEAN13CheckDigit(countryCode + manufacturerCode + productCode);
      return countryCode + manufacturerCode + productCode + checkDigit;
    
    case 'UPC':
      // Generate 12-digit UPC barcode
      const upcBase = Math.floor(Math.random() * 99999999999).toString().padStart(11, '0');
      const upcCheck = calculateUPCCheckDigit(upcBase);
      return upcBase + upcCheck;
    
    case 'CODE128':
      // Generate alphanumeric Code 128
      const code128 = prefix + Math.random().toString(36).substring(2, 12).toUpperCase();
      return code128;
    
    case 'CUSTOM':
    default:
      // Custom format with timestamp and random
      return prefix + Date.now().toString().slice(-8) + Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  }
};

// Calculate EAN13 check digit
const calculateEAN13CheckDigit = (code: string): string => {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
};

// Calculate UPC check digit
const calculateUPCCheckDigit = (code: string): string => {
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(code[i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
};

// Generate product code based on category and brand
export const generateProductCode = (category: string, brand: string, sequence?: number) => {
  const catCode = category.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
  const brandCode = brand.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
  const seqCode = sequence ? sequence.toString().padStart(4, '0') : Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  
  return `${catCode}${brandCode}${seqCode}`;
};

// Validate SKU format
export const validateSKU = (sku: string): boolean => {
  // Basic SKU validation - alphanumeric with hyphens and underscores
  const skuRegex = /^[A-Z0-9\-_]{3,20}$/;
  return skuRegex.test(sku);
};

// Validate barcode format
export const validateBarcode = (barcode: string, format?: string): boolean => {
  switch (format) {
    case 'EAN13':
      return /^\d{13}$/.test(barcode);
    case 'UPC':
      return /^\d{12}$/.test(barcode);
    case 'CODE128':
      return /^[A-Z0-9]{8,20}$/.test(barcode);
    default:
      return /^[A-Z0-9]{8,20}$/.test(barcode);
  }
};

export const calculateProfitMargin = (costPrice: number, sellingPrice: number) => {
  if (costPrice === 0) return 0;
  return ((sellingPrice - costPrice) / costPrice * 100);
};

export const getStockStatus = (currentStock: number, minimumStock: number) => {
  if (currentStock === 0) return 'out_of_stock';
  if (currentStock <= minimumStock) return 'low_stock';
  return 'in_stock';
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const validateEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone: string) => {
  const re = /^\+?[\d\s\-\(\)]+$/;
  return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

export const downloadCSV = (data: any[], filename: string) => {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
};