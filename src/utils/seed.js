const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const Product = require('../models/Product');
const connectDB = require('../config/db');

const sampleProducts = [
  // 1. Furniture (Low Stock Item 1 - Matches Postman Screenshot)
  {
    name: 'Study Table',
    sku: 'FURN-TB-812',
    category: 'Furniture',
    price: 3999,
    quantity: 2,
    reorderLevel: 4,
    supplier: 'IKEA India'
  },
  // 2. Electronics (Matches Postman Screenshot avgPrice: 5636.5)
  {
    name: 'Wireless Noise Cancelling Headphones',
    sku: 'ELEC-HP-101',
    category: 'Electronics',
    price: 7999,
    quantity: 20,
    reorderLevel: 5,
    supplier: 'Sony India'
  },
  // 3. Electronics
  {
    name: 'Mechanical Gaming Keyboard',
    sku: 'ELEC-KB-204',
    category: 'Electronics',
    price: 3499,
    quantity: 30,
    reorderLevel: 10,
    supplier: 'Logitech'
  },
  // 4. Electronics
  {
    name: 'USB-C Fast Charger 65W',
    sku: 'ELEC-CH-305',
    category: 'Electronics',
    price: 1499,
    quantity: 45,
    reorderLevel: 15,
    supplier: 'Anker'
  },
  // 5. Electronics (Low Stock Item 2)
  {
    name: 'Smart Fitness Watch',
    sku: 'ELEC-WT-402',
    category: 'Electronics',
    price: 9549,
    quantity: 1,
    reorderLevel: 3,
    supplier: 'Noise'
  },
  // 6. Apparel (Matches Postman Screenshot avgPrice: 1399, totalQuantity: 78)
  {
    name: 'Cotton Slim Fit Shirt',
    sku: 'APRL-SH-501',
    category: 'Apparel',
    price: 1599,
    quantity: 50,
    reorderLevel: 10,
    supplier: 'Zara'
  },
  // 7. Apparel
  {
    name: 'Denim Regular Fit Jeans',
    sku: 'APRL-JN-502',
    category: 'Apparel',
    price: 1199,
    quantity: 28,
    reorderLevel: 5,
    supplier: "Levi's"
  },
  // 8. Stationery (Matches Postman Screenshot)
  {
    name: 'Gel Pen Pack of 15',
    sku: 'STNY-PN-713',
    category: 'Stationery',
    price: 120,
    quantity: 40,
    reorderLevel: 20,
    supplier: 'Cello Pens'
  },
  // 9. Stationery
  {
    name: 'A4 Spiral Notebook 200 Pages',
    sku: 'STNY-NB-714',
    category: 'Stationery',
    price: 85,
    quantity: 120,
    reorderLevel: 30,
    supplier: 'Classmate'
  },
  // 10. Furniture (Low Stock Item 3)
  {
    name: 'Executive Ergonomic Chair',
    sku: 'FURN-CH-815',
    category: 'Furniture',
    price: 7499,
    quantity: 3,
    reorderLevel: 5,
    supplier: 'Godrej Interio'
  },
  // 11. Footwear (Low Stock Item 4)
  {
    name: 'Pro Running Shoes',
    sku: 'FOOT-SH-901',
    category: 'Footwear',
    price: 3299,
    quantity: 4,
    reorderLevel: 6,
    supplier: 'Puma'
  },
  // 12. Footwear
  {
    name: 'Casual Slip-on Sneakers',
    sku: 'FOOT-SN-902',
    category: 'Footwear',
    price: 2199,
    quantity: 25,
    reorderLevel: 5,
    supplier: 'Bata'
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('Clearing existing product collection...');
    await Product.deleteMany({});

    console.log('Inserting seed products...');
    const inserted = await Product.insertMany(sampleProducts);

    console.log(`Successfully seeded ${inserted.length} products across 5 categories.`);
    console.log('Low stock items (quantity <= reorderLevel): 4');

    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding database: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
