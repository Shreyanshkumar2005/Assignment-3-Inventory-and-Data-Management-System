const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters long']
    },
    sku: {
      type: String,
      required: [true, 'Product SKU is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be a non-negative number']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity must be a non-negative number'],
      default: 0
    },
    reorderLevel: {
      type: Number,
      required: [true, 'Reorder level is required'],
      min: [0, 'Reorder level must be a non-negative number'],
      default: 5
    },
    supplier: {
      type: String,
      required: [true, 'Supplier is required'],
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field for calculated stock value
productSchema.virtual('stockValue').get(function () {
  return (this.price || 0) * (this.quantity || 0);
});

// Indexing for search and filtering efficiency
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', sku: 'text' });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
