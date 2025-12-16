const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads-furniture', express.static(path.join(__dirname, 'uploads-furniture')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads-furniture');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for image uploads
// Use absolute path based on __dirname so it works both locally and in hosting
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'furniture-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Database connection
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'furniture_order_management'
};

let db;

async function initializeDatabase() {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL database');
    
    // Test the connection
    await db.execute('SELECT 1');
    console.log('Database connection tested successfully');
  } catch (error) {
    console.error('Error connecting to database:', error.message);
    console.log('Make sure MySQL is running and the database exists');
    console.log('You can create the database using the provided SQL file');
    process.exit(1);
  }
}

// Helper function to handle database errors
const handleDbError = (error, res, operation) => {
  console.error(`Database error during ${operation}:`, error);
  res.status(500).json({ 
    error: `Failed to ${operation}`, 
    details: error.message 
  });
};

// Helper function to convert undefined to null (for SQL bind parameters)
const nullIfUndefined = (value) => value === undefined ? null : value;

// Products API Routes
// Get products with pagination and search
app.get('/api/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];

    const folderId = req.query.folder_id;
    
    if (search) {
      whereClause = 'WHERE (p.km_code LIKE ? OR p.description LIKE ?)';
      queryParams = [`%${search}%`, `%${search}%`];
    }
    
    if (folderId) {
      if (whereClause) {
        whereClause += ' AND p.folder_id = ?';
        queryParams.push(folderId);
      } else {
        whereClause = 'WHERE p.folder_id = ?';
        queryParams = [folderId];
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM products p ${whereClause}`;
    const [countResult] = await db.execute(countQuery, queryParams);
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // Get products with folder information
    const productsQuery = `
      SELECT p.*, f.name as folder_name, f.color as folder_color 
      FROM products p
      LEFT JOIN product_folders f ON p.folder_id = f.id
      ${whereClause}
      ORDER BY p.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    // Note: p.* includes all columns including client_code, client_barcode, and description (now nullable)
    const [products] = await db.execute(productsQuery, [...queryParams, limit, offset]);

    res.json({
      products,
      totalItems,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    handleDbError(error, res, 'fetch products');
  }
});

// Get products for select dropdown (MUST be before /api/products/:id route)
app.get('/api/products/select', async (req, res) => {
  try {
    const [products] = await db.execute(
      'SELECT p.id, p.client_code, p.client_barcode, p.client_description, p.km_code, p.description, p.cbm, p.fob_price, p.gross_weight, p.net_weight, p.total_gw, p.total_nw, p.picture_url, p.size_width, p.size_depth, p.size_height, p.packing_width, p.packing_depth, p.packing_height, p.color, p.folder_id, f.name as folder_name FROM products p LEFT JOIN product_folders f ON p.folder_id = f.id ORDER BY p.km_code'
    );

    res.json({ products });
  } catch (error) {
    handleDbError(error, res, 'fetch products for select');
  }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const [products] = await db.execute(
      'SELECT p.*, f.name as folder_name, f.color as folder_color FROM products p LEFT JOIN product_folders f ON p.folder_id = f.id WHERE p.id = ?',
      [req.params.id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(products[0]);
  } catch (error) {
    handleDbError(error, res, 'fetch product');
  }
});

// Create product
app.post('/api/products', upload.single('picture'), async (req, res) => {
  try {
    const {
      client_code, client_barcode, client_description, km_code, description, folder_id, size_width, size_depth, size_height,
      packing_width, packing_depth, packing_height, cbm, color,
      gross_weight, net_weight, total_gw, total_nw, fob_price, total_price, hs_code
    } = req.body;

    let picture_url = null;
    if (req.file) {
      picture_url = '/uploads-furniture/' + req.file.filename;
    }

    // Auto-calculate CBM from packing dimensions: W x D x H / 1,000,000
    let calculatedCBM = null;
    if (packing_width && packing_depth && packing_height) {
      const width = parseFloat(packing_width) || 0;
      const depth = parseFloat(packing_depth) || 0;
      const height = parseFloat(packing_height) || 0;
      if (width > 0 && depth > 0 && height > 0) {
        calculatedCBM = ((width * depth * height) / 1000000).toFixed(4);
      }
    }

    // Auto-calculate total_gw from gross_weight
    const calculatedTotalGW = gross_weight || null;

    // Auto-calculate total_nw from net_weight
    const calculatedTotalNW = net_weight || null;

    // Auto-calculate total_price from fob_price
    const calculatedTotalPrice = fob_price || null;

    const [result] = await db.execute(`
      INSERT INTO products (
        client_code, client_barcode, client_description, km_code, description, folder_id, picture_url, size_width, size_depth, size_height,
        packing_width, packing_depth, packing_height, cbm, color,
        gross_weight, net_weight, total_gw, total_nw, fob_price, total_price, hs_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      client_code || null, client_barcode || null, client_description || null, km_code, description || null, folder_id || null, picture_url, size_width, size_depth, size_height,
      packing_width, packing_depth, packing_height, calculatedCBM || cbm, color,
      gross_weight, net_weight, calculatedTotalGW || total_gw, calculatedTotalNW || total_nw || null, 
      fob_price, calculatedTotalPrice || total_price, hs_code
    ]);

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Product created successfully' 
    });
  } catch (error) {
    handleDbError(error, res, 'create product');
  }
});

// Update product
app.put('/api/products/:id', upload.single('picture'), async (req, res) => {
  try {
    const {
      client_code, client_barcode, client_description, km_code, description, folder_id, size_width, size_depth, size_height,
      packing_width, packing_depth, packing_height, cbm, color,
      gross_weight, net_weight, total_gw, total_nw, fob_price, total_price, hs_code
    } = req.body;

    // Get current product to check for existing image
    const [currentProduct] = await db.execute(
      'SELECT picture_url FROM products WHERE id = ?',
      [req.params.id]
    );

    if (currentProduct.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let picture_url = currentProduct[0].picture_url;
    
    // If new image uploaded, delete old one and use new one
    if (req.file) {
      if (picture_url) {
        const oldImagePath = path.join(__dirname, picture_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      picture_url = '/uploads-furniture/' + req.file.filename;
    }

    // Auto-calculate CBM from packing dimensions: W x D x H / 1,000,000
    let calculatedCBM = null;
    if (packing_width && packing_depth && packing_height) {
      const width = parseFloat(packing_width) || 0;
      const depth = parseFloat(packing_depth) || 0;
      const height = parseFloat(packing_height) || 0;
      if (width > 0 && depth > 0 && height > 0) {
        calculatedCBM = ((width * depth * height) / 1000000).toFixed(4);
      }
    }

    // Auto-calculate total_gw from gross_weight
    const calculatedTotalGW = gross_weight || null;

    // Auto-calculate total_nw from net_weight
    const calculatedTotalNW = net_weight || null;

    // Auto-calculate total_price from fob_price
    const calculatedTotalPrice = fob_price || null;

    await db.execute(`
      UPDATE products SET 
        client_code = ?, client_barcode = ?, client_description = ?, km_code = ?, description = ?, folder_id = ?, picture_url = ?, 
        size_width = ?, size_depth = ?, size_height = ?,
        packing_width = ?, packing_depth = ?, packing_height = ?, 
        cbm = ?, color = ?, gross_weight = ?, net_weight = ?, total_gw = ?, total_nw = ?,
        fob_price = ?, total_price = ?, hs_code = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      client_code || null, client_barcode || null, client_description || null, km_code, description || null, folder_id || null, picture_url, size_width, size_depth, size_height,
      packing_width, packing_depth, packing_height, calculatedCBM || cbm, color,
      gross_weight, net_weight, calculatedTotalGW || total_gw, calculatedTotalNW || total_nw || null, 
      fob_price, calculatedTotalPrice || total_price, hs_code,
      req.params.id
    ]);

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    handleDbError(error, res, 'update product');
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    // Check if product is used in any order items
    const [usageRows] = await db.execute(
      'SELECT COUNT(*) AS usage_count FROM order_items WHERE product_id = ?',
      [req.params.id]
    );

    const usageCount = usageRows[0]?.usage_count || 0;

    if (usageCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete product because it is used in existing orders. Please remove it from orders first.'
      });
    }

    // Get product to delete image file
    const [products] = await db.execute(
      'SELECT picture_url FROM products WHERE id = ?',
      [req.params.id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete image file if exists
    if (products[0].picture_url) {
      const imagePath = path.join(__dirname, products[0].picture_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await db.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    handleDbError(error, res, 'delete product');
  }
});

// Product Folders API Routes
// Get all folders
app.get('/api/folders', async (req, res) => {
  try {
    const [folders] = await db.execute(
      'SELECT f.*, COUNT(p.id) as product_count FROM product_folders f LEFT JOIN products p ON f.id = p.folder_id GROUP BY f.id ORDER BY f.name'
    );
    res.json({ folders });
  } catch (error) {
    handleDbError(error, res, 'fetch folders');
  }
});

// Get folder by ID
app.get('/api/folders/:id', async (req, res) => {
  try {
    const [folders] = await db.execute(
      'SELECT * FROM product_folders WHERE id = ?',
      [req.params.id]
    );

    if (folders.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json(folders[0]);
  } catch (error) {
    handleDbError(error, res, 'fetch folder');
  }
});

// Create folder
app.post('/api/folders', async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const [result] = await db.execute(
      'INSERT INTO product_folders (name, description, color) VALUES (?, ?, ?)',
      [name.trim(), description || null, color || null]
    );

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Folder created successfully' 
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Folder with this name already exists' });
    }
    handleDbError(error, res, 'create folder');
  }
});

// Update folder
app.put('/api/folders/:id', async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    // Check if folder exists
    const [existingFolders] = await db.execute(
      'SELECT id FROM product_folders WHERE id = ?',
      [req.params.id]
    );

    if (existingFolders.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    await db.execute(
      'UPDATE product_folders SET name = ?, description = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name.trim(), description || null, color || null, req.params.id]
    );

    res.json({ message: 'Folder updated successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Folder with this name already exists' });
    }
    handleDbError(error, res, 'update folder');
  }
});

// Delete folder
app.delete('/api/folders/:id', async (req, res) => {
  try {
    // Check if folder exists
    const [folders] = await db.execute(
      'SELECT id FROM product_folders WHERE id = ?',
      [req.params.id]
    );

    if (folders.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Check if folder is used by any products
    const [products] = await db.execute(
      'SELECT COUNT(*) as count FROM products WHERE folder_id = ?',
      [req.params.id]
    );

    if (products[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete folder because it contains products. Please move or remove products first.' 
      });
    }

    await db.execute('DELETE FROM product_folders WHERE id = ?', [req.params.id]);
    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    handleDbError(error, res, 'delete folder');
  }
});

// Orders API Routes
// Get orders with pagination and search
app.get('/api/orders', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];

    if (search) {
      whereClause = 'WHERE o.no_pi LIKE ? OR o.buyer_name LIKE ?';
      queryParams = [`%${search}%`, `%${search}%`];
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM orders o ${whereClause}`;
    const [countResult] = await db.execute(countQuery, queryParams);
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // Get orders with summary
    const ordersQuery = `
      SELECT 
        o.*,
        COUNT(oi.id) as item_count,
        COALESCE(SUM(oi.cbm_total), 0) as total_cbm,
        COALESCE(SUM(oi.fob_total_usd), 0) as total_usd
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const [orders] = await db.execute(ordersQuery, [...queryParams, limit, offset]);

    res.json({
      orders,
      totalItems,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    handleDbError(error, res, 'fetch orders');
  }
});

// Get order by ID with items
app.get('/api/orders/:id', async (req, res) => {
  try {
    // Get order
    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE id = ?',
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order items
    const [items] = await db.execute(`
      SELECT oi.*, p.km_code, p.description, p.picture_url 
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.id
    `, [req.params.id]);

    const order = orders[0];
    
    // Parse JSON fields if they exist
    if (order.custom_columns && typeof order.custom_columns === 'string') {
      try {
        order.custom_columns = JSON.parse(order.custom_columns);
      } catch (e) {
        order.custom_columns = [];
      }
    }
    
    // Parse custom_column_values for each item and derive per-unit weights
    const parsedItems = items.map(item => {
      if (item.custom_column_values && typeof item.custom_column_values === 'string') {
        try {
          item.custom_column_values = JSON.parse(item.custom_column_values);
        } catch (e) {
          item.custom_column_values = {};
        }
      }

      // Derive per-unit gross_weight and net_weight so report & Excel
      // always have the correct single-item weights, separate from totals.
      const qty = parseFloat(item.qty || 0);
      const gwTotal = parseFloat(item.gross_weight_total || 0);
      const nwTotal = parseFloat(item.net_weight_total || 0);

      if (!isNaN(qty) && qty > 0) {
        const perUnitGW = gwTotal / qty;
        const perUnitNW = nwTotal / qty;

        // Expose as string with 2 decimals (e.g. "8.00", "7.00")
        item.gross_weight = isNaN(perUnitGW) ? null : perUnitGW.toFixed(2);
        item.net_weight = isNaN(perUnitNW) ? null : perUnitNW.toFixed(2);
      } else {
        // If qty invalid, keep them null so frontend can decide how to handle
        item.gross_weight = null;
        item.net_weight = null;
      }

      return item;
    });

    res.json({
      ...order,
      items: parsedItems
    });
  } catch (error) {
    handleDbError(error, res, 'fetch order');
  }
});

// Create order with items
app.post('/api/orders', async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    await connection.beginTransaction();

    const {
      no_pi,
      buyer_name,
      buyer_address,
      currency,
      invoice_date,
      volume,
      port_loading,
      destination_port,
      custom_columns,
      template_type,
      items
    } = req.body;

    // Find or create buyer to get buyer_id
    let buyerId;
    const [existingBuyers] = await connection.execute(
      'SELECT id FROM buyers WHERE name = ?',
      [buyer_name]
    );

    if (existingBuyers.length > 0) {
      buyerId = existingBuyers[0].id;
      
      // Update buyer address if it changed
      await connection.execute(
        'UPDATE buyers SET address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [buyer_address, buyerId]
      );
    } else {
      // Create new buyer
      const [buyerResult] = await connection.execute(
        'INSERT INTO buyers (name, address) VALUES (?, ?)',
        [buyer_name, buyer_address]
      );
      buyerId = buyerResult.insertId;
    }

    // Insert order with buyer_id
    const [orderResult] = await connection.execute(
      'INSERT INTO orders (buyer_id, no_pi, buyer_name, buyer_address, currency, invoice_date, volume, port_loading, destination_port, custom_columns, template_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        buyerId,
        no_pi,
        buyer_name,
        buyer_address,
        currency || 'USD',
        invoice_date || null,
        volume || null,
        port_loading || null,
        destination_port || null,
        custom_columns ? JSON.stringify(custom_columns) : null,
        template_type || 'normal'
      ]
    );

    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of items) {
      await connection.execute(`
        INSERT INTO order_items (
          order_id, product_id, client_code, qty, cbm_total, fob_total_usd,
          gross_weight_total, net_weight_total, total_gw_total, total_nw_total,
          fob, custom_column_values, discount_5, discount_10
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId,
        nullIfUndefined(item.product_id),
        nullIfUndefined(item.client_code),
        nullIfUndefined(item.qty),
        nullIfUndefined(item.cbm_total),
        nullIfUndefined(item.fob_total_usd),
        nullIfUndefined(item.gross_weight_total),
        nullIfUndefined(item.net_weight_total),
        nullIfUndefined(item.total_gw_total),
        nullIfUndefined(item.total_nw_total),
        nullIfUndefined(item.fob),
        item.custom_column_values ? JSON.stringify(item.custom_column_values) : null,
        nullIfUndefined(item.discount_5),
        nullIfUndefined(item.discount_10)
      ]);
    }

    await connection.commit();
    res.status(201).json({ 
      id: orderId, 
      message: 'Order created successfully' 
    });
  } catch (error) {
    await connection.rollback();
    handleDbError(error, res, 'create order');
  } finally {
    await connection.end();
  }
});

// Update order
app.put('/api/orders/:id', async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    await connection.beginTransaction();

    const {
      no_pi,
      buyer_name,
      buyer_address,
      currency,
      invoice_date,
      volume,
      port_loading,
      destination_port,
      custom_columns,
      template_type,
      items
    } = req.body;

    // Find or create buyer to get buyer_id
    let buyerId;
    const [existingBuyers] = await connection.execute(
      'SELECT id FROM buyers WHERE name = ?',
      [buyer_name]
    );

    if (existingBuyers.length > 0) {
      buyerId = existingBuyers[0].id;
      
      // Update buyer address if it changed
      await connection.execute(
        'UPDATE buyers SET address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [buyer_address, buyerId]
      );
    } else {
      // Create new buyer
      const [buyerResult] = await connection.execute(
        'INSERT INTO buyers (name, address) VALUES (?, ?)',
        [buyer_name, buyer_address]
      );
      buyerId = buyerResult.insertId;
    }

    // Update order with buyer_id
    await connection.execute(
      'UPDATE orders SET buyer_id = ?, no_pi = ?, buyer_name = ?, buyer_address = ?, currency = ?, invoice_date = ?, volume = ?, port_loading = ?, destination_port = ?, custom_columns = ?, template_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [
        buyerId,
        no_pi,
        buyer_name,
        buyer_address,
        currency || 'USD',
        invoice_date || null,
        volume || null,
        port_loading || null,
        destination_port || null,
        custom_columns ? JSON.stringify(custom_columns) : null,
        template_type || 'normal',
        req.params.id
      ]
    );

    // Delete existing items
    await connection.execute('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);

    // Insert new items
    for (const item of items) {
      await connection.execute(`
        INSERT INTO order_items (
          order_id, product_id, client_code, qty, cbm_total, fob_total_usd,
          gross_weight_total, net_weight_total, total_gw_total, total_nw_total,
          fob, custom_column_values, discount_5, discount_10
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        req.params.id,
        nullIfUndefined(item.product_id),
        nullIfUndefined(item.client_code),
        nullIfUndefined(item.qty),
        nullIfUndefined(item.cbm_total),
        nullIfUndefined(item.fob_total_usd),
        nullIfUndefined(item.gross_weight_total),
        nullIfUndefined(item.net_weight_total),
        nullIfUndefined(item.total_gw_total),
        nullIfUndefined(item.total_nw_total),
        nullIfUndefined(item.fob),
        item.custom_column_values ? JSON.stringify(item.custom_column_values) : null,
        nullIfUndefined(item.discount_5),
        nullIfUndefined(item.discount_10)
      ]);
    }

    await connection.commit();
    res.json({ message: 'Order updated successfully' });
  } catch (error) {
    await connection.rollback();
    handleDbError(error, res, 'update order');
  } finally {
    await connection.end();
  }
});

// Delete order
app.delete('/api/orders/:id', async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    await connection.beginTransaction();

    // Delete order items first
    await connection.execute('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);
    
    // Delete order
    await connection.execute('DELETE FROM orders WHERE id = ?', [req.params.id]);

    await connection.commit();
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    await connection.rollback();
    handleDbError(error, res, 'delete order');
  } finally {
    await connection.end();
  }
});

// Get order report data
app.get('/api/orders/:id/report', async (req, res) => {
  try {
    // Get order
    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE id = ?',
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];
    
    // Parse custom_columns if it exists
    if (order.custom_columns && typeof order.custom_columns === 'string') {
      try {
        order.custom_columns = JSON.parse(order.custom_columns);
      } catch (e) {
        order.custom_columns = [];
      }
    }

    // Get order items with product details
    const [items] = await db.execute(`
      SELECT 
        oi.*,
        p.km_code, p.description, p.picture_url, p.size_width, p.size_depth, p.size_height,
        p.packing_width, p.packing_depth, p.packing_height, p.color, p.fob_price, p.hs_code,
        p.client_barcode, p.client_description,
        COALESCE(oi.fob, p.fob_price) as fob
      FROM order_items oi
      INNER JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.id
    `, [req.params.id]);

    // Parse custom_column_values for each item and derive per-unit weights
    const parsedItems = items.map(item => {
      if (item.custom_column_values && typeof item.custom_column_values === 'string') {
        try {
          item.custom_column_values = JSON.parse(item.custom_column_values);
        } catch (e) {
          item.custom_column_values = {};
        }
      }

      // Derive per-unit gross_weight and net_weight so report & Excel
      // always have the correct single-item weights, separate from totals.
      const qty = parseFloat(item.qty || 0);
      const gwTotal = parseFloat(item.gross_weight_total || 0);
      const nwTotal = parseFloat(item.net_weight_total || 0);

      if (!isNaN(qty) && qty > 0) {
        const perUnitGW = gwTotal / qty;
        const perUnitNW = nwTotal / qty;

        // Expose as string with 2 decimals (e.g. "8.00", "7.00")
        item.gross_weight = isNaN(perUnitGW) ? null : perUnitGW.toFixed(2);
        item.net_weight = isNaN(perUnitNW) ? null : perUnitNW.toFixed(2);
      } else {
        // If qty invalid, keep them null so frontend can decide how to handle
        item.gross_weight = null;
        item.net_weight = null;
      }

      return item;
    });

    // Calculate summary (numeric aggregation with safety guards)
    const summary = parsedItems.reduce((acc, item) => {
      const safeAdd = (prev, value) => {
        const num = parseFloat(value || 0);
        return prev + (isNaN(num) ? 0 : num);
      };

      return {
        totalCBM: safeAdd(acc.totalCBM, item.cbm_total),
        totalUSD: safeAdd(acc.totalUSD, item.fob_total_usd),
        totalGrossWeight: safeAdd(acc.totalGrossWeight, item.gross_weight_total),
        totalNetWeight: safeAdd(acc.totalNetWeight, item.net_weight_total),
        totalGW: safeAdd(acc.totalGW, item.total_gw_total),
        totalNW: safeAdd(acc.totalNW, item.total_nw_total)
      };
    }, {
      totalCBM: 0,
      totalUSD: 0,
      totalGrossWeight: 0,
      totalNetWeight: 0,
      totalGW: 0,
      totalNW: 0
    });

    // Add currency from order to summary (keep as string, do NOT format with toFixed)
    summary.currency = orders[0].currency || 'USD';

    // Format only numeric summary values to 2 decimal places
    const numericKeys = ['totalCBM', 'totalUSD', 'totalGrossWeight', 'totalNetWeight', 'totalGW', 'totalNW'];
    numericKeys.forEach((key) => {
      const num = parseFloat(summary[key] || 0);
      summary[key] = isNaN(num) ? '0.00' : num.toFixed(2);
    });

    res.json({
      order: order,
      items: parsedItems,
      summary
    });
  } catch (error) {
    handleDbError(error, res, 'fetch order report');
  }
});

// Buyers API Routes
// Get buyers with pagination and search
app.get('/api/buyers', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];

    if (search) {
      whereClause = 'WHERE name LIKE ? OR address LIKE ?';
      queryParams = [`%${search}%`, `%${search}%`];
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM buyers ${whereClause}`;
    const [countResult] = await db.execute(countQuery, queryParams);
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // Get buyers
    const buyersQuery = `
      SELECT * FROM buyers 
      ${whereClause}
      ORDER BY name ASC 
      LIMIT ? OFFSET ?
    `;
    const [buyers] = await db.execute(buyersQuery, [...queryParams, limit, offset]);

    res.json({
      buyers,
      totalItems,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    handleDbError(error, res, 'fetch buyers');
  }
});

// Get buyers for select dropdown with search (for react-select)
app.get('/api/buyers/select', async (req, res) => {
  try {
    const search = req.query.search || '';
    
    let whereClause = '';
    let queryParams = [];

    if (search) {
      whereClause = 'WHERE name LIKE ? OR address LIKE ?';
      queryParams = [`%${search}%`, `%${search}%`];
    }

    const [buyers] = await db.execute(
      `SELECT id, name, address FROM buyers ${whereClause} ORDER BY name ASC LIMIT 50`,
      queryParams
    );

    res.json({ buyers });
  } catch (error) {
    handleDbError(error, res, 'fetch buyers for select');
  }
});

// Get buyer by ID
app.get('/api/buyers/:id', async (req, res) => {
  try {
    const [buyers] = await db.execute(
      'SELECT * FROM buyers WHERE id = ?',
      [req.params.id]
    );

    if (buyers.length === 0) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    res.json(buyers[0]);
  } catch (error) {
    handleDbError(error, res, 'fetch buyer');
  }
});

// Create buyer
app.post('/api/buyers', async (req, res) => {
  try {
    const { name, address } = req.body;

    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    const [result] = await db.execute(
      'INSERT INTO buyers (name, address) VALUES (?, ?)',
      [name, address]
    );

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Buyer created successfully' 
    });
  } catch (error) {
    handleDbError(error, res, 'create buyer');
  }
});

// Update buyer
app.put('/api/buyers/:id', async (req, res) => {
  try {
    const { name, address } = req.body;

    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    // Check if buyer exists
    const [buyers] = await db.execute(
      'SELECT id FROM buyers WHERE id = ?',
      [req.params.id]
    );

    if (buyers.length === 0) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    await db.execute(
      'UPDATE buyers SET name = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, address, req.params.id]
    );

    res.json({ message: 'Buyer updated successfully' });
  } catch (error) {
    handleDbError(error, res, 'update buyer');
  }
});

// Delete buyer
app.delete('/api/buyers/:id', async (req, res) => {
  try {
    // Check if buyer is used in any orders
    const [usageRows] = await db.execute(
      'SELECT COUNT(*) AS usage_count FROM orders WHERE buyer_id = ?',
      [req.params.id]
    );

    const usageCount = usageRows[0]?.usage_count || 0;

    if (usageCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete buyer because it is used in existing orders. Please remove it from orders first.'
      });
    }

    // Check if buyer exists
    const [buyers] = await db.execute(
      'SELECT id FROM buyers WHERE id = ?',
      [req.params.id]
    );

    if (buyers.length === 0) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    await db.execute('DELETE FROM buyers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Buyer deleted successfully' });
  } catch (error) {
    handleDbError(error, res, 'delete buyer');
  }
});


// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum 5MB allowed.' });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('- GET /api/products');
    console.log('- POST /api/products');
    console.log('- GET /api/orders');
    console.log('- POST /api/orders');
    console.log('- GET /api/orders/:id/report');
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});