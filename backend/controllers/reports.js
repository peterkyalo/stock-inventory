import User from '../models/User.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Supplier from '../models/Supplier.js';
import Customer from '../models/Customer.js';
import Purchase from '../models/Purchase.js';
import Sales from '../models/Sales.js';
import StockMovement from '../models/StockMovement.js';
import Location from '../models/Location.js';
import ActivityLog from '../models/ActivityLog.js';
import { logActivity } from '../middleware/logger.js';

// Get dashboard stats
export const getDashboardStats = async (req, res, next) => {
  try {
    // Get total products
    const totalProducts = await Product.countDocuments({ isActive: true });
    
    // Get low stock products
    const lowStockProducts = await Product.countDocuments({
      $expr: { $lte: ['$currentStock', '$minimumStock'] },
      currentStock: { $gt: 0 },
      isActive: true
    });
    
    // Get out of stock products
    const outOfStockProducts = await Product.countDocuments({
      currentStock: 0,
      isActive: true
    });
    
    // Get total suppliers
    const totalSuppliers = await Supplier.countDocuments({ isActive: true });
    
    // Get total customers
    const totalCustomers = await Customer.countDocuments({ isActive: true });
    
    // Get pending purchases
    const pendingPurchases = await Purchase.countDocuments({ status: 'pending' });
    
    // Get recent sales (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSales = await Sales.countDocuments({
      saleDate: { $gte: thirtyDaysAgo }
    });
    
    // Get total inventory value
    const inventoryValue = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$currentStock', '$costPrice'] } } } }
    ]);
    
    // Get monthly revenue and profit
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const monthlyRevenue = await Sales.aggregate([
      { $match: { saleDate: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    
    // Estimate profit (in a real system, this would be calculated from actual profit data)
    const monthlyProfit = monthlyRevenue[0]?.total * 0.3 || 0; // Assuming 30% profit margin
    
    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalSuppliers,
        totalCustomers,
        pendingPurchases,
        recentSales,
        inventoryValue: inventoryValue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        monthlyProfit
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get inventory report
export const getInventoryReport = async (req, res, next) => {
  try {
    const category = req.query.category || '';
    const status = req.query.status || '';
    const location = req.query.location || '';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build query
    const query = { isActive: true };
    
    if (category) {
      query.category = category;
    }
    
    if (status) {
      if (status === 'low_stock') {
        query.$expr = { $lte: ['$currentStock', '$minimumStock'] };
        query.currentStock = { $gt: 0 };
      } else if (status === 'out_of_stock') {
        query.currentStock = 0;
      } else if (status === 'in_stock') {
        query.$expr = { $gt: ['$currentStock', '$minimumStock'] };
      }
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;

    // Get products
    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('supplier', 'name')
      .sort(sort);

    // Calculate summary statistics
    const summary = {
      totalProducts: products.length,
      totalValue: products.reduce((sum, product) => sum + (product.currentStock * product.costPrice), 0),
      lowStockItems: products.filter(p => p.currentStock <= p.minimumStock && p.currentStock > 0).length,
      outOfStockItems: products.filter(p => p.currentStock === 0).length,
      averageCost: products.length > 0 ? 
        products.reduce((sum, product) => sum + product.costPrice, 0) / products.length : 0,
      averagePrice: products.length > 0 ? 
        products.reduce((sum, product) => sum + product.sellingPrice, 0) / products.length : 0
    };

    // If date range is provided, get movement stats
    if (startDate || endDate) {
      const movementQuery = {};
      
      if (startDate && endDate) {
        movementQuery.movementDate = { $gte: startDate, $lte: endDate };
      } else if (startDate) {
        movementQuery.movementDate = { $gte: startDate };
      } else if (endDate) {
        movementQuery.movementDate = { $lte: endDate };
      }
      
      // Get movement stats by product
      const productMovements = await StockMovement.aggregate([
        { $match: movementQuery },
        {
          $group: {
            _id: '$product',
            in: { $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$quantity', 0] } },
            out: { $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$quantity', 0] } },
            transfer: { $sum: { $cond: [{ $eq: ['$type', 'transfer'] }, '$quantity', 0] } },
            adjustment: { $sum: { $cond: [{ $eq: ['$type', 'adjustment'] }, '$quantity', 0] } },
            total: { $sum: '$quantity' }
          }
        }
      ]);
      
      // Add movement data to products
      const productsWithMovements = products.map(product => {
        const movement = productMovements.find(m => m._id.toString() === product._id.toString());
        return {
          ...product.toObject(),
          movements: movement ? {
            in: movement.in,
            out: movement.out,
            transfer: movement.transfer,
            adjustment: movement.adjustment,
            total: movement.total
          } : null
        };
      });
      
      // Add movement stats to summary
      summary.movementStats = {
        totalIn: productMovements.reduce((sum, m) => sum + m.in, 0),
        totalOut: productMovements.reduce((sum, m) => sum + m.out, 0),
        totalTransfer: productMovements.reduce((sum, m) => sum + m.transfer, 0),
        totalAdjustment: productMovements.reduce((sum, m) => sum + m.adjustment, 0)
      };
      
      return res.status(200).json({
        success: true,
        data: {
          products: productsWithMovements,
          summary
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        products,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get sales report
export const getSalesReport = async (req, res, next) => {
  try {
    const customer = req.query.customer || '';
    const status = req.query.status || '';
    const paymentStatus = req.query.paymentStatus || '';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const salesPerson = req.query.salesPerson || '';
    const groupBy = req.query.groupBy || 'day';

    // Build query
    const query = {};
    
    if (customer) {
      query.customer = customer;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    
    if (startDate && endDate) {
      query.saleDate = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.saleDate = { $gte: startDate };
    } else if (endDate) {
      query.saleDate = { $lte: endDate };
    }
    
    if (salesPerson) {
      query.salesPerson = salesPerson;
    }

    // Get sales
    const sales = await Sales.find(query)
      .populate('customer', 'name email phone type')
      .populate('items.product', 'name sku')
      .populate('salesPerson', 'firstName lastName')
      .sort({ saleDate: -1 });

    // Group sales based on groupBy parameter
    let groupedSales = [];
    
    if (groupBy === 'day') {
      groupedSales = await Sales.aggregate([
        { $match: query },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
            count: { $sum: 1 },
            revenue: { $sum: '$grandTotal' },
            discount: { $sum: '$totalDiscount' },
            tax: { $sum: '$totalTax' }
          }
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: '$_id',
            count: 1,
            revenue: 1,
            discount: 1,
            tax: 1
          }
        }
      ]);
    } else if (groupBy === 'week') {
      groupedSales = await Sales.aggregate([
        { $match: query },
        {
          $group: {
            _id: { 
              $dateToString: { 
                format: '%G-W%V', 
                date: '$saleDate' 
              } 
            },
            weekStart: { 
              $min: { 
                $dateToString: { 
                  format: '%Y-%m-%d', 
                  date: '$saleDate' 
                } 
              } 
            },
            count: { $sum: 1 },
            revenue: { $sum: '$grandTotal' },
            discount: { $sum: '$totalDiscount' },
            tax: { $sum: '$totalTax' }
          }
        },
        { $sort: { weekStart: 1 } }
      ]);
    } else if (groupBy === 'month') {
      groupedSales = await Sales.aggregate([
        { $match: query },
        {
          $group: {
            _id: { 
              $dateToString: { 
                format: '%Y-%m', 
                date: '$saleDate' 
              } 
            },
            count: { $sum: 1 },
            revenue: { $sum: '$grandTotal' },
            discount: { $sum: '$totalDiscount' },
            tax: { $sum: '$totalTax' }
          }
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            month: '$_id',
            count: 1,
            revenue: 1,
            discount: 1,
            tax: 1
          }
        }
      ]);
    } else if (groupBy === 'customer') {
      groupedSales = await Sales.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$customer',
            count: { $sum: 1 },
            revenue: { $sum: '$grandTotal' },
            discount: { $sum: '$totalDiscount' },
            tax: { $sum: '$totalTax' }
          }
        },
        { $sort: { revenue: -1 } },
        {
          $lookup: {
            from: 'customers',
            localField: '_id',
            foreignField: '_id',
            as: 'customerDetails'
          }
        },
        {
          $project: {
            customerName: { $arrayElemAt: ['$customerDetails.name', 0] },
            customerEmail: { $arrayElemAt: ['$customerDetails.email', 0] },
            customerType: { $arrayElemAt: ['$customerDetails.type', 0] },
            count: 1,
            revenue: 1,
            discount: 1,
            tax: 1
          }
        }
      ]);
    } else if (groupBy === 'product') {
      groupedSales = await Sales.aggregate([
        { $match: query },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.totalPrice' },
            discount: { $sum: '$items.discount' },
            tax: { $sum: '$items.tax' }
          }
        },
        { $sort: { revenue: -1 } },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'productDetails'
          }
        },
        {
          $project: {
            productName: { $arrayElemAt: ['$productDetails.name', 0] },
            productSku: { $arrayElemAt: ['$productDetails.sku', 0] },
            quantity: 1,
            revenue: 1,
            discount: 1,
            tax: 1
          }
        }
      ]);
    }

    // Calculate summary statistics
    const summary = {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, sale) => sum + sale.grandTotal, 0),
      totalDiscount: sales.reduce((sum, sale) => sum + sale.totalDiscount, 0),
      totalTax: sales.reduce((sum, sale) => sum + sale.totalTax, 0),
      averageOrderValue: sales.length > 0 ? 
        sales.reduce((sum, sale) => sum + sale.grandTotal, 0) / sales.length : 0,
      statusCounts: {
        draft: sales.filter(s => s.status === 'draft').length,
        confirmed: sales.filter(s => s.status === 'confirmed').length,
        shipped: sales.filter(s => s.status === 'shipped').length,
        delivered: sales.filter(s => s.status === 'delivered').length,
        cancelled: sales.filter(s => s.status === 'cancelled').length,
        returned: sales.filter(s => s.status === 'returned').length
      },
      paymentStatusCounts: {
        unpaid: sales.filter(s => s.paymentStatus === 'unpaid').length,
        partially_paid: sales.filter(s => s.paymentStatus === 'partially_paid').length,
        paid: sales.filter(s => s.paymentStatus === 'paid').length,
        overdue: sales.filter(s => s.paymentStatus === 'overdue').length
      }
    };

    res.status(200).json({
      success: true,
      data: {
        sales,
        groupedSales,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get purchase report
export const getPurchaseReport = async (req, res, next) => {
  try {
    const supplier = req.query.supplier || '';
    const status = req.query.status || '';
    const paymentStatus = req.query.paymentStatus || '';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const groupBy = req.query.groupBy || 'day';

    // Build query
    const query = {};
    
    if (supplier) {
      query.supplier = supplier;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    
    if (startDate && endDate) {
      query.orderDate = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.orderDate = { $gte: startDate };
    } else if (endDate) {
      query.orderDate = { $lte: endDate };
    }

    // Get purchases
    const purchases = await Purchase.find(query)
      .populate('supplier', 'name email phone')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'firstName lastName')
      .sort({ orderDate: -1 });

    // Group purchases based on groupBy parameter
    let groupedPurchases = [];
    
    if (groupBy === 'day') {
      groupedPurchases = await Purchase.aggregate([
        { $match: query },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
            count: { $sum: 1 },
            amount: { $sum: '$grandTotal' },
            discount: { $sum: '$totalDiscount' },
            tax: { $sum: '$totalTax' }
          }
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: '$_id',
            count: 1,
            amount: 1,
            discount: 1,
            tax: 1
          }
        }
      ]);
    } else if (groupBy === 'week') {
      groupedPurchases = await Purchase.aggregate([
        { $match: query },
        {
          $group: {
            _id: { 
              $dateToString: { 
                format: '%G-W%V', 
                date: '$orderDate' 
              } 
            },
            weekStart: { 
              $min: { 
                $dateToString: { 
                  format: '%Y-%m-%d', 
                  date: '$orderDate' 
                } 
              } 
            },
            count: { $sum: 1 },
            amount: { $sum: '$grandTotal' },
            discount: { $sum: '$totalDiscount' },
            tax: { $sum: '$totalTax' }
          }
        },
        { $sort: { weekStart: 1 } }
      ]);
    } else if (groupBy === 'month') {
      groupedPurchases = await Purchase.aggregate([
        { $match: query },
        {
          $group: {
            _id: { 
              $dateToString: { 
                format: '%Y-%m', 
                date: '$orderDate' 
              } 
            },
            count: { $sum: 1 },
            amount: { $sum: '$grandTotal' },
            discount: { $sum: '$totalDiscount' },
            tax: { $sum: '$totalTax' }
          }
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            month: '$_id',
            count: 1,
            amount: 1,
            discount: 1,
            tax: 1
          }
        }
      ]);
    } else if (groupBy === 'supplier') {
      groupedPurchases = await Purchase.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$supplier',
            count: { $sum: 1 },
            amount: { $sum: '$grandTotal' },
            discount: { $sum: '$totalDiscount' },
            tax: { $sum: '$totalTax' }
          }
        },
        { $sort: { amount: -1 } },
        {
          $lookup: {
            from: 'suppliers',
            localField: '_id',
            foreignField: '_id',
            as: 'supplierDetails'
          }
        },
        {
          $project: {
            supplierName: { $arrayElemAt: ['$supplierDetails.name', 0] },
            supplierEmail: { $arrayElemAt: ['$supplierDetails.email', 0] },
            count: 1,
            amount: 1,
            discount: 1,
            tax: 1
          }
        }
      ]);
    } else if (groupBy === 'product') {
      groupedPurchases = await Purchase.aggregate([
        { $match: query },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            quantity: { $sum: '$items.quantity' },
            amount: { $sum: '$items.totalPrice' },
            discount: { $sum: '$items.discount' },
            tax: { $sum: '$items.tax' }
          }
        },
        { $sort: { amount: -1 } },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'productDetails'
          }
        },
        {
          $project: {
            productName: { $arrayElemAt: ['$productDetails.name', 0] },
            productSku: { $arrayElemAt: ['$productDetails.sku', 0] },
            quantity: 1,
            amount: 1,
            discount: 1,
            tax: 1
          }
        }
      ]);
    }

    // Calculate summary statistics
    const summary = {
      totalPurchases: purchases.length,
      totalAmount: purchases.reduce((sum, purchase) => sum + purchase.grandTotal, 0),
      totalDiscount: purchases.reduce((sum, purchase) => sum + purchase.totalDiscount, 0),
      totalTax: purchases.reduce((sum, purchase) => sum + purchase.totalTax, 0),
      averageOrderValue: purchases.length > 0 ? 
        purchases.reduce((sum, purchase) => sum + purchase.grandTotal, 0) / purchases.length : 0,
      statusCounts: {
        draft: purchases.filter(p => p.status === 'draft').length,
        pending: purchases.filter(p => p.status === 'pending').length,
        approved: purchases.filter(p => p.status === 'approved').length,
        ordered: purchases.filter(p => p.status === 'ordered').length,
        partially_received: purchases.filter(p => p.status === 'partially_received').length,
        received: purchases.filter(p => p.status === 'received').length,
        cancelled: purchases.filter(p => p.status === 'cancelled').length
      },
      paymentStatusCounts: {
        unpaid: purchases.filter(p => p.paymentStatus === 'unpaid').length,
        partially_paid: purchases.filter(p => p.paymentStatus === 'partially_paid').length,
        paid: purchases.filter(p => p.paymentStatus === 'paid').length
      }
    };

    res.status(200).json({
      success: true,
      data: {
        purchases,
        groupedPurchases,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get stock movement report
export const getStockMovementReport = async (req, res, next) => {
  try {
    const product = req.query.product || '';
    const type = req.query.type || '';
    const reason = req.query.reason || '';
    const location = req.query.location || '';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const groupBy = req.query.groupBy || 'day';

    // Build query
    const query = {};
    
    if (product) {
      query.product = product;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (reason) {
      query.reason = reason;
    }
    
    if (location) {
      query.$or = [
        { 'location.from': location },
        { 'location.to': location }
      ];
    }
    
    if (startDate && endDate) {
      query.movementDate = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.movementDate = { $gte: startDate };
    } else if (endDate) {
      query.movementDate = { $lte: endDate };
    }

    // Get movements
    const movements = await StockMovement.find(query)
      .populate('product', 'name sku brand unit images')
      .populate('location.from', 'name code type')
      .populate('location.to', 'name code type')
      .populate('performedBy', 'firstName lastName')
      .sort({ movementDate: -1 });

    // Group movements based on groupBy parameter
    let groupedMovements = [];
    
    if (groupBy === 'day') {
      groupedMovements = await StockMovement.aggregate([
        { $match: query },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$movementDate' } },
            in: { $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$quantity', 0] } },
            out: { $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$quantity', 0] } },
            transfer: { $sum: { $cond: [{ $eq: ['$type', 'transfer'] }, '$quantity', 0] } },
            adjustment: { $sum: { $cond: [{ $eq: ['$type', 'adjustment'] }, '$quantity', 0] } },
            total: { $sum: '$quantity' },
            value: { $sum: { $multiply: ['$quantity', '$unitCost'] } }
          }
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: '$_id',
            in: 1,
            out: 1,
            transfer: 1,
            adjustment: 1,
            total: 1,
            value: 1
          }
        }
      ]);
    } else if (groupBy === 'week') {
      groupedMovements = await StockMovement.aggregate([
        { $match: query },
        {
          $group: {
            _id: { 
              $dateToString: { 
                format: '%G-W%V', 
                date: '$movementDate' 
              } 
            },
            weekStart: { 
              $min: { 
                $dateToString: { 
                  format: '%Y-%m-%d', 
                  date: '$movementDate' 
                } 
              } 
            },
            in: { $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$quantity', 0] } },
            out: { $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$quantity', 0] } },
            transfer: { $sum: { $cond: [{ $eq: ['$type', 'transfer'] }, '$quantity', 0] } },
            adjustment: { $sum: { $cond: [{ $eq: ['$type', 'adjustment'] }, '$quantity', 0] } },
            total: { $sum: '$quantity' },
            value: { $sum: { $multiply: ['$quantity', '$unitCost'] } }
          }
        },
        { $sort: { weekStart: 1 } }
      ]);
    } else if (groupBy === 'month') {
      groupedMovements = await StockMovement.aggregate([
        { $match: query },
        {
          $group: {
            _id: { 
              $dateToString: { 
                format: '%Y-%m', 
                date: '$movementDate' 
              } 
            },
            in: { $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$quantity', 0] } },
            out: { $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$quantity', 0] } },
            transfer: { $sum: { $cond: [{ $eq: ['$type', 'transfer'] }, '$quantity', 0] } },
            adjustment: { $sum: { $cond: [{ $eq: ['$type', 'adjustment'] }, '$quantity', 0] } },
            total: { $sum: '$quantity' },
            value: { $sum: { $multiply: ['$quantity', '$unitCost'] } }
          }
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            month: '$_id',
            in: 1,
            out: 1,
            transfer: 1,
            adjustment: 1,
            total: 1,
            value: 1
          }
        }
      ]);
    } else if (groupBy === 'product') {
      groupedMovements = await StockMovement.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$product',
            in: { $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$quantity', 0] } },
            out: { $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$quantity', 0] } },
            transfer: { $sum: { $cond: [{ $eq: ['$type', 'transfer'] }, '$quantity', 0] } },
            adjustment: { $sum: { $cond: [{ $eq: ['$type', 'adjustment'] }, '$quantity', 0] } },
            total: { $sum: '$quantity' },
            value: { $sum: { $multiply: ['$quantity', '$unitCost'] } }
          }
        },
        { $sort: { total: -1 } },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'productDetails'
          }
        },
        {
          $project: {
            productName: { $arrayElemAt: ['$productDetails.name', 0] },
            productSku: { $arrayElemAt: ['$productDetails.sku', 0] },
            in: 1,
            out: 1,
            transfer: 1,
            adjustment: 1,
            total: 1,
            value: 1
          }
        }
      ]);
    } else if (groupBy === 'type') {
      groupedMovements = await StockMovement.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            quantity: { $sum: '$quantity' },
            value: { $sum: { $multiply: ['$quantity', '$unitCost'] } }
          }
        },
        { $sort: { quantity: -1 } },
        {
          $project: {
            type: '$_id',
            count: 1,
            quantity: 1,
            value: 1
          }
        }
      ]);
    } else if (groupBy === 'reason') {
      groupedMovements = await StockMovement.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$reason',
            count: { $sum: 1 },
            quantity: { $sum: '$quantity' },
            value: { $sum: { $multiply: ['$quantity', '$unitCost'] } }
          }
        },
        { $sort: { quantity: -1 } },
        {
          $project: {
            reason: '$_id',
            count: 1,
            quantity: 1,
            value: 1
          }
        }
      ]);
    }

    // Calculate summary statistics
    const summary = {
      totalMovements: movements.length,
      inMovements: movements.filter(m => m.type === 'in').length,
      outMovements: movements.filter(m => m.type === 'out').length,
      transferMovements: movements.filter(m => m.type === 'transfer').length,
      adjustmentMovements: movements.filter(m => m.type === 'adjustment').length,
      totalQuantityIn: movements.filter(m => m.type === 'in').reduce((sum, m) => sum + m.quantity, 0),
      totalQuantityOut: movements.filter(m => m.type === 'out').reduce((sum, m) => sum + m.quantity, 0),
      totalValue: movements.reduce((sum, m) => sum + (m.totalCost || 0), 0),
      reasonCounts: movements.reduce((counts, m) => {
        counts[m.reason] = (counts[m.reason] || 0) + 1;
        return counts;
      }, {})
    };

    res.status(200).json({
      success: true,
      data: {
        movements,
        groupedMovements,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get financial report
export const getFinancialReport = async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const period = req.query.period || 'month';
    const includeExpenses = req.query.includeExpenses === 'true';

    // Set default date range if not provided
    const defaultStartDate = new Date();
    defaultStartDate.setMonth(defaultStartDate.getMonth() - 12);
    
    const effectiveStartDate = startDate || defaultStartDate;
    const effectiveEndDate = endDate || new Date();

    // Format for grouping
    let dateFormat;
    switch (period) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%G-W%V';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'quarter':
        dateFormat = '%Y-Q%q';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m';
    }

    // Get sales data
    const salesData = await Sales.aggregate([
      {
        $match: {
          saleDate: { $gte: effectiveStartDate, $lte: effectiveEndDate },
          status: { $nin: ['cancelled', 'returned'] }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$saleDate' } },
          revenue: { $sum: '$grandTotal' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get purchase data if includeExpenses is true
    let purchaseData = [];
    if (includeExpenses) {
      purchaseData = await Purchase.aggregate([
        {
          $match: {
            orderDate: { $gte: effectiveStartDate, $lte: effectiveEndDate },
            status: { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: '$orderDate' } },
            expenses: { $sum: '$grandTotal' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
    }

    // Combine data
    const groupedData = [];
    const allPeriods = new Set([...salesData.map(s => s._id), ...purchaseData.map(p => p._id)]);
    
    allPeriods.forEach(period => {
      const salesEntry = salesData.find(s => s._id === period) || { revenue: 0, orders: 0 };
      const purchaseEntry = purchaseData.find(p => p._id === period) || { expenses: 0, orders: 0 };
      
      groupedData.push({
        [period.includes('W') ? 'weekStart' : 
          period.includes('Q') ? 'quarter' : 
          period.includes('-') && period.length === 7 ? 'month' : 
          period.length === 4 ? 'year' : 'date']: period,
        revenue: salesEntry.revenue,
        expenses: purchaseEntry.expenses,
        profit: salesEntry.revenue - purchaseEntry.expenses,
        orders: salesEntry.orders
      });
    });

    // Calculate summary statistics
    const totalRevenue = salesData.reduce((sum, entry) => sum + entry.revenue, 0);
    const totalExpenses = purchaseData.reduce((sum, entry) => sum + entry.expenses, 0);
    const totalProfit = totalRevenue - totalExpenses;
    const totalSales = salesData.reduce((sum, entry) => sum + entry.orders, 0);
    const totalPurchases = purchaseData.reduce((sum, entry) => sum + entry.orders, 0);
    
    const summary = {
      totalRevenue,
      totalExpenses,
      totalProfit,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      totalSales,
      totalPurchases,
      averageOrderValue: totalSales > 0 ? totalRevenue / totalSales : 0,
      dateRange: {
        start: effectiveStartDate,
        end: effectiveEndDate
      }
    };

    res.status(200).json({
      success: true,
      data: {
        groupedData,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get activity log report
export const getActivityLogReport = async (req, res, next) => {
  try {
    const user = req.query.user || '';
    const action = req.query.action || '';
    const resource = req.query.resource || '';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const limit = parseInt(req.query.limit) || 100;

    // Build query
    const query = {};
    
    if (user) {
      query.user = user;
    }
    
    if (action) {
      query.action = action;
    }
    
    if (resource) {
      query.resource = resource;
    }
    
    if (startDate && endDate) {
      query.timestamp = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.timestamp = { $gte: startDate };
    } else if (endDate) {
      query.timestamp = { $lte: endDate };
    }

    // Get logs
    const logs = await ActivityLog.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .limit(limit);

    // Calculate summary statistics
    const actionCounts = await ActivityLog.aggregate([
      { $match: query },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const resourceCounts = await ActivityLog.aggregate([
      { $match: query },
      { $group: { _id: '$resource', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const userCounts = await ActivityLog.aggregate([
      { $match: query },
      { $group: { _id: '$user', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $project: {
          count: 1,
          name: {
            $concat: [
              { $arrayElemAt: ['$userDetails.firstName', 0] },
              ' ',
              { $arrayElemAt: ['$userDetails.lastName', 0] }
            ]
          }
        }
      }
    ]);

    // Get activity by date
    const activityByDate = await ActivityLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 },
          createCount: { $sum: { $cond: [{ $eq: ['$action', 'create'] }, 1, 0] } },
          updateCount: { $sum: { $cond: [{ $eq: ['$action', 'update'] }, 1, 0] } },
          deleteCount: { $sum: { $cond: [{ $eq: ['$action', 'delete'] }, 1, 0] } },
          readCount: { $sum: { $cond: [{ $eq: ['$action', 'read'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const summary = {
      totalLogs: await ActivityLog.countDocuments(query),
      actionCounts,
      resourceCounts,
      userCounts,
      activityByDate,
      dateRange: {
        start: startDate,
        end: endDate
      }
    };

    res.status(200).json({
      success: true,
      data: {
        logs,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get product performance report
export const getProductPerformanceReport = async (req, res, next) => {
  try {
    const category = req.query.category || '';
    const brand = req.query.brand || '';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const sortBy = req.query.sortBy || 'sales';
    const limit = parseInt(req.query.limit) || 20;

    // Set default date range if not provided
    const defaultStartDate = new Date();
    defaultStartDate.setMonth(defaultStartDate.getMonth() - 3);
    
    const effectiveStartDate = startDate || defaultStartDate;
    const effectiveEndDate = endDate || new Date();

    // Build product query
    const productQuery = { isActive: true };
    
    if (category) {
      productQuery.category = category;
    }
    
    if (brand) {
      productQuery.brand = new RegExp(brand, 'i');
    }

    // Get products
    const products = await Product.find(productQuery)
      .populate('category', 'name')
      .sort({ name: 1 });

    // Get sales data for the period
    const salesData = await Sales.aggregate([
      {
        $match: {
          saleDate: { $gte: effectiveStartDate, $lte: effectiveEndDate },
          status: { $nin: ['cancelled', 'returned'] }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.totalPrice' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    // Combine product and sales data
    const productPerformance = products.map(product => {
      const sales = salesData.find(s => s._id.toString() === product._id.toString());
      
      // Calculate profit (assuming we have cost price)
      const quantitySold = sales?.quantitySold || 0;
      const revenue = sales?.revenue || 0;
      const profit = revenue - (quantitySold * product.costPrice);
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      // Calculate inventory turnover
      const averageInventory = (product.currentStock + product.minimumStock) / 2;
      const inventoryTurnover = averageInventory > 0 ? quantitySold / averageInventory : 0;
      
      return {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        brand: product.brand,
        category: product.category,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        currentStock: product.currentStock,
        quantitySold,
        revenue,
        profit,
        profitMargin,
        inventoryTurnover,
        images: product.images
      };
    });

    // Sort products based on sortBy parameter
    let sortedProducts;
    switch (sortBy) {
      case 'sales':
        sortedProducts = productPerformance.sort((a, b) => b.quantitySold - a.quantitySold);
        break;
      case 'revenue':
        sortedProducts = productPerformance.sort((a, b) => b.revenue - a.revenue);
        break;
      case 'profit':
        sortedProducts = productPerformance.sort((a, b) => b.profit - a.profit);
        break;
      case 'margin':
        sortedProducts = productPerformance.sort((a, b) => b.profitMargin - a.profitMargin);
        break;
      case 'turnover':
        sortedProducts = productPerformance.sort((a, b) => b.inventoryTurnover - a.inventoryTurnover);
        break;
      default:
        sortedProducts = productPerformance.sort((a, b) => b.quantitySold - a.quantitySold);
    }

    // Limit results
    const limitedProducts = sortedProducts.slice(0, limit);

    // Calculate summary statistics
    const summary = {
      totalProducts: products.length,
      totalSales: limitedProducts.reduce((sum, p) => sum + p.quantitySold, 0),
      totalRevenue: limitedProducts.reduce((sum, p) => sum + p.revenue, 0),
      totalProfit: limitedProducts.reduce((sum, p) => sum + p.profit, 0),
      averageProfitMargin: limitedProducts.length > 0 ? 
        limitedProducts.reduce((sum, p) => sum + p.profitMargin, 0) / limitedProducts.length : 0,
      topPerformer: limitedProducts.length > 0 ? limitedProducts[0].name : 'None',
      dateRange: {
        start: effectiveStartDate,
        end: effectiveEndDate
      }
    };

    res.status(200).json({
      success: true,
      data: {
        products: limitedProducts,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get customer analysis report
export const getCustomerAnalysisReport = async (req, res, next) => {
  try {
    const customerGroup = req.query.customerGroup || '';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const sortBy = req.query.sortBy || 'revenue';
    const limit = parseInt(req.query.limit) || 20;

    // Set default date range if not provided
    const defaultStartDate = new Date();
    defaultStartDate.setMonth(defaultStartDate.getMonth() - 6);
    
    const effectiveStartDate = startDate || defaultStartDate;
    const effectiveEndDate = endDate || new Date();

    // Build customer query
    const customerQuery = {};
    
    if (customerGroup) {
      customerQuery.customerGroup = customerGroup;
    }

    // Get customers
    const customers = await Customer.find(customerQuery).sort({ name: 1 });

    // Get sales data for the period
    const salesData = await Sales.aggregate([
      {
        $match: {
          saleDate: { $gte: effectiveStartDate, $lte: effectiveEndDate },
          status: { $nin: ['cancelled', 'returned'] }
        }
      },
      {
        $group: {
          _id: '$customer',
          periodOrders: { $sum: 1 },
          periodRevenue: { $sum: '$grandTotal' }
        }
      }
    ]);

    // Get profit data (this would be more complex in a real system)
    // Here we're estimating profit as 30% of revenue
    const profitMargin = 0.3;

    // Combine customer and sales data
    const customerAnalysis = customers.map(customer => {
      const sales = salesData.find(s => s._id.toString() === customer._id.toString());
      
      const periodOrders = sales?.periodOrders || 0;
      const periodRevenue = sales?.periodRevenue || 0;
      const periodProfit = periodRevenue * profitMargin;
      
      const averageOrderValue = periodOrders > 0 ? periodRevenue / periodOrders : 0;
      const customerLifetimeValue = customer.totalSalesAmount * profitMargin;
      
      const daysSinceLastOrder = customer.lastOrderDate 
        ? Math.floor((new Date() - new Date(customer.lastOrderDate)) / (1000 * 60 * 60 * 24))
        : null;
      
      return {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        type: customer.type,
        businessName: customer.businessName,
        customerGroup: customer.customerGroup,
        periodOrders,
        periodRevenue,
        periodProfit,
        totalOrders: customer.totalOrders,
        totalSalesAmount: customer.totalSalesAmount,
        averageOrderValue,
        customerLifetimeValue,
        lastOrderDate: customer.lastOrderDate,
        daysSinceLastOrder,
        discountPercentage: customer.discountPercentage
      };
    });

    // Sort customers based on sortBy parameter
    let sortedCustomers;
    switch (sortBy) {
      case 'revenue':
        sortedCustomers = customerAnalysis.sort((a, b) => b.periodRevenue - a.periodRevenue);
        break;
      case 'orders':
        sortedCustomers = customerAnalysis.sort((a, b) => b.periodOrders - a.periodOrders);
        break;
      case 'profit':
        sortedCustomers = customerAnalysis.sort((a, b) => b.periodProfit - a.periodProfit);
        break;
      case 'aov':
        sortedCustomers = customerAnalysis.sort((a, b) => b.averageOrderValue - a.averageOrderValue);
        break;
      case 'clv':
        sortedCustomers = customerAnalysis.sort((a, b) => b.customerLifetimeValue - a.customerLifetimeValue);
        break;
      case 'recency':
        sortedCustomers = customerAnalysis.sort((a, b) => {
          if (a.lastOrderDate === null) return 1;
          if (b.lastOrderDate === null) return -1;
          return new Date(b.lastOrderDate) - new Date(a.lastOrderDate);
        });
        break;
      default:
        sortedCustomers = customerAnalysis.sort((a, b) => b.periodRevenue - a.periodRevenue);
    }

    // Limit results
    const limitedCustomers = sortedCustomers.slice(0, limit);

    // Calculate summary statistics
    const summary = {
      totalCustomers: customers.length,
      activeCustomers: customers.filter(c => c.isActive).length,
      totalRevenue: customerAnalysis.reduce((sum, c) => sum + c.periodRevenue, 0),
      totalProfit: customerAnalysis.reduce((sum, c) => sum + c.periodProfit, 0),
      averageOrderValue: customerAnalysis.reduce((sum, c) => sum + c.periodOrders, 0) > 0 ?
        customerAnalysis.reduce((sum, c) => sum + c.periodRevenue, 0) / customerAnalysis.reduce((sum, c) => sum + c.periodOrders, 0) : 0,
      customerGroupCounts: {
        regular: customers.filter(c => c.customerGroup === 'regular').length,
        vip: customers.filter(c => c.customerGroup === 'vip').length,
        wholesale: customers.filter(c => c.customerGroup === 'wholesale').length,
        retail: customers.filter(c => c.customerGroup === 'retail').length
      },
      dateRange: {
        start: effectiveStartDate,
        end: effectiveEndDate
      }
    };

    res.status(200).json({
      success: true,
      data: {
        customers: limitedCustomers,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get supplier analysis report
export const getSupplierAnalysisReport = async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const sortBy = req.query.sortBy || 'amount';
    const limit = parseInt(req.query.limit) || 20;

    // Set default date range if not provided
    const defaultStartDate = new Date();
    defaultStartDate.setMonth(defaultStartDate.getMonth() - 6);
    
    const effectiveStartDate = startDate || defaultStartDate;
    const effectiveEndDate = endDate || new Date();

    // Get suppliers
    const suppliers = await Supplier.find().sort({ name: 1 });

    // Get purchase data for the period
    const purchaseData = await Purchase.aggregate([
      {
        $match: {
          orderDate: { $gte: effectiveStartDate, $lte: effectiveEndDate },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: '$supplier',
          periodOrders: { $sum: 1 },
          periodAmount: { $sum: '$grandTotal' }
        }
      }
    ]);

    // Combine supplier and purchase data
    const supplierAnalysis = suppliers.map(supplier => {
      const purchases = purchaseData.find(p => p._id.toString() === supplier._id.toString());
      
      const periodOrders = purchases?.periodOrders || 0;
      const periodAmount = purchases?.periodAmount || 0;
      
      const averageOrderValue = periodOrders > 0 ? periodAmount / periodOrders : 0;
      
      const daysSinceLastOrder = supplier.lastOrderDate 
        ? Math.floor((new Date() - new Date(supplier.lastOrderDate)) / (1000 * 60 * 60 * 24))
        : null;
      
      // These would be calculated from actual data in a real system
      const onTimeDeliveryRate = Math.random() * 100; // Placeholder
      
      return {
        _id: supplier._id,
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        contactPerson: supplier.contactPerson.name,
        periodOrders,
        periodAmount,
        totalOrders: supplier.totalOrders,
        totalPurchaseAmount: supplier.totalPurchaseAmount,
        averageOrderValue,
        lastOrderDate: supplier.lastOrderDate,
        daysSinceLastOrder,
        rating: supplier.rating,
        onTimeDeliveryRate
      };
    });

    // Sort suppliers based on sortBy parameter
    let sortedSuppliers;
    switch (sortBy) {
      case 'amount':
        sortedSuppliers = supplierAnalysis.sort((a, b) => b.periodAmount - a.periodAmount);
        break;
      case 'orders':
        sortedSuppliers = supplierAnalysis.sort((a, b) => b.periodOrders - a.periodOrders);
        break;
      case 'aov':
        sortedSuppliers = supplierAnalysis.sort((a, b) => b.averageOrderValue - a.averageOrderValue);
        break;
      case 'rating':
        sortedSuppliers = supplierAnalysis.sort((a, b) => {
          if (a.rating === null) return 1;
          if (b.rating === null) return -1;
          return b.rating - a.rating;
        });
        break;
      case 'ontime':
        sortedSuppliers = supplierAnalysis.sort((a, b) => b.onTimeDeliveryRate - a.onTimeDeliveryRate);
        break;
      case 'recency':
        sortedSuppliers = supplierAnalysis.sort((a, b) => {
          if (a.lastOrderDate === null) return 1;
          if (b.lastOrderDate === null) return -1;
          return new Date(b.lastOrderDate) - new Date(a.lastOrderDate);
        });
        break;
      default:
        sortedSuppliers = supplierAnalysis.sort((a, b) => b.periodAmount - a.periodAmount);
    }

    // Limit results
    const limitedSuppliers = sortedSuppliers.slice(0, limit);

    // Calculate summary statistics
    const summary = {
      totalSuppliers: suppliers.length,
      activeSuppliers: suppliers.filter(s => s.isActive).length,
      totalAmount: supplierAnalysis.reduce((sum, s) => sum + s.periodAmount, 0),
      averageRating: suppliers.filter(s => s.rating !== null).length > 0 ?
        suppliers.filter(s => s.rating !== null).reduce((sum, s) => sum + (s.rating || 0), 0) / 
        suppliers.filter(s => s.rating !== null).length : 0,
      dateRange: {
        start: effectiveStartDate,
        end: effectiveEndDate
      }
    };

    res.status(200).json({
      success: true,
      data: {
        suppliers: limitedSuppliers,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

// Export report data
export const exportReportData = async (req, res, next) => {
  try {
    const { reportType, format = 'csv', ...filters } = req.query;
    
    let data = [];
    let fileName = '';
    
    switch (reportType) {
      case 'inventory':
        const inventoryResponse = await getInventoryReport(req, { json: (data) => data }, next);
        data = inventoryResponse.data.products.map(product => ({
          name: product.name,
          sku: product.sku,
          category: typeof product.category === 'object' ? product.category.name : '',
          brand: product.brand,
          currentStock: product.currentStock,
          minimumStock: product.minimumStock,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          stockValue: product.currentStock * product.costPrice,
          status: product.currentStock === 0 ? 'Out of Stock' : 
                 product.currentStock <= product.minimumStock ? 'Low Stock' : 'In Stock'
        }));
        fileName = 'inventory-report';
        break;
        
      case 'sales':
        const salesResponse = await getSalesReport(req, { json: (data) => data }, next);
        data = salesResponse.data.sales.map(sale => ({
          invoiceNumber: sale.invoiceNumber,
          date: new Date(sale.saleDate).toISOString().split('T')[0],
          customer: typeof sale.customer === 'object' ? sale.customer.name : 'Unknown',
          status: sale.status,
          paymentStatus: sale.paymentStatus,
          items: sale.items.length,
          subtotal: sale.subtotal,
          discount: sale.totalDiscount,
          tax: sale.totalTax,
          total: sale.grandTotal
        }));
        fileName = 'sales-report';
        break;
        
      case 'purchases':
        const purchasesResponse = await getPurchaseReport(req, { json: (data) => data }, next);
        data = purchasesResponse.data.purchases.map(purchase => ({
          purchaseOrderNumber: purchase.purchaseOrderNumber,
          date: new Date(purchase.orderDate).toISOString().split('T')[0],
          supplier: typeof purchase.supplier === 'object' ? purchase.supplier.name : 'Unknown',
          status: purchase.status,
          paymentStatus: purchase.paymentStatus,
          items: purchase.items.length,
          subtotal: purchase.subtotal,
          discount: purchase.totalDiscount,
          tax: purchase.totalTax,
          total: purchase.grandTotal
        }));
        fileName = 'purchases-report';
        break;
        
      case 'stock-movements':
        const movementsResponse = await getStockMovementReport(req, { json: (data) => data }, next);
        data = movementsResponse.data.movements.map(movement => ({
          date: new Date(movement.movementDate).toISOString().split('T')[0],
          type: movement.type,
          reason: movement.reason,
          product: typeof movement.product === 'object' ? movement.product.name : 'Unknown',
          sku: typeof movement.product === 'object' ? movement.product.sku : '',
          quantity: movement.quantity,
          previousStock: movement.previousStock,
          newStock: movement.newStock,
          fromLocation: movement.location.from ? 
            (typeof movement.location.from === 'object' ? movement.location.from.name : 'Unknown') : '',
          toLocation: movement.location.to ? 
            (typeof movement.location.to === 'object' ? movement.location.to.name : 'Unknown') : '',
          performedBy: typeof movement.performedBy === 'object' ? 
            `${movement.performedBy.firstName} ${movement.performedBy.lastName}` : 'Unknown'
        }));
        fileName = 'stock-movements-report';
        break;
        
      case 'product-performance':
        const productResponse = await getProductPerformanceReport(req, { json: (data) => data }, next);
        data = productResponse.data.products.map(product => ({
          name: product.name,
          sku: product.sku,
          category: typeof product.category === 'object' ? product.category.name : '',
          brand: product.brand,
          quantitySold: product.quantitySold,
          revenue: product.revenue,
          profit: product.profit,
          profitMargin: product.profitMargin.toFixed(2) + '%',
          currentStock: product.currentStock,
          inventoryTurnover: product.inventoryTurnover.toFixed(2)
        }));
        fileName = 'product-performance-report';
        break;
        
      case 'customer-analysis':
        const customerResponse = await getCustomerAnalysisReport(req, { json: (data) => data }, next);
        data = customerResponse.data.customers.map(customer => ({
          name: customer.name,
          email: customer.email,
          type: customer.type,
          group: customer.customerGroup,
          periodOrders: customer.periodOrders,
          periodRevenue: customer.periodRevenue,
          periodProfit: customer.periodProfit,
          totalOrders: customer.totalOrders,
          totalSalesAmount: customer.totalSalesAmount,
          averageOrderValue: customer.averageOrderValue.toFixed(2),
          lastOrderDate: customer.lastOrderDate ? new Date(customer.lastOrderDate).toISOString().split('T')[0] : 'Never',
          daysSinceLastOrder: customer.daysSinceLastOrder || 'N/A'
        }));
        fileName = 'customer-analysis-report';
        break;
        
      case 'supplier-analysis':
        const supplierResponse = await getSupplierAnalysisReport(req, { json: (data) => data }, next);
        data = supplierResponse.data.suppliers.map(supplier => ({
          name: supplier.name,
          email: supplier.email,
          contactPerson: supplier.contactPerson,
          periodOrders: supplier.periodOrders,
          periodAmount: supplier.periodAmount,
          totalOrders: supplier.totalOrders,
          totalPurchaseAmount: supplier.totalPurchaseAmount,
          averageOrderValue: supplier.averageOrderValue.toFixed(2),
          lastOrderDate: supplier.lastOrderDate ? new Date(supplier.lastOrderDate).toISOString().split('T')[0] : 'Never',
          daysSinceLastOrder: supplier.daysSinceLastOrder || 'N/A',
          rating: supplier.rating || 'Not Rated',
          onTimeDeliveryRate: supplier.onTimeDeliveryRate.toFixed(2) + '%'
        }));
        fileName = 'supplier-analysis-report';
        break;
        
      case 'activity-logs':
        const logsResponse = await getActivityLogReport(req, { json: (data) => data }, next);
        data = logsResponse.data.logs.map(log => ({
          timestamp: new Date(log.timestamp).toISOString(),
          user: typeof log.user === 'object' ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown',
          email: typeof log.user === 'object' ? log.user.email : '',
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId || '',
          description: log.description,
          ipAddress: log.ipAddress || '',
          userAgent: log.userAgent || ''
        }));
        fileName = 'activity-logs-report';
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    // Log activity
    await logActivity(req.user._id, 'export', 'report', null, 
      `Exported ${reportType} report in ${format.toUpperCase()} format`);

    res.status(200).json({
      success: true,
      data,
      count: data.length,
      format,
      fileName: `${fileName}-${new Date().toISOString().split('T')[0]}`
    });
  } catch (error) {
    next(error);
  }
};