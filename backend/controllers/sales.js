import Sales from '../models/Sales.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import StockMovement from '../models/StockMovement.js';
import { logActivity } from '../middleware/logger.js';

// Get all sales with advanced filtering
export const getSales = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const customer = req.query.customer || '';
    const paymentStatus = req.query.paymentStatus || '';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const salesPerson = req.query.salesPerson || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const minAmount = req.query.minAmount ? parseFloat(req.query.minAmount) : null;
    const maxAmount = req.query.maxAmount ? parseFloat(req.query.maxAmount) : null;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } }
      ];
      
      // Try to find customers matching the search
      const customers = await Customer.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      if (customers.length > 0) {
        query.$or.push({ customer: { $in: customers.map(c => c._id) } });
      }
    }
    
    if (status) {
      query.status = status;
    }
    
    if (customer) {
      query.customer = customer;
    }
    
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    
    if (startDate && endDate) {
      query.saleDate = {
        $gte: startDate,
        $lte: endDate
      };
    } else if (startDate) {
      query.saleDate = { $gte: startDate };
    } else if (endDate) {
      query.saleDate = { $lte: endDate };
    }
    
    if (salesPerson) {
      query.salesPerson = salesPerson;
    }
    
    if (minAmount !== null || maxAmount !== null) {
      query.grandTotal = {};
      if (minAmount !== null) query.grandTotal.$gte = minAmount;
      if (maxAmount !== null) query.grandTotal.$lte = maxAmount;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;

    const sales = await Sales.find(query)
      .populate('customer', 'name email phone type businessName')
      .populate('items.product', 'name sku brand unit images')
      .populate('salesPerson', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Sales.countDocuments(query);

    // Calculate summary statistics
    const summary = {
      totalSales: total,
      totalAmount: (await Sales.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]))[0]?.total || 0,
      paidAmount: (await Sales.aggregate([
        { $match: { ...query, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]))[0]?.total || 0,
      unpaidAmount: (await Sales.aggregate([
        { $match: { ...query, paymentStatus: 'unpaid' } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]))[0]?.total || 0,
      statusCounts: {
        draft: await Sales.countDocuments({ ...query, status: 'draft' }),
        confirmed: await Sales.countDocuments({ ...query, status: 'confirmed' }),
        shipped: await Sales.countDocuments({ ...query, status: 'shipped' }),
        delivered: await Sales.countDocuments({ ...query, status: 'delivered' }),
        cancelled: await Sales.countDocuments({ ...query, status: 'cancelled' }),
        returned: await Sales.countDocuments({ ...query, status: 'returned' })
      },
      paymentStatusCounts: {
        unpaid: await Sales.countDocuments({ ...query, paymentStatus: 'unpaid' }),
        partially_paid: await Sales.countDocuments({ ...query, paymentStatus: 'partially_paid' }),
        paid: await Sales.countDocuments({ ...query, paymentStatus: 'paid' }),
        overdue: await Sales.countDocuments({ ...query, paymentStatus: 'overdue' })
      }
    };

    res.status(200).json({
      success: true,
      data: sales,
      summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        search,
        status,
        customer,
        paymentStatus,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        salesPerson,
        minAmount,
        maxAmount,
        sortBy,
        sortOrder: req.query.sortOrder || 'desc'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get sale by ID
export const getSaleById = async (req, res, next) => {
  try {
    const sale = await Sales.findById(req.params.id)
      .populate('customer')
      .populate({
        path: 'items.product',
        select: 'name sku brand unit images costPrice currentStock'
      })
      .populate('salesPerson', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Calculate profit for each item and total profit
    const saleData = sale.toObject();
    let totalProfit = 0;
    
    saleData.items = saleData.items.map(item => {
      const costPrice = item.product.costPrice || 0;
      const profit = (item.unitPrice - costPrice) * item.quantity;
      totalProfit += profit;
      
      return {
        ...item,
        profit,
        profitMargin: costPrice > 0 ? ((item.unitPrice - costPrice) / costPrice * 100).toFixed(2) : 0
      };
    });
    
    saleData.totalProfit = totalProfit;
    saleData.profitMargin = saleData.subtotal > 0 ? ((totalProfit / saleData.subtotal) * 100).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      data: saleData
    });
  } catch (error) {
    next(error);
  }
};

// Create sale
export const createSale = async (req, res, next) => {
  try {
    // Check if customer exists
    const customer = await Customer.findById(req.body.customer);
    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check stock availability
    for (const item of req.body.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }
      
      if (product.currentStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.currentStock}, Required: ${item.quantity}`
        });
      }
    }

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const items = req.body.items.map(item => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemDiscount = item.discount || 0;
      const itemTax = item.tax || 0;
      
      subtotal += itemTotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;

      return {
        ...item,
        totalPrice: itemTotal
      };
    });

    const shippingCost = req.body.shippingCost || 0;
    const grandTotal = subtotal - totalDiscount + totalTax + shippingCost;

    // Set due date based on customer payment terms
    let dueDate = null;
    if (customer.paymentTerms !== 'cash') {
      dueDate = new Date();
      const days = parseInt(customer.paymentTerms.split('_')[1]);
      dueDate.setDate(dueDate.getDate() + days);
    }

    const salesData = {
      ...req.body,
      items,
      subtotal,
      totalDiscount,
      totalTax,
      shippingCost,
      grandTotal,
      dueDate,
      createdBy: req.user._id,
      salesPerson: req.body.salesPerson || req.user._id
    };

    const sale = await Sales.create(salesData);

    // Update stock and create movements
    for (const item of sale.items) {
      const product = await Product.findById(item.product);
      if (product) {
        const previousStock = product.currentStock;
        product.currentStock -= item.quantity;
        product.totalSold += item.quantity;
        await product.save();

        // Create stock movement
        await StockMovement.create({
          product: product._id,
          type: 'out',
          reason: 'sale',
          quantity: item.quantity,
          previousStock,
          newStock: product.currentStock,
          unitCost: product.costPrice,
          totalCost: product.costPrice * item.quantity,
          reference: {
            type: 'sale',
            id: sale._id,
            number: sale.invoiceNumber
          },
          performedBy: req.user._id
        });
      }
    }

    // Update customer data
    customer.totalOrders += 1;
    customer.totalSalesAmount += grandTotal;
    customer.lastOrderDate = new Date();
    
    // Update customer balance if not cash payment
    if (customer.paymentTerms !== 'cash' && sale.paymentStatus !== 'paid') {
      customer.currentBalance += grandTotal;
    }
    
    await customer.save();

    // Log activity
    await logActivity(req.user._id, 'create', 'sale', sale._id, 
      `Created sales invoice: ${sale.invoiceNumber} for ${customer.name}`);

    const populatedSale = await Sales.findById(sale._id)
      .populate('customer', 'name email')
      .populate('items.product', 'name sku');

    res.status(201).json({
      success: true,
      message: 'Sales invoice created successfully',
      data: populatedSale
    });
  } catch (error) {
    next(error);
  }
};

// Update sale
export const updateSale = async (req, res, next) => {
  try {
    const sale = await Sales.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Don't allow updates if already delivered or cancelled
    if (sale.status === 'delivered' || sale.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot update ${sale.status} sales invoice`
      });
    }

    // If items are being updated, check stock and revert previous stock changes
    if (req.body.items) {
      // Revert previous stock changes
      for (const item of sale.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.currentStock += item.quantity;
          product.totalSold -= item.quantity;
          await product.save();
        }
      }

      // Check new stock availability
      for (const item of req.body.items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product not found: ${item.product}`
          });
        }
        
        if (product.currentStock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}. Available: ${product.currentStock}, Required: ${item.quantity}`
          });
        }
      }

      // Calculate new totals
      let subtotal = 0;
      let totalTax = 0;
      let totalDiscount = 0;

      const items = req.body.items.map(item => {
        const itemTotal = item.quantity * item.unitPrice;
        const itemDiscount = item.discount || 0;
        const itemTax = item.tax || 0;
        
        subtotal += itemTotal;
        totalDiscount += itemDiscount;
        totalTax += itemTax;

        return {
          ...item,
          totalPrice: itemTotal
        };
      });

      const shippingCost = req.body.shippingCost || 0;
      const grandTotal = subtotal - totalDiscount + totalTax + shippingCost;

      req.body.items = items;
      req.body.subtotal = subtotal;
      req.body.totalDiscount = totalDiscount;
      req.body.totalTax = totalTax;
      req.body.grandTotal = grandTotal;

      // Apply new stock changes
      for (const item of req.body.items) {
        const product = await Product.findById(item.product);
        if (product) {
          const previousStock = product.currentStock;
          product.currentStock -= item.quantity;
          product.totalSold += item.quantity;
          await product.save();

          // Create stock movement
          await StockMovement.create({
            product: product._id,
            type: 'out',
            reason: 'sale',
            quantity: item.quantity,
            previousStock,
            newStock: product.currentStock,
            unitCost: product.costPrice,
            totalCost: product.costPrice * item.quantity,
            reference: {
              type: 'sale',
              id: sale._id,
              number: sale.invoiceNumber
            },
            performedBy: req.user._id,
            notes: 'Updated from sales invoice'
          });
        }
      }

      // Update customer data if customer is changed
      if (req.body.customer && req.body.customer !== sale.customer.toString()) {
        // Revert changes to old customer
        const oldCustomer = await Customer.findById(sale.customer);
        if (oldCustomer) {
          oldCustomer.totalOrders -= 1;
          oldCustomer.totalSalesAmount -= sale.grandTotal;
          if (sale.paymentStatus !== 'paid') {
            oldCustomer.currentBalance -= sale.grandTotal;
          }
          await oldCustomer.save();
        }

        // Apply changes to new customer
        const newCustomer = await Customer.findById(req.body.customer);
        if (newCustomer) {
          newCustomer.totalOrders += 1;
          newCustomer.totalSalesAmount += req.body.grandTotal;
          newCustomer.lastOrderDate = new Date();
          if (req.body.paymentStatus !== 'paid') {
            newCustomer.currentBalance += req.body.grandTotal;
          }
          await newCustomer.save();
        }
      } else if (sale.grandTotal !== req.body.grandTotal) {
        // Update customer balance if total changed
        const customer = await Customer.findById(sale.customer);
        if (customer && sale.paymentStatus !== 'paid') {
          customer.currentBalance -= sale.grandTotal;
          customer.currentBalance += req.body.grandTotal;
          customer.totalSalesAmount -= sale.grandTotal;
          customer.totalSalesAmount += req.body.grandTotal;
          await customer.save();
        }
      }
    }

    // Update payment status changes
    if (req.body.paymentStatus && req.body.paymentStatus !== sale.paymentStatus) {
      const customer = await Customer.findById(sale.customer);
      if (customer) {
        // If changing to paid, reduce customer balance
        if (req.body.paymentStatus === 'paid' && sale.paymentStatus !== 'paid') {
          customer.currentBalance -= sale.grandTotal;
          await customer.save();
        }
        // If changing from paid, increase customer balance
        else if (req.body.paymentStatus !== 'paid' && sale.paymentStatus === 'paid') {
          customer.currentBalance += sale.grandTotal;
          await customer.save();
        }
      }
    }

    const updatedSale = await Sales.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('customer', 'name email').populate('items.product', 'name sku');

    // Log activity
    await logActivity(req.user._id, 'update', 'sale', sale._id, 
      `Updated sales invoice: ${sale.invoiceNumber}`);

    res.status(200).json({
      success: true,
      message: 'Sales invoice updated successfully',
      data: updatedSale
    });
  } catch (error) {
    next(error);
  }
};

// Update sale status
export const updateSaleStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const validStatuses = ['draft', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const sale = await Sales.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Handle stock changes for cancelled or returned status
    if ((status === 'cancelled' || status === 'returned') && 
        sale.status !== 'cancelled' && sale.status !== 'returned') {
      // Return items to inventory
      for (const item of sale.items) {
        const product = await Product.findById(item.product);
        if (product) {
          const previousStock = product.currentStock;
          product.currentStock += item.quantity;
          product.totalSold -= item.quantity;
          await product.save();

          // Create stock movement
          await StockMovement.create({
            product: product._id,
            type: 'in',
            reason: status === 'cancelled' ? 'return' : 'return',
            quantity: item.quantity,
            previousStock,
            newStock: product.currentStock,
            unitCost: product.costPrice,
            totalCost: product.costPrice * item.quantity,
            reference: {
              type: 'sale',
              id: sale._id,
              number: sale.invoiceNumber
            },
            performedBy: req.user._id,
            notes: `Sale ${status}`
          });
        }
      }

      // Update customer balance if not paid
      if (sale.paymentStatus !== 'paid') {
        const customer = await Customer.findById(sale.customer);
        if (customer) {
          customer.currentBalance -= sale.grandTotal;
          await customer.save();
        }
      }
    }

    sale.status = status;
    await sale.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'sale', sale._id, 
      `Updated status of sales invoice ${sale.invoiceNumber} to ${status}`);

    res.status(200).json({
      success: true,
      message: `Sale status updated to ${status} successfully`,
      data: {
        id: sale._id,
        status: sale.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update payment status
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;
    
    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Payment status is required'
      });
    }
    
    const validStatuses = ['unpaid', 'partially_paid', 'paid', 'overdue'];
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

    const sale = await Sales.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Update customer balance
    const customer = await Customer.findById(sale.customer);
    if (customer) {
      // If changing to paid, reduce customer balance
      if (paymentStatus === 'paid' && sale.paymentStatus !== 'paid') {
        customer.currentBalance -= sale.grandTotal;
        await customer.save();
      }
      // If changing from paid, increase customer balance
      else if (paymentStatus !== 'paid' && sale.paymentStatus === 'paid') {
        customer.currentBalance += sale.grandTotal;
        await customer.save();
      }
    }

    sale.paymentStatus = paymentStatus;
    if (paymentMethod) {
      sale.paymentMethod = paymentMethod;
    }
    await sale.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'sale', sale._id, 
      `Updated payment status of sales invoice ${sale.invoiceNumber} to ${paymentStatus}`);

    res.status(200).json({
      success: true,
      message: `Payment status updated to ${paymentStatus} successfully`,
      data: {
        id: sale._id,
        paymentStatus: sale.paymentStatus,
        paymentMethod: sale.paymentMethod
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete sale
export const deleteSale = async (req, res, next) => {
  try {
    const sale = await Sales.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Don't allow deletion if already shipped or delivered
    if (sale.status === 'shipped' || sale.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete shipped or delivered sales invoice'
      });
    }

    // Restore stock if sale was confirmed
    if (sale.status === 'confirmed' || sale.status === 'draft') {
      for (const item of sale.items) {
        const product = await Product.findById(item.product);
        if (product) {
          const previousStock = product.currentStock;
          product.currentStock += item.quantity;
          product.totalSold -= item.quantity;
          await product.save();

          // Create stock movement
          await StockMovement.create({
            product: product._id,
            type: 'in',
            reason: 'return',
            quantity: item.quantity,
            previousStock,
            newStock: product.currentStock,
            reference: {
              type: 'sale',
              id: sale._id,
              number: sale.invoiceNumber
            },
            performedBy: req.user._id,
            notes: 'Stock restored due to sale deletion'
          });
        }
      }

      // Update customer data
      const customer = await Customer.findById(sale.customer);
      if (customer) {
        customer.totalOrders -= 1;
        customer.totalSalesAmount -= sale.grandTotal;
        if (sale.paymentStatus !== 'paid') {
          customer.currentBalance -= sale.grandTotal;
        }
        await customer.save();
      }
    }

    await Sales.findByIdAndDelete(req.params.id);

    // Log activity
    await logActivity(req.user._id, 'delete', 'sale', sale._id, 
      `Deleted sales invoice: ${sale.invoiceNumber}`);

    res.status(200).json({
      success: true,
      message: 'Sales invoice deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get sales dashboard stats
export const getSalesDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));
    
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const startOfYear = new Date();
    startOfYear.setMonth(0, 1);
    startOfYear.setHours(0, 0, 0, 0);

    // Get total sales
    const totalSales = await Sales.countDocuments({});
    
    // Get sales by status
    const statusCounts = {
      draft: await Sales.countDocuments({ status: 'draft' }),
      confirmed: await Sales.countDocuments({ status: 'confirmed' }),
      shipped: await Sales.countDocuments({ status: 'shipped' }),
      delivered: await Sales.countDocuments({ status: 'delivered' }),
      cancelled: await Sales.countDocuments({ status: 'cancelled' }),
      returned: await Sales.countDocuments({ status: 'returned' })
    };
    
    // Get sales by payment status
    const paymentStatusCounts = {
      unpaid: await Sales.countDocuments({ paymentStatus: 'unpaid' }),
      partially_paid: await Sales.countDocuments({ paymentStatus: 'partially_paid' }),
      paid: await Sales.countDocuments({ paymentStatus: 'paid' }),
      overdue: await Sales.countDocuments({ paymentStatus: 'overdue' })
    };
    
    // Get sales amounts
    const totalAmount = (await Sales.aggregate([
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]))[0]?.total || 0;
    
    const paidAmount = (await Sales.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]))[0]?.total || 0;
    
    const unpaidAmount = (await Sales.aggregate([
      { $match: { paymentStatus: { $ne: 'paid' } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]))[0]?.total || 0;
    
    // Get today's sales
    const todaySales = await Sales.countDocuments({
      saleDate: { $gte: startOfToday, $lte: endOfToday }
    });
    
    const todayAmount = (await Sales.aggregate([
      { $match: { saleDate: { $gte: startOfToday, $lte: endOfToday } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]))[0]?.total || 0;
    
    // Get this week's sales
    const weekSales = await Sales.countDocuments({
      saleDate: { $gte: startOfWeek }
    });
    
    const weekAmount = (await Sales.aggregate([
      { $match: { saleDate: { $gte: startOfWeek } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]))[0]?.total || 0;
    
    // Get this month's sales
    const monthSales = await Sales.countDocuments({
      saleDate: { $gte: startOfMonth }
    });
    
    const monthAmount = (await Sales.aggregate([
      { $match: { saleDate: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]))[0]?.total || 0;
    
    // Get sales by month for the current year
    const salesByMonth = await Sales.aggregate([
      { 
        $match: { 
          saleDate: { $gte: startOfYear },
          status: { $nin: ['cancelled', 'returned'] }
        } 
      },
      {
        $group: {
          _id: { $month: '$saleDate' },
          count: { $sum: 1 },
          total: { $sum: '$grandTotal' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Format sales by month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedSalesByMonth = Array.from({ length: 12 }, (_, i) => {
      const monthData = salesByMonth.find(m => m._id === i + 1);
      return {
        month: monthNames[i],
        count: monthData?.count || 0,
        total: monthData?.total || 0
      };
    });
    
    // Get top customers
    const topCustomers = await Sales.aggregate([
      { $match: { status: { $nin: ['cancelled', 'returned'] } } },
      {
        $group: {
          _id: '$customer',
          count: { $sum: 1 },
          total: { $sum: '$grandTotal' }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customerDetails'
        }
      },
      {
        $addFields: {
          customerName: { $arrayElemAt: ['$customerDetails.name', 0] },
          customerEmail: { $arrayElemAt: ['$customerDetails.email', 0] },
          customerType: { $arrayElemAt: ['$customerDetails.type', 0] }
        }
      },
      {
        $project: {
          customerDetails: 0
        }
      }
    ]);
    
    // Get top products
    const topProducts = await Sales.aggregate([
      { $match: { status: { $nin: ['cancelled', 'returned'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          quantity: { $sum: '$items.quantity' },
          total: { $sum: '$items.totalPrice' }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $addFields: {
          productName: { $arrayElemAt: ['$productDetails.name', 0] },
          productSku: { $arrayElemAt: ['$productDetails.sku', 0] },
          productImage: { $arrayElemAt: ['$productDetails.images', 0] }
        }
      },
      {
        $project: {
          productDetails: 0
        }
      }
    ]);
    
    // Get recent sales
    const recentSales = await Sales.find({})
      .populate('customer', 'name email')
      .populate('salesPerson', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        counts: {
          total: totalSales,
          today: todaySales,
          week: weekSales,
          month: monthSales
        },
        amounts: {
          total: totalAmount,
          paid: paidAmount,
          unpaid: unpaidAmount,
          today: todayAmount,
          week: weekAmount,
          month: monthAmount
        },
        statusCounts,
        paymentStatusCounts,
        salesByMonth: formattedSalesByMonth,
        topCustomers,
        topProducts,
        recentSales
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get customer sales history
export const getCustomerSalesHistory = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    
    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get sales for this customer
    const sales = await Sales.find({ customer: customerId })
      .populate('items.product', 'name sku')
      .populate('salesPerson', 'firstName lastName')
      .sort({ saleDate: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Sales.countDocuments({ customer: customerId });
    
    // Calculate summary statistics
    const summary = {
      totalSales: total,
      totalAmount: (await Sales.aggregate([
        { $match: { customer: mongoose.Types.ObjectId(customerId) } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]))[0]?.total || 0,
      paidAmount: (await Sales.aggregate([
        { $match: { customer: mongoose.Types.ObjectId(customerId), paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]))[0]?.total || 0,
      unpaidAmount: (await Sales.aggregate([
        { $match: { customer: mongoose.Types.ObjectId(customerId), paymentStatus: { $ne: 'paid' } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]))[0]?.total || 0,
      averageOrderValue: total > 0 ? 
        ((await Sales.aggregate([
          { $match: { customer: mongoose.Types.ObjectId(customerId) } },
          { $group: { _id: null, total: { $sum: '$grandTotal' } } }
        ]))[0]?.total || 0) / total : 0,
      lastOrderDate: (await Sales.findOne({ customer: customerId }).sort({ saleDate: -1 }))?.saleDate
    };
    
    // Get frequently purchased products
    const frequentProducts = await Sales.aggregate([
      { $match: { customer: mongoose.Types.ObjectId(customerId) } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          count: { $sum: 1 },
          quantity: { $sum: '$items.quantity' },
          total: { $sum: '$items.totalPrice' }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $addFields: {
          productName: { $arrayElemAt: ['$productDetails.name', 0] },
          productSku: { $arrayElemAt: ['$productDetails.sku', 0] }
        }
      },
      {
        $project: {
          productDetails: 0
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        sales,
        summary,
        frequentProducts
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Generate invoice
export const generateInvoice = async (req, res, next) => {
  try {
    const sale = await Sales.findById(req.params.id)
      .populate('customer')
      .populate('items.product', 'name sku brand unit')
      .populate('salesPerson', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Get company settings
    const Settings = (await import('../models/Settings.js')).default;
    const settings = await Settings.findOne();

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Company settings not found'
      });
    }

    // Format invoice data
    const invoiceData = {
      invoice: {
        number: sale.invoiceNumber,
        date: new Date(sale.saleDate).toLocaleDateString(),
        dueDate: sale.dueDate ? new Date(sale.dueDate).toLocaleDateString() : 'N/A',
        status: sale.status,
        paymentStatus: sale.paymentStatus,
        paymentMethod: sale.paymentMethod || 'N/A'
      },
      company: {
        name: settings.company.name,
        email: settings.company.email,
        phone: settings.company.phone,
        address: settings.company.address ? 
          `${settings.company.address.street}, ${settings.company.address.city}, ${settings.company.address.state} ${settings.company.address.zipCode}, ${settings.company.address.country}` : '',
        logo: settings.company.logo,
        taxNumber: settings.company.taxNumber
      },
      customer: {
        name: sale.customer.name,
        email: sale.customer.email,
        phone: sale.customer.phone,
        address: sale.customer.address ? 
          `${sale.customer.address.street}, ${sale.customer.address.city}, ${sale.customer.address.state} ${sale.customer.address.zipCode}, ${sale.customer.address.country}` : '',
        taxNumber: sale.customer.taxNumber
      },
      items: sale.items.map(item => ({
        product: typeof item.product === 'object' ? item.product.name : 'Unknown Product',
        sku: typeof item.product === 'object' ? item.product.sku : '',
        quantity: item.quantity,
        unit: typeof item.product === 'object' ? item.product.unit : '',
        unitPrice: item.unitPrice,
        discount: item.discount,
        tax: item.tax,
        total: item.totalPrice
      })),
      totals: {
        subtotal: sale.subtotal,
        discount: sale.totalDiscount,
        tax: sale.totalTax,
        shipping: sale.shippingCost,
        grandTotal: sale.grandTotal
      },
      notes: sale.notes,
      createdBy: sale.createdBy ? `${sale.createdBy.firstName} ${sale.createdBy.lastName}` : 'System',
      salesPerson: sale.salesPerson ? `${sale.salesPerson.firstName} ${sale.salesPerson.lastName}` : 'N/A'
    };

    // Log activity
    await logActivity(req.user._id, 'export', 'sale', sale._id, 
      `Generated invoice for: ${sale.invoiceNumber}`);

    res.status(200).json({
      success: true,
      data: invoiceData
    });
  } catch (error) {
    next(error);
  }
};

// Export sales data
export const exportSales = async (req, res, next) => {
  try {
    const { format = 'csv', filters = {} } = req.query;
    
    // Build query based on filters
    const query = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
    if (filters.customer) query.customer = filters.customer;
    
    if (filters.startDate && filters.endDate) {
      query.saleDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    } else if (filters.startDate) {
      query.saleDate = { $gte: new Date(filters.startDate) };
    } else if (filters.endDate) {
      query.saleDate = { $lte: new Date(filters.endDate) };
    }

    const sales = await Sales.find(query)
      .populate('customer', 'name email')
      .populate('salesPerson', 'firstName lastName')
      .sort({ saleDate: -1 });

    // Format data for export
    const exportData = sales.map(sale => ({
      invoiceNumber: sale.invoiceNumber,
      customer: sale.customer?.name || 'Unknown',
      customerEmail: sale.customer?.email || '',
      date: new Date(sale.saleDate).toISOString().split('T')[0],
      dueDate: sale.dueDate ? new Date(sale.dueDate).toISOString().split('T')[0] : '',
      status: sale.status,
      paymentStatus: sale.paymentStatus,
      paymentMethod: sale.paymentMethod || '',
      subtotal: sale.subtotal,
      discount: sale.totalDiscount,
      tax: sale.totalTax,
      shipping: sale.shippingCost,
      total: sale.grandTotal,
      itemCount: sale.items.length,
      salesPerson: sale.salesPerson ? `${sale.salesPerson.firstName} ${sale.salesPerson.lastName}` : '',
      createdAt: new Date(sale.createdAt).toISOString().split('T')[0]
    }));

    // Log activity
    await logActivity(req.user._id, 'export', 'sale', null, 
      `Exported ${exportData.length} sales in ${format.toUpperCase()} format`);

    res.status(200).json({
      success: true,
      data: exportData,
      count: exportData.length,
      format
    });
  } catch (error) {
    next(error);
  }
};

// Check for overdue invoices and update status
export const checkOverdueInvoices = async (req, res, next) => {
  try {
    const today = new Date();
    
    // Find unpaid invoices with due dates in the past
    const overdueInvoices = await Sales.find({
      paymentStatus: 'unpaid',
      dueDate: { $lt: today }
    });
    
    let updatedCount = 0;
    
    for (const invoice of overdueInvoices) {
      invoice.paymentStatus = 'overdue';
      await invoice.save();
      updatedCount++;
      
      // Log activity
      await logActivity(req.user._id, 'update', 'sale', invoice._id, 
        `Invoice ${invoice.invoiceNumber} marked as overdue`);
    }
    
    res.status(200).json({
      success: true,
      message: `${updatedCount} invoices marked as overdue`,
      data: { updatedCount }
    });
  } catch (error) {
    next(error);
  }
};