const express = require('express');
const productRoutes = require('./routes/productRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health / Welcome endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Inventory and Data Management System API is running',
    version: '1.0.0',
    documentation: {
      products: '/api/products',
      lowStock: '/api/products/low-stock',
      summary: '/api/products/summary'
    }
  });
});

// Mount routes
app.use('/api/products', productRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;
