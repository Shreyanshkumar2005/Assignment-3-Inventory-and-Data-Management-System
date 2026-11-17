const Product = require('../models/Product');

// @desc    Create a new product
// @route   POST /api/products
// @access  Public
const createProduct = async (req, res, next) => {
  try {
    const { name, sku, category, price, quantity, reorderLevel, supplier } = req.body;

    const product = await Product.create({
      name,
      sku,
      category,
      price,
      quantity,
      reorderLevel: reorderLevel !== undefined ? reorderLevel : 5,
      supplier
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all products with filtering, sorting, and pagination
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      supplier,
      search,
      minPrice,
      maxPrice,
      inStock,
      sortBy,
      sort,
      order
    } = req.query;

    const query = {};

    // Filter by Category
    if (category) {
      query.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    // Filter by Supplier
    if (supplier) {
      query.supplier = { $regex: new RegExp(supplier.trim(), 'i') };
    }

    // Filter by Search Term (matches Name or SKU)
    if (search) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [{ name: searchRegex }, { sku: searchRegex }];
    }

    // Filter by Price Range
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined && !isNaN(Number(minPrice))) {
        query.price.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
        query.price.$lte = Number(maxPrice);
      }
    }

    // Filter by Stock Status
    if (inStock !== undefined) {
      if (inStock === 'true' || inStock === true) {
        query.quantity = { $gt: 0 };
      } else if (inStock === 'false' || inStock === false) {
        query.quantity = 0;
      }
    }

    // Sorting logic
    let sortOption = { createdAt: -1 }; // Default sort: newest first
    const sortField = sortBy || sort;

    if (sortField) {
      if (typeof sortField === 'string' && sortField.includes(':')) {
        const [field, direction] = sortField.split(':');
        sortOption = { [field]: direction.toLowerCase() === 'desc' ? -1 : 1 };
      } else {
        const direction = order && order.toLowerCase() === 'desc' ? -1 : 1;
        sortOption = { [sortField]: direction };
      }
    }

    // Pagination calculations
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.status(200).json({
      total,
      page: pageNum,
      totalPages,
      count: products.length,
      products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: `Product not found with id: ${req.params.id}`
      });
    }

    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

// @desc    Update product details
// @route   PUT /api/products/:id
// @access  Public
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        returnDocument: 'after',
        runValidators: true
      }
    );

    if (!product) {
      return res.status(404).json({
        message: `Product not found with id: ${req.params.id}`
      });
    }

    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

// @desc    Adjust product stock safely (restock and sale operations)
// @route   PATCH /api/products/:id/stock
// @access  Public
const adjustStock = async (req, res, next) => {
  try {
    const { change } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: `Product not found with id: ${req.params.id}`
      });
    }

    const newQuantity = product.quantity + change;

    // Safety check: Prevent stock level from falling below 0
    if (newQuantity < 0) {
      return res.status(400).json({
        message: `Insufficient stock for sale. Current stock is ${product.quantity}, requested reduction is ${Math.abs(
          change
        )}.`
      });
    }

    product.quantity = newQuantity;
    await product.save();

    res.status(200).json({
      message: 'Stock updated',
      product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Public
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: `Product not found with id: ${req.params.id}`
      });
    }

    res.status(200).json({
      message: 'Product deleted',
      id: req.params.id
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get low stock items report (quantity <= reorderLevel)
// @route   GET /api/products/low-stock
// @access  Public
const getLowStockProducts = async (req, res, next) => {
  try {
    const { threshold } = req.query;

    // Use query threshold if explicitly provided, else compare against each item's reorderLevel
    const filter =
      threshold !== undefined && !isNaN(Number(threshold))
        ? { quantity: { $lte: Number(threshold) } }
        : { $expr: { $lte: ['$quantity', '$reorderLevel'] } };

    const lowStockItems = await Product.find(filter).sort({ quantity: 1 });

    res.status(200).json({
      count: lowStockItems.length,
      lowStockItems
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category-wise inventory summary using aggregation
// @route   GET /api/products/summary
// @access  Public
const getCategorySummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          avgPrice: { $avg: '$price' }
        }
      },
      {
        $project: {
          _id: 1,
          totalItems: 1,
          totalQuantity: 1,
          totalStockValue: 1,
          avgPrice: { $round: ['$avgPrice', 2] }
        }
      },
      {
        $sort: { totalStockValue: -1 }
      }
    ]);

    res.status(200).json({
      categories: summary.length,
      summary
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  adjustStock,
  deleteProduct,
  getLowStockProducts,
  getCategorySummary
};
