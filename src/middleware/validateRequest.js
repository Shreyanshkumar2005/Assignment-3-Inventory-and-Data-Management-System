const mongoose = require('mongoose');

// Validate Mongoose ObjectId in route parameters
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: `Invalid ID format: '${id}'. Must be a valid 24-character hexadecimal ObjectId.`
      });
    }
    next();
  };
};

// Validate request body for creating a product
const validateCreateProduct = (req, res, next) => {
  const { name, sku, category, price, quantity, supplier } = req.body;
  const missingFields = [];

  if (!name || typeof name !== 'string' || !name.trim()) missingFields.push('name');
  if (!sku || typeof sku !== 'string' || !sku.trim()) missingFields.push('sku');
  if (!category || typeof category !== 'string' || !category.trim()) missingFields.push('category');
  if (price === undefined || price === null || typeof price !== 'number' || price < 0) {
    if (price === undefined || price === null) missingFields.push('price (must be a non-negative number)');
  }
  if (quantity === undefined || quantity === null || typeof quantity !== 'number' || quantity < 0) {
    if (quantity === undefined || quantity === null) missingFields.push('quantity (must be a non-negative number)');
  }
  if (!supplier || typeof supplier !== 'string' || !supplier.trim()) missingFields.push('supplier');

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: `Validation failed. Missing or invalid required fields: ${missingFields.join(', ')}`
    });
  }

  next();
};

// Validate stock adjustment request body
const validateStockAdjustment = (req, res, next) => {
  const { change } = req.body;

  if (change === undefined || change === null) {
    return res.status(400).json({
      message: "Request body must include a 'change' field representing the stock increment or decrement."
    });
  }

  if (typeof change !== 'number' || !Number.isInteger(change) || change === 0) {
    return res.status(400).json({
      message: "The 'change' field must be a non-zero integer (positive for restock, negative for sale)."
    });
  }

  next();
};

module.exports = {
  validateObjectId,
  validateCreateProduct,
  validateStockAdjustment
};
