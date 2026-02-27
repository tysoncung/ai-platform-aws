/**
 * Seed MongoDB with sample product catalog data.
 */
import { MongoClient } from 'mongodb';

const PRODUCTS = [
  {
    name: 'Wireless Bluetooth Headphones',
    description: 'Over-ear headphones with active noise cancellation, 30-hour battery life, and premium sound quality. Features Bluetooth 5.3 and multipoint connection.',
    price: 149.99,
    category: 'Electronics',
    tags: [],
  },
  {
    name: 'Organic Green Tea Collection',
    description: 'Assorted pack of 6 organic green teas from Japan. Includes sencha, matcha, genmaicha, hojicha, gyokuro, and kukicha varieties.',
    price: 29.99,
    category: 'Food & Beverage',
    tags: [],
  },
  {
    name: 'Ergonomic Standing Desk',
    description: 'Electric height-adjustable desk with memory presets, cable management, and bamboo top. Supports up to 150 lbs.',
    price: 499.99,
    category: 'Furniture',
    tags: [],
  },
  {
    name: 'Yoga Mat Premium',
    description: 'Extra thick 6mm non-slip yoga mat made from natural rubber. Eco-friendly, includes carrying strap. Great for yoga, pilates, and stretching.',
    price: 45.99,
    category: 'Sports & Fitness',
    tags: [],
  },
  {
    name: 'Stainless Steel Water Bottle',
    description: 'Double-wall vacuum insulated water bottle. Keeps drinks cold for 24 hours or hot for 12 hours. BPA-free, 32oz capacity.',
    price: 24.99,
    category: 'Kitchen',
    tags: [],
  },
  {
    name: 'LED Desk Lamp',
    description: 'Adjustable LED desk lamp with 5 color temperatures and 10 brightness levels. USB charging port, touch controls, and memory function.',
    price: 39.99,
    category: 'Electronics',
    tags: [],
  },
  {
    name: 'Leather Journal Notebook',
    description: 'Handmade genuine leather journal with 200 pages of acid-free paper. Features a wrap-around closure and bookmark ribbon.',
    price: 34.99,
    category: 'Stationery',
    tags: [],
  },
  {
    name: 'Indoor Herb Garden Kit',
    description: 'Self-watering indoor garden system with LED grow lights. Includes seeds for basil, cilantro, parsley, mint, thyme, and dill.',
    price: 69.99,
    category: 'Home & Garden',
    tags: [],
  },
  {
    name: 'Portable Espresso Maker',
    description: 'Hand-powered portable espresso machine. No batteries or electricity needed. Compatible with ground coffee and capsules.',
    price: 89.99,
    category: 'Kitchen',
    tags: [],
  },
  {
    name: 'Smart Fitness Tracker',
    description: 'Waterproof fitness tracker with heart rate monitoring, sleep tracking, GPS, and 7-day battery life. Compatible with iOS and Android.',
    price: 79.99,
    category: 'Electronics',
    tags: [],
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'product_catalog';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('products');

    // Clear existing data
    await collection.deleteMany({});

    // Insert sample products
    const result = await collection.insertMany(PRODUCTS);
    console.log(`Seeded ${result.insertedCount} products into ${dbName}.products`);

    // List products
    const products = await collection.find({}, { projection: { name: 1, category: 1, tags: 1 } }).toArray();
    for (const p of products) {
      console.log(`  - ${p.name} [${p.category}] tags: ${p.tags.length === 0 ? '(none)' : p.tags.join(', ')}`);
    }
  } finally {
    await client.close();
  }
}

seed().catch(console.error);
