// src/db.js
import Dexie from 'dexie';

export const db = new Dexie('GroceryPOSDatabase');

db.version(1).stores({
  products: '++id, name, price, barcode, category, unit, stock',
  salesQueue: '++id, receiptNo, items, total, amountPaid, change, paymentMethod, timestamp, status'
});

// Populate sample grocery items on first launch
db.on('populate', () => {
  db.products.bulkAdd([
    { name: 'Fresh Milk 1L', price: 2.50, barcode: '479000000001', category: 'Dairy', unit: 'pcs', stock: 50 },
    { name: 'White Rice', price: 1.80, barcode: '479000000002', category: 'Grains', unit: 'kg', stock: 100 },
    { name: 'White Bread', price: 1.50, barcode: '479000000003', category: 'Bakery', unit: 'pcs', stock: 25 },
    { name: 'Red Apples', price: 3.20, barcode: '479000000004', category: 'Produce', unit: 'kg', stock: 40 },
    { name: 'Coca Cola 1.5L', price: 2.00, barcode: '5449000000996', category: 'Beverages', unit: 'pcs', stock: 60 },
  ]);
});