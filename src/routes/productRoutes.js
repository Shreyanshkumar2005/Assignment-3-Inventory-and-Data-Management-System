const express = require('express');
const router = express.Router();
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  adjustStock,
  deleteProduct,
  getLowStockProducts,
  getCategorySummary
} = require('../controllers/productController');
const {
  validateObjectId,
  validateCreateProduct,
  validateStockAdjustment
} = require('../middleware/validateRequest');

// Product collection routes & reports (specific paths must precede /:id)
router.route('/')
  .post(validateCreateProduct, createProduct)
  .get(getProducts);

router.get('/low-stock', getLowStockProducts);
router.get('/summary', getCategorySummary);

// Specific product document routes
router.route('/:id')
  .get(validateObjectId('id'), getProductById)
  .put(validateObjectId('id'), updateProduct)
  .delete(validateObjectId('id'), deleteProduct);

// Stock adjustment route (restock and sales)
router.patch('/:id/stock', validateObjectId('id'), validateStockAdjustment, adjustStock);

module.exports = router;
