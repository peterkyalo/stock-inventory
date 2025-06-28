import Purchase from '../models/Purchase.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import StockMovement from '../models/StockMovement.js';
import { logActivity } from '../middleware/logger.js';

// Get all purchases with advanced filtering
export const getPurchases = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const supplier = req.query.supplier || '';
    const paymentStatus = req.query.paymentStatus || '';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const minAmount = req.query.minAmount ? parseFloat(req.query.minAmount) : null;
    const maxAmount = req.query.maxAmount ? parseFloat(req.query.maxAmount) : null;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { purchaseOrderNumber: { $regex: search, $options: 'i' } }
      ];
      
      // Try to find suppliers matching the search
      const suppliers = await Supplier.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      if (suppliers.length > 0) {
        query.$or.push({ supplier: { $in: suppliers.map(s => s._id) } });
      }
    }
    
    if (status) {
      query.status = status;
    }
    
    if (supplier) {
      query.supplier = supplier;
    }
    
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    
    if (startDate && endDate) {
      query.orderDate = {
        $gte: startDate,
        $lte: endDate
      };
    } else if (startDate) {
      query.orderDate = { $gte: startDate };
    } else if (endDate) {
      query.orderDate = { $lte: endDate };
    }
    
    if (minAmount !== null || maxAmount !== null) {
      query.grandTotal = {};
      if (minAmount !== null) query.grandTotal.$gte = minAmount;
      if (maxAmount !== null) query.grandTotal.$lte = maxAmount;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;

    const purchases = await Purchase.find(query)
      .populate('supplier', 'name email phone')
      .populate('items.product', 'name sku brand unit images')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Purchase.countDocuments(query);

    // Calculate summary statistics
    const summary = {
      totalPurchases: total,
      totalAmount: (await Purchase.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]))[0]?.total || 0,
      paidAmount: (await Purchase.aggregate([
        { $match: { ...query, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]))[0]?.total || 0,
      unpaidAmount: (await Purchase.aggregate([
        { $match: { ...query, paymentStatus: { $ne: 'paid' } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]))[0]?.total || 0,
      statusCounts: {
        draft: await Purchase.countDocuments({ ...query, status: 'draft' }),
        pending: await Purchase.countDocuments({ ...query, status: 'pending' }),
        approved: await Purchase.countDocuments({ ...query, status: 'approved' }),
        ordered: await Purchase.countDocuments({ ...query, status: 'ordered' }),
        partially_received: await Purchase.countDocuments({ ...query, status: 'partially_received' }),
        received: await Purchase.countDocuments({ ...query, status: 'received' }),
        cancelled: await Purchase.countDocuments({ ...query, status: 'cancelled' })
      },
      paymentStatusCounts: {
        unpaid: await Purchase.countDocuments({ ...query, paymentStatus: 'unpaid' }),
        partially_paid: await Purchase.countDocuments({ ...query, paymentStatus: 'partially_paid' }),
        paid: await Purchase.countDocuments({ ...query, paymentStatus: 'paid' })
      }
    };

    res.status(200).json({
      success: true,
      data: purchases,
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
        supplier,
        paymentStatus,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
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

// Get purchase by ID
export const getPurchaseById = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('supplier')
      .populate({
        path: 'items.product',
        select: 'name sku brand unit images costPrice currentStock'
      })
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    res.status(200).json({
      success: true,
      data: purchase
    });
  } catch (error) {
    next(error);
  }
};

// Create purchase
export const createPurchase = async (req, res, next) => {
  try {
    // Check if supplier exists
    const supplier = await Supplier.findById(req.body.supplier);
    if (!supplier) {
      return res.status(400).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Validate products
    for (const item of req.body.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.product}`
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
        totalPrice: itemTotal,
        receivedQuantity: 0
      };
    });

    const shippingCost = req.body.shippingCost || 0;
    const grandTotal = subtotal - totalDiscount + totalTax + shippingCost;

    // Set expected delivery date if provided
    let expectedDeliveryDate = null;
    if (req.body.expectedDeliveryDate) {
      expectedDeliveryDate = new Date(req.body.expectedDeliveryDate);
    }

    const purchaseData = {
      supplier: req.body.supplier,
      items,
      status: req.body.status || 'draft',
      orderDate: req.body.orderDate || new Date(),
      expectedDeliveryDate,
      subtotal,
      totalDiscount,
      totalTax,
      shippingCost,
      grandTotal,
      paymentStatus: req.body.paymentStatus || 'unpaid',
      paymentMethod: req.body.paymentMethod,
      paymentTerms: req.body.paymentTerms || supplier.paymentTerms,
      notes: req.body.notes,
      createdBy: req.user._id
    };

    const purchase = await Purchase.create(purchaseData);

    // Update supplier data if not draft
    if (purchase.status !== 'draft') {
      supplier.totalOrders += 1;
      supplier.totalPurchaseAmount += grandTotal;
      supplier.lastOrderDate = new Date();
      
      // Update supplier balance if not cash payment
      if (purchase.paymentStatus !== 'paid') {
        supplier.currentBalance += grandTotal;
      }
      
      await supplier.save();
    }

    // Log activity
    await logActivity(req.user._id, 'create', 'purchase', purchase._id, 
      `Created purchase order: ${purchase.purchaseOrderNumber} for ${supplier.name}`);

    const populatedPurchase = await Purchase.findById(purchase._id)
      .populate('supplier', 'name email')
      .populate('items.product', 'name sku');

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: populatedPurchase
    });
  } catch (error) {
    next(error);
  }
};

// Update purchase
export const updatePurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Don't allow updates if already received
    if (purchase.status === 'received') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update received purchase order'
      });
    }

    // If items are being updated, recalculate totals
    if (req.body.items) {
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
          totalPrice: itemTotal,
          receivedQuantity: item.receivedQuantity || 0
        };
      });

      const shippingCost = req.body.shippingCost || 0;
      const grandTotal = subtotal - totalDiscount + totalTax + shippingCost;

      req.body.items = items;
      req.body.subtotal = subtotal;
      req.body.totalDiscount = totalDiscount;
      req.body.totalTax = totalTax;
      req.body.grandTotal = grandTotal;

      // Update supplier data if supplier is changed
      if (req.body.supplier && req.body.supplier !== purchase.supplier.toString()) {
        // Revert changes to old supplier
        const oldSupplier = await Supplier.findById(purchase.supplier);
        if (oldSupplier && purchase.status !== 'draft' && purchase.status !== 'cancelled') {
          oldSupplier.totalOrders -= 1;
          oldSupplier.totalPurchaseAmount -= purchase.grandTotal;
          if (purchase.paymentStatus !== 'paid') {
            oldSupplier.currentBalance -= purchase.grandTotal;
          }
          await oldSupplier.save();
        }

        // Apply changes to new supplier
        const newSupplier = await Supplier.findById(req.body.supplier);
        if (newSupplier && req.body.status !== 'draft' && req.body.status !== 'cancelled') {
          newSupplier.totalOrders += 1;
          newSupplier.totalPurchaseAmount += grandTotal;
          newSupplier.lastOrderDate = new Date();
          if (req.body.paymentStatus !== 'paid') {
            newSupplier.currentBalance += grandTotal;
          }
          await newSupplier.save();
        }
      } else if (purchase.grandTotal !== grandTotal) {
        // Update supplier balance if total changed
        const supplier = await Supplier.findById(purchase.supplier);
        if (supplier && purchase.status !== 'draft' && purchase.status !== 'cancelled') {
          if (purchase.paymentStatus !== 'paid') {
            supplier.currentBalance -= purchase.grandTotal;
            supplier.currentBalance += grandTotal;
          }
          supplier.totalPurchaseAmount -= purchase.grandTotal;
          supplier.totalPurchaseAmount += grandTotal;
          await supplier.save();
        }
      }
    }

    // Handle status changes
    if (req.body.status && req.body.status !== purchase.status) {
      // If changing from draft to another status, update supplier data
      if (purchase.status === 'draft' && req.body.status !== 'draft' && req.body.status !== 'cancelled') {
        const supplier = await Supplier.findById(purchase.supplier);
        if (supplier) {
          supplier.totalOrders += 1;
          supplier.totalPurchaseAmount += purchase.grandTotal;
          supplier.lastOrderDate = new Date();
          if (purchase.paymentStatus !== 'paid') {
            supplier.currentBalance += purchase.grandTotal;
          }
          await supplier.save();
        }
      }
      
      // If changing to cancelled, revert supplier data
      if (req.body.status === 'cancelled' && purchase.status !== 'draft' && purchase.status !== 'cancelled') {
        const supplier = await Supplier.findById(purchase.supplier);
        if (supplier) {
          supplier.totalOrders -= 1;
          supplier.totalPurchaseAmount -= purchase.grandTotal;
          if (purchase.paymentStatus !== 'paid') {
            supplier.currentBalance -= purchase.grandTotal;
          }
          await supplier.save();
        }
      }
      
      // If changing from cancelled to another status, update supplier data
      if (purchase.status === 'cancelled' && req.body.status !== 'draft' && req.body.status !== 'cancelled') {
        const supplier = await Supplier.findById(purchase.supplier);
        if (supplier) {
          supplier.totalOrders += 1;
          supplier.totalPurchaseAmount += purchase.grandTotal;
          supplier.lastOrderDate = new Date();
          if (purchase.paymentStatus !== 'paid') {
            supplier.currentBalance += purchase.grandTotal;
          }
          await supplier.save();
        }
      }
      
      // If changing to approved, set approvedBy and approvedAt
      if (req.body.status === 'approved') {
        req.body.approvedBy = req.user._id;
        req.body.approvedAt = new Date();
      }
    }

    // Update payment status changes
    if (req.body.paymentStatus && req.body.paymentStatus !== purchase.paymentStatus) {
      const supplier = await Supplier.findById(purchase.supplier);
      if (supplier && purchase.status !== 'draft' && purchase.status !== 'cancelled') {
        // If changing to paid, reduce supplier balance
        if (req.body.paymentStatus === 'paid' && purchase.paymentStatus !== 'paid') {
          supplier.currentBalance -= purchase.grandTotal;
          await supplier.save();
        }
        // If changing from paid, increase supplier balance
        else if (req.body.paymentStatus !== 'paid' && purchase.paymentStatus === 'paid') {
          supplier.currentBalance += purchase.grandTotal;
          await supplier.save();
        }
      }
    }

    const updatedPurchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('supplier', 'name email').populate('items.product', 'name sku');

    // Log activity
    await logActivity(req.user._id, 'update', 'purchase', purchase._id, 
      `Updated purchase order: ${purchase.purchaseOrderNumber}`);

    res.status(200).json({
      success: true,
      message: 'Purchase order updated successfully',
      data: updatedPurchase
    });
  } catch (error) {
    next(error);
  }
};

// Update purchase status
export const updatePurchaseStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const validStatuses = ['draft', 'pending', 'approved', 'ordered', 'partially_received', 'received', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Handle status changes
    if (status !== purchase.status) {
      // If changing from draft to another status, update supplier data
      if (purchase.status === 'draft' && status !== 'draft' && status !== 'cancelled') {
        const supplier = await Supplier.findById(purchase.supplier);
        if (supplier) {
          supplier.totalOrders += 1;
          supplier.totalPurchaseAmount += purchase.grandTotal;
          supplier.lastOrderDate = new Date();
          if (purchase.paymentStatus !== 'paid') {
            supplier.currentBalance += purchase.grandTotal;
          }
          await supplier.save();
        }
      }
      
      // If changing to cancelled, revert supplier data
      if (status === 'cancelled' && purchase.status !== 'draft' && purchase.status !== 'cancelled') {
        const supplier = await Supplier.findById(purchase.supplier);
        if (supplier) {
          supplier.totalOrders -= 1;
          supplier.totalPurchaseAmount -= purchase.grandTotal;
          if (purchase.paymentStatus !== 'paid') {
            supplier.currentBalance -= purchase.grandTotal;
          }
          await supplier.save();
        }
      }
      
      // If changing from cancelled to another status, update supplier data
      if (purchase.status === 'cancelled' && status !== 'draft' && status !== 'cancelled') {
        const supplier = await Supplier.findById(purchase.supplier);
        if (supplier) {
          supplier.totalOrders += 1;
          supplier.totalPurchaseAmount += purchase.grandTotal;
          supplier.lastOrderDate = new Date();
          if (purchase.paymentStatus !== 'paid') {
            supplier.currentBalance += purchase.grandTotal;
          }
          await supplier.save();
        }
      }
      
      // If changing to approved, set approvedBy and approvedAt
      if (status === 'approved') {
        purchase.approvedBy = req.user._id;
        purchase.approvedAt = new Date();
      }
    }

    purchase.status = status;
    await purchase.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'purchase', purchase._id, 
      `Updated status of purchase order ${purchase.purchaseOrderNumber} to ${status}`);

    res.status(200).json({
      success: true,
      message: `Purchase status updated to ${status} successfully`,
      data: {
        id: purchase._id,
        status: purchase.status
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
    
    const validStatuses = ['unpaid', 'partially_paid', 'paid'];
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Update supplier balance
    const supplier = await Supplier.findById(purchase.supplier);
    if (supplier && purchase.status !== 'draft' && purchase.status !== 'cancelled') {
      // If changing to paid, reduce supplier balance
      if (paymentStatus === 'paid' && purchase.paymentStatus !== 'paid') {
        supplier.currentBalance -= purchase.grandTotal;
        await supplier.save();
      }
      // If changing from paid, increase supplier balance
      else if (paymentStatus !== 'paid' && purchase.paymentStatus === 'paid') {
        supplier.currentBalance += purchase.grandTotal;
        await supplier.save();
      }
    }

    purchase.paymentStatus = paymentStatus;
    if (paymentMethod) {
      purchase.paymentMethod = paymentMethod;
    }
    await purchase.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'purchase', purchase._id, 
      `Updated payment status of purchase order ${purchase.purchaseOrderNumber} to ${paymentStatus}`);

    res.status(200).json({
      success: true,
      message: `Payment status updated to ${paymentStatus} successfully`,
      data: {
        id: purchase._id,
        paymentStatus: purchase.paymentStatus,
        paymentMethod: purchase.paymentMethod
      }
    });
  } catch (error) {
    next(error);
  }
};

// Receive purchase items
export const receivePurchaseItems = async (req, res, next) => {
  try {
    const { receivedItems } = req.body;
    
    if (!receivedItems || !Array.isArray(receivedItems) || receivedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Received items are required'
      });
    }

    const purchase = await Purchase.findById(req.params.id).populate('items.product');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Don't allow receiving if cancelled
    if (purchase.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot receive items for cancelled purchase order'
      });
    }

    // Update received quantities and stock
    for (const receivedItem of receivedItems) {
      const purchaseItem = purchase.items.id(receivedItem.itemId);
      if (!purchaseItem) {
        return res.status(400).json({
          success: false,
          message: `Item not found: ${receivedItem.itemId}`
        });
      }
      
      // Validate quantity
      if (receivedItem.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be greater than zero'
        });
      }
      
      // Check if quantity exceeds remaining quantity
      const remainingQuantity = purchaseItem.quantity - purchaseItem.receivedQuantity;
      if (receivedItem.quantity > remainingQuantity) {
        return res.status(400).json({
          success: false,
          message: `Quantity exceeds remaining quantity for ${purchaseItem.product.name}. Remaining: ${remainingQuantity}`
        });
      }
      
      // Update received quantity
      purchaseItem.receivedQuantity += receivedItem.quantity;
      
      // Update product stock
      const product = await Product.findById(purchaseItem.product._id);
      if (product) {
        const previousStock = product.currentStock;
        product.currentStock += receivedItem.quantity;
        product.totalPurchased += receivedItem.quantity;
        await product.save();

        // Create stock movement
        await StockMovement.create({
          product: product._id,
          type: 'in',
          reason: 'purchase',
          quantity: receivedItem.quantity,
          previousStock,
          newStock: product.currentStock,
          unitCost: purchaseItem.unitPrice,
          totalCost: purchaseItem.unitPrice * receivedItem.quantity,
          reference: {
            type: 'purchase',
            id: purchase._id,
            number: purchase.purchaseOrderNumber
          },
          performedBy: req.user._id
        });
      }
    }

    // Check if all items are fully received
    const allReceived = purchase.items.every(item => 
      item.receivedQuantity >= item.quantity
    );

    if (allReceived) {
      purchase.status = 'received';
      purchase.actualDeliveryDate = new Date();
    } else {
      purchase.status = 'partially_received';
    }

    await purchase.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'purchase', purchase._id, 
      `Received items for purchase order: ${purchase.purchaseOrderNumber}`);

    res.status(200).json({
      success: true,
      message: 'Items received successfully',
      data: purchase
    });
  } catch (error) {
    next(error);
  }
};

// Delete purchase
export const deletePurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Don't allow deletion if items have been received
    if (purchase.status === 'received' || purchase.status === 'partially_received') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete purchase order with received items'
      });
    }

    // Update supplier data if not draft or cancelled
    if (purchase.status !== 'draft' && purchase.status !== 'cancelled') {
      const supplier = await Supplier.findById(purchase.supplier);
      if (supplier) {
        supplier.totalOrders -= 1;
        supplier.totalPurchaseAmount -= purchase.grandTotal;
        if (purchase.paymentStatus !== 'paid') {
          supplier.currentBalance -= purchase.grandTotal;
        }
        await supplier.save();
      }
    }

    await Purchase.findByIdAndDelete(req.params.id);

    // Log activity
    await logActivity(req.user._id, 'delete', 'purchase', purchase._id, 
      `Deleted purchase order: ${purchase.purchaseOrderNumber}`);

    res.status(200).json({
      success: true,
      message: 'Purchase order deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get purchase dashboard stats
export const getPurchaseDashboard = async (req, res, next) => {
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

    // Get total purchases
    const totalPurchases = await Purchase.countDocuments({});
    
    // Get purchases by status
    const statusCounts = {
      draft: await Purchase.countDocuments({ status: 'draft' }),
      pending: await Purchase.countDocuments({ status: 'pending' }),
      approved: await Purchase.countDocuments({ status: 'approved' }),
      ordered: await Purchase.countDocuments({ status: 'ordered' }),
      partially_received: await Purchase.countDocuments({ status: 'partially_received' }),
      received: await Purchase.countDocuments({ status: 'received' }),
      cancelled: await Purchase.countDocuments({ status: 'cancelled' })
    };
    
    // Get purchases by payment status
    const paymentStatusCounts = {
      unpaid: await Purchase.countDocuments({ paymentStatus: 'unpaid' }),
      partially_paid: await Purchase.countDocuments({ paymentStatus: 'partially_paid' }),
      paid: await Purchase.countDocuments({ paymentStatus: 'paid' })
    };
    
    // Get purchase amounts
    const totalAmount = (await Purchase.aggregate([
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]))[0]?.total || 0;
    
    const paidAmount = (await Purchase.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]))[0]?.total || 0;
    
    const unpaidAmount = (await Purchase.aggregate([
      { $match: { paymentStatus: { $ne: 'paid' } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]))[0]?.total || 0;
    
    // Get today's purchases
    const todayPurchases = await Purchase.countDocuments({
      orderDate: { $gte: startOfToday, $lte: endOfToday }
    });
    
    const todayAmount = (await Purchase.aggregate([
      { $match: { orderDate: { $gte: startOfToday, $lte: endOfToday } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]))[0]?.total || 0;
    
    // Get this week's purchases
    const weekPurchases = await Purchase.countDocuments({
      orderDate: { $gte: startOfWeek }
    });
    
    const weekAmount = (await Purchase.aggregate([
      { $match: { orderDate: { $gte: startOfWeek } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]))[0]?.total || 0;
    
    // Get this month's purchases
    const monthPurchases = await Purchase.countDocuments({
      orderDate: { $gte: startOfMonth }
    });
    
    const monthAmount = (await Purchase.aggregate([
      { $match: { orderDate: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]))[0]?.total || 0;
    
    // Get purchases by month for the current year
    const purchasesByMonth = await Purchase.aggregate([
      { 
        $match: { 
          orderDate: { $gte: startOfYear },
          status: { $ne: 'cancelled' }
        } 
      },
      {
        $group: {
          _id: { $month: '$orderDate' },
          count: { $sum: 1 },
          total: { $sum: '$grandTotal' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Format purchases by month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedPurchasesByMonth = Array.from({ length: 12 }, (_, i) => {
      const monthData = purchasesByMonth.find(m => m._id === i + 1);
      return {
        month: monthNames[i],
        count: monthData?.count || 0,
        total: monthData?.total || 0
      };
    });
    
    // Get top suppliers
    const topSuppliers = await Purchase.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$supplier',
          count: { $sum: 1 },
          total: { $sum: '$grandTotal' }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplierDetails'
        }
      },
      {
        $addFields: {
          supplierName: { $arrayElemAt: ['$supplierDetails.name', 0] },
          supplierEmail: { $arrayElemAt: ['$supplierDetails.email', 0] }
        }
      },
      {
        $project: {
          supplierDetails: 0
        }
      }
    ]);
    
    // Get top products
    const topProducts = await Purchase.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
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
    
    // Get recent purchases
    const recentPurchases = await Purchase.find({})
      .populate('supplier', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        counts: {
          total: totalPurchases,
          today: todayPurchases,
          week: weekPurchases,
          month: monthPurchases
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
        purchasesByMonth: formattedPurchasesByMonth,
        topSuppliers,
        topProducts,
        recentPurchases
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get supplier purchase history
export const getSupplierPurchaseHistory = async (req, res, next) => {
  try {
    const { supplierId } = req.params;
    
    // Verify supplier exists
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get purchases for this supplier
    const purchases = await Purchase.find({ supplier: supplierId })
      .populate('items.product', 'name sku')
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Purchase.countDocuments({ supplier: supplierId });
    
    // Calculate summary statistics
    const summary = {
      totalPurchases: total,
      totalAmount: (await Purchase.aggregate([
        { $match: { supplier: mongoose.Types.ObjectId(supplierId) } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]))[0]?.total || 0,
      paidAmount: (await Purchase.aggregate([
        { $match: { supplier: mongoose.Types.ObjectId(supplierId), paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]))[0]?.total || 0,
      unpaidAmount: (await Purchase.aggregate([
        { $match: { supplier: mongoose.Types.ObjectId(supplierId), paymentStatus: { $ne: 'paid' } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]))[0]?.total || 0,
      averageOrderValue: total > 0 ? 
        ((await Purchase.aggregate([
          { $match: { supplier: mongoose.Types.ObjectId(supplierId) } },
          { $group: { _id: null, total: { $sum: '$grandTotal' } } }
        ]))[0]?.total || 0) / total : 0,
      lastOrderDate: (await Purchase.findOne({ supplier: supplierId }).sort({ orderDate: -1 }))?.orderDate
    };
    
    // Get frequently purchased products
    const frequentProducts = await Purchase.aggregate([
      { $match: { supplier: mongoose.Types.ObjectId(supplierId) } },
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
        purchases,
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

// Export purchases data
export const exportPurchases = async (req, res, next) => {
  try {
    const { format = 'csv', filters = {} } = req.query;
    
    // Build query based on filters
    const query = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
    if (filters.supplier) query.supplier = filters.supplier;
    
    if (filters.startDate && filters.endDate) {
      query.orderDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    } else if (filters.startDate) {
      query.orderDate = { $gte: new Date(filters.startDate) };
    } else if (filters.endDate) {
      query.orderDate = { $lte: new Date(filters.endDate) };
    }

    const purchases = await Purchase.find(query)
      .populate('supplier', 'name email')
      .populate('createdBy', 'firstName lastName')
      .sort({ orderDate: -1 });

    // Format data for export
    const exportData = purchases.map(purchase => ({
      purchaseOrderNumber: purchase.purchaseOrderNumber,
      supplier: purchase.supplier?.name || 'Unknown',
      supplierEmail: purchase.supplier?.email || '',
      date: new Date(purchase.orderDate).toISOString().split('T')[0],
      expectedDeliveryDate: purchase.expectedDeliveryDate ? new Date(purchase.expectedDeliveryDate).toISOString().split('T')[0] : '',
      actualDeliveryDate: purchase.actualDeliveryDate ? new Date(purchase.actualDeliveryDate).toISOString().split('T')[0] : '',
      status: purchase.status,
      paymentStatus: purchase.paymentStatus,
      paymentMethod: purchase.paymentMethod || '',
      subtotal: purchase.subtotal,
      discount: purchase.totalDiscount,
      tax: purchase.totalTax,
      shipping: purchase.shippingCost,
      total: purchase.grandTotal,
      itemCount: purchase.items.length,
      createdBy: purchase.createdBy ? `${purchase.createdBy.firstName} ${purchase.createdBy.lastName}` : '',
      createdAt: new Date(purchase.createdAt).toISOString().split('T')[0]
    }));

    // Log activity
    await logActivity(req.user._id, 'export', 'purchase', null, 
      `Exported ${exportData.length} purchases in ${format.toUpperCase()} format`);

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