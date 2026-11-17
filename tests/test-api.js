const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const app = require('../src/app');
const connectDB = require('../src/config/db');

// Run tests
const runTests = async () => {
  await connectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`\n🧪 Test server running at ${baseUrl}\n`);

  let passed = 0;
  let failed = 0;

  const assert = (condition, description) => {
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
      failed++;
    }
  };

  try {
    // 1. Health check
    console.log('--- Test 1: Root / Health Check ---');
    const healthRes = await fetch(`${baseUrl}/`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Status is 200');
    assert(healthData.message.includes('Inventory'), 'Contains API message');

    // 2. GET /api/products (Pagination)
    console.log('\n--- Test 2: GET /api/products (Pagination & Virtuals) ---');
    const getRes = await fetch(`${baseUrl}/api/products?page=1&limit=10`);
    const getData = await getRes.json();
    assert(getRes.status === 200, 'Status is 200');
    assert(getData.total >= 12, `Total items is >= 12 (got ${getData.total})`);
    assert(getData.page === 1, 'Page is 1');
    assert(getData.count === 10, 'Count is 10');
    assert(getData.totalPages >= 2, 'Total pages >= 2');
    const firstProduct = getData.products[0];
    assert(firstProduct.stockValue !== undefined, 'Product has virtual stockValue');
    assert(firstProduct.stockValue === firstProduct.price * firstProduct.quantity, 'stockValue equals price * quantity');
    assert(firstProduct.id !== undefined, 'Product has id getter');

    // 3. GET /api/products (Filtering by category)
    console.log('\n--- Test 3: GET /api/products (Filtering by Category) ---');
    const catRes = await fetch(`${baseUrl}/api/products?category=Furniture`);
    const catData = await catRes.json();
    assert(catRes.status === 200, 'Status is 200');
    assert(catData.products.every(p => p.category.toLowerCase() === 'furniture'), 'All returned products belong to Furniture');

    // 4. GET /api/products (Search query)
    console.log('\n--- Test 4: GET /api/products (Search Query) ---');
    const searchRes = await fetch(`${baseUrl}/api/products?search=Study Table`);
    const searchData = await searchRes.json();
    assert(searchRes.status === 200, 'Status is 200');
    assert(searchData.products.some(p => p.sku === 'FURN-TB-812'), 'Found Study Table by search');

    // 5. GET /api/products (Sorting)
    console.log('\n--- Test 5: GET /api/products (Sorting by Price Descending) ---');
    const sortRes = await fetch(`${baseUrl}/api/products?sortBy=price:desc`);
    const sortData = await sortRes.json();
    assert(sortRes.status === 200, 'Status is 200');
    let isSorted = true;
    for (let i = 0; i < sortData.products.length - 1; i++) {
      if (sortData.products[i].price < sortData.products[i + 1].price) {
        isSorted = false;
        break;
      }
    }
    assert(isSorted, 'Products are sorted by price in descending order');

    // 6. GET /api/products/low-stock
    console.log('\n--- Test 6: GET /api/products/low-stock ---');
    const lowStockRes = await fetch(`${baseUrl}/api/products/low-stock`);
    const lowStockData = await lowStockRes.json();
    assert(lowStockRes.status === 200, 'Status is 200');
    assert(lowStockData.count === 4, `Low stock count is 4 (got ${lowStockData.count})`);
    assert(
      lowStockData.lowStockItems.every(p => p.quantity <= p.reorderLevel),
      'All low stock items have quantity <= reorderLevel'
    );

    // 7. GET /api/products/summary (Aggregation)
    console.log('\n--- Test 7: GET /api/products/summary (Aggregation) ---');
    const summaryRes = await fetch(`${baseUrl}/api/products/summary`);
    const summaryData = await summaryRes.json();
    assert(summaryRes.status === 200, 'Status is 200');
    assert(summaryData.categories === 5, `Summary has 5 categories (got ${summaryData.categories})`);
    const electronics = summaryData.summary.find(s => s._id === 'Electronics');
    assert(electronics !== undefined, 'Electronics group present');
    assert(electronics.totalItems === 4, `Electronics total items is 4 (got ${electronics.totalItems})`);
    assert(electronics.totalQuantity === 96, `Electronics total quantity is 96 (got ${electronics.totalQuantity})`);
    assert(electronics.avgPrice === 5636.5, `Electronics avgPrice is 5636.5 (got ${electronics.avgPrice})`);

    // 8. POST /api/products (Create Product)
    console.log('\n--- Test 8: POST /api/products (Create Product) ---');
    const newProductPayload = {
      name: 'Wireless Bluetooth Mouse',
      sku: 'TEST-MS-999',
      category: 'Electronics',
      price: 650,
      quantity: 50,
      reorderLevel: 10,
      supplier: 'Logitech India'
    };
    const createRes = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProductPayload)
    });
    const createdProduct = await createRes.json();
    assert(createRes.status === 201, 'Status is 201 Created');
    assert(createdProduct.name === newProductPayload.name, 'Product name matches');
    assert(createdProduct.stockValue === 650 * 50, `stockValue calculated correctly: ${createdProduct.stockValue}`);
    const createdId = createdProduct._id;

    // 9. Validation: Duplicate SKU
    console.log('\n--- Test 9: Duplicate SKU Validation (409 Conflict) ---');
    const dupRes = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProductPayload)
    });
    assert(dupRes.status === 409, `Duplicate SKU returns 409 Conflict (got ${dupRes.status})`);

    // 10. GET /api/products/:id (Get Single Product)
    console.log('\n--- Test 10: GET /api/products/:id ---');
    const getSingleRes = await fetch(`${baseUrl}/api/products/${createdId}`);
    const singleData = await getSingleRes.json();
    assert(getSingleRes.status === 200, 'Status is 200');
    assert(singleData.sku === 'TEST-MS-999', 'Returned correct single product');

    // 11. PUT /api/products/:id (Update Product Details)
    console.log('\n--- Test 11: PUT /api/products/:id (Update Details) ---');
    const updateRes = await fetch(`${baseUrl}/api/products/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 700, quantity: 40 })
    });
    const updatedData = await updateRes.json();
    assert(updateRes.status === 200, 'Status is 200');
    assert(updatedData.price === 700, 'Price updated to 700');
    assert(updatedData.quantity === 40, 'Quantity updated to 40');
    assert(updatedData.stockValue === 28000, `stockValue recalculated to 28000 (got ${updatedData.stockValue})`);

    // 12. PATCH /api/products/:id/stock (Stock Adjustment - Restock)
    console.log('\n--- Test 12: PATCH /api/products/:id/stock (Restock +10) ---');
    const restockRes = await fetch(`${baseUrl}/api/products/${createdId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ change: 10 })
    });
    const restockData = await restockRes.json();
    assert(restockRes.status === 200, 'Status is 200');
    assert(restockData.message === 'Stock updated', 'Message is "Stock updated"');
    assert(restockData.product.quantity === 50, `Quantity incremented to 50 (got ${restockData.product.quantity})`);

    // 13. PATCH /api/products/:id/stock (Stock Adjustment - Sale)
    console.log('\n--- Test 13: PATCH /api/products/:id/stock (Sale -20) ---');
    const saleRes = await fetch(`${baseUrl}/api/products/${createdId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ change: -20 })
    });
    const saleData = await saleRes.json();
    assert(saleRes.status === 200, 'Status is 200');
    assert(saleData.product.quantity === 30, `Quantity decremented to 30 (got ${saleData.product.quantity})`);

    // 14. PATCH /api/products/:id/stock (Safety Check - Insufficient Stock)
    console.log('\n--- Test 14: PATCH /api/products/:id/stock (Insufficient Stock Safety) ---');
    const overSaleRes = await fetch(`${baseUrl}/api/products/${createdId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ change: -100 })
    });
    const overSaleData = await overSaleRes.json();
    assert(overSaleRes.status === 400, `Status is 400 Bad Request (got ${overSaleRes.status})`);
    assert(overSaleData.message.includes('Insufficient stock'), 'Error message warns about insufficient stock');

    // 15. DELETE /api/products/:id (Delete Product)
    console.log('\n--- Test 15: DELETE /api/products/:id ---');
    const deleteRes = await fetch(`${baseUrl}/api/products/${createdId}`, {
      method: 'DELETE'
    });
    const deleteData = await deleteRes.json();
    assert(deleteRes.status === 200, 'Status is 200');
    assert(deleteData.message === 'Product deleted', 'Message is "Product deleted"');
    assert(deleteData.id === createdId, 'Deleted id returned');

    // 16. Verify Deleted Product is 404
    console.log('\n--- Test 16: Verify Deleted Product Returns 404 ---');
    const getDeletedRes = await fetch(`${baseUrl}/api/products/${createdId}`);
    assert(getDeletedRes.status === 404, `Status is 404 Not Found (got ${getDeletedRes.status})`);

    // 17. Invalid ObjectId validation
    console.log('\n--- Test 17: Invalid ObjectId Format (400) ---');
    const invalidIdRes = await fetch(`${baseUrl}/api/products/invalid12345id`);
    assert(invalidIdRes.status === 400, `Status is 400 Bad Request (got ${invalidIdRes.status})`);

    // 18. Undefined route 404
    console.log('\n--- Test 18: Undefined Route (404) ---');
    const undefinedRes = await fetch(`${baseUrl}/api/unknown-endpoint`);
    assert(undefinedRes.status === 404, `Status is 404 Not Found (got ${undefinedRes.status})`);

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
    await mongoose.connection.close();
    console.log(`\n========================================`);
    console.log(`Total tests: ${passed + failed}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`========================================\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
};

runTests();
