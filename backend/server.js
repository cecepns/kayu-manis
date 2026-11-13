const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const sizeOf = require('image-size');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads-furniture', express.static(path.join(__dirname, 'uploads-furniture')));

// Image base64 proxy for Excel export (avoids browser CORS issues)
app.get('/api/images/base64', async (req, res) => {
  try {
    const imagePath = req.query.path;
    if (!imagePath || typeof imagePath !== 'string') {
      return res.status(400).json({ error: 'Path is required' });
    }
    if (!imagePath.startsWith('/uploads-furniture/')) {
      return res.status(400).json({ error: 'Invalid image path' });
    }

    const relativePath = imagePath.replace(/^\//, '');
    const fullPath = path.join(__dirname, relativePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const buffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    let extension = 'jpeg';
    if (ext === '.png') extension = 'png';
    else if (ext === '.jpg' || ext === '.jpeg') extension = 'jpeg';
    else if (ext === '.gif') extension = 'gif';
    else if (ext === '.webp') extension = 'png';

    let width = null;
    let height = null;
    try {
      const dimensions = sizeOf(buffer);
      width = dimensions.width ?? null;
      height = dimensions.height ?? null;
    } catch (dimErr) {
      console.warn('Could not read image dimensions:', fullPath, dimErr.message);
    }

    res.json({
      base64: buffer.toString('base64'),
      extension,
      width,
      height,
    });
  } catch (error) {
    console.error('Error reading image:', error);
    res.status(500).json({ error: 'Failed to read image' });
  }
});

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
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const productUpload = upload.fields([
  { name: 'picture', maxCount: 1 },
  { name: 'detail_pictures', maxCount: 15 }
]);

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

    // Auto-migrate users table if needed
    try {
      const [cols] = await db.execute('SHOW COLUMNS FROM users');
      const existingCols = cols.map((c) => c.Field);

      if (!existingCols.includes('menu_roles')) {
        await db.execute(
          "ALTER TABLE users ADD COLUMN menu_roles JSON NULL COMMENT 'Role per menu: editor or viewer'"
        );
        console.log('Added menu_roles column to users');
      }
      if (!existingCols.includes('can_view_price')) {
        await db.execute(
          "ALTER TABLE users ADD COLUMN can_view_price TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Access to view FOB and total price'"
        );
        console.log('Added can_view_price column to users');
      }
      if (!existingCols.includes('allowed_folder_ids')) {
        await db.execute(
          "ALTER TABLE users ADD COLUMN allowed_folder_ids JSON NULL COMMENT 'Restricted folder IDs, null for all folders'"
        );
        console.log('Added allowed_folder_ids column to users');
      }
    } catch (migErr) {
      console.warn('Migration check for users table:', migErr.message);
    }

    // Auto-migrate products table
    try {
      const [prodCols] = await db.execute('SHOW COLUMNS FROM products');
      const existingProdCols = prodCols.map((c) => c.Field);
      if (!existingProdCols.includes('currency')) {
        await db.execute("ALTER TABLE products ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD' COMMENT 'Product currency'");
        console.log('Added currency column to products');
      }
      if (!existingProdCols.includes('wood_cbm')) {
        await db.execute("ALTER TABLE products ADD COLUMN wood_cbm DECIMAL(10,4) NULL COMMENT 'Finished volume CBM kayu'");
        console.log('Added wood_cbm column to products');
      }
      if (!existingProdCols.includes('detail_pictures')) {
        await db.execute("ALTER TABLE products ADD COLUMN detail_pictures JSON NULL COMMENT 'Array of detail picture URLs'");
        console.log('Added detail_pictures column to products');
      }
    } catch (prodErr) {
      console.warn('Migration check for products table:', prodErr.message);
    }

    // Auto-migrate order_items for Iemanja template
    try {
      const [itemCols] = await db.execute('SHOW COLUMNS FROM order_items');
      const existingItemCols = itemCols.map((c) => c.Field);
      if (!existingItemCols.includes('door_count')) {
        await db.execute("ALTER TABLE order_items ADD COLUMN door_count INT NULL COMMENT 'Jumlah Pintu (Template Iemanja)'");
        console.log('Added door_count to order_items');
      }
      if (!existingItemCols.includes('drawer_count')) {
        await db.execute("ALTER TABLE order_items ADD COLUMN drawer_count INT NULL COMMENT 'Jumlah Laci (Template Iemanja)'");
        console.log('Added drawer_count to order_items');
      }
      if (!existingItemCols.includes('hinge_price')) {
        await db.execute("ALTER TABLE order_items ADD COLUMN hinge_price DECIMAL(12,2) NULL COMMENT 'Harga Engsel (Template Iemanja)'");
        console.log('Added hinge_price to order_items');
      }
      if (!existingItemCols.includes('blum_runner_price')) {
        await db.execute("ALTER TABLE order_items ADD COLUMN blum_runner_price DECIMAL(12,2) NULL COMMENT 'Harga Rel BLUM (Template Iemanja)'");
        console.log('Added blum_runner_price to order_items');
      }
    } catch (itemErr) {
      console.warn('Migration check for order_items table:', itemErr.message);
    }

    // Auto-create bank_accounts table
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS bank_accounts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          bank_key VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(100) NOT NULL,
          bank_name VARCHAR(100) NULL,
          account_name VARCHAR(100) NOT NULL,
          account VARCHAR(100) NOT NULL,
          account_currency VARCHAR(20) NULL,
          swift_code VARCHAR(50) NULL,
          address VARCHAR(255) NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      const [existingBanks] = await db.execute('SELECT COUNT(*) as total FROM bank_accounts');
      if (existingBanks[0].total === 0) {
        await db.execute(`
          INSERT INTO bank_accounts (bank_key, name, bank_name, account_name, account, account_currency, swift_code, address, is_active)
          VALUES
            ('permata-euro', 'PERMATA EURO', 'Bank Permata', 'CV KAYU MANIS', '6902700445', 'EURO', 'BBBAIDJA', 'JL BRIGJEND KATAMSO, YOGYAKARTA, INDONESIA', 1),
            ('permata-escrow', 'PERMATA ESCROW', 'Bank Permata', 'CV KAYU MANIS', '701466403', 'USD', 'BBBAIDJA', 'JL BRIGJEND KATAMSO, YOGYAKARTA, INDONESIA', 1),
            ('permata-usd', 'PERMATA USD', 'Bank Permata', 'CV KAYU MANIS', '701466101', 'USD', 'BBBAIDJA', 'JL BRIGJEND KATAMSO, YOGYAKARTA, INDONESIA', 1),
            ('permata-alex', 'PERMATA ALEX K.', 'Bank Permata', 'ALEX KURNIAWAN', '6903701232', '', 'BBBAIDJA', 'JL BRIGJEND KATAMSO, YOGYAKARTA, INDONESIA', 1)
        `);
        console.log('Seeded default bank_accounts');
      }
    } catch (bankErr) {
      console.warn('Migration check for bank_accounts table:', bankErr.message);
    }

    // Auto-create terms_of_payment table
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS terms_of_payment (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      const [existingTerms] = await db.execute('SELECT COUNT(*) as total FROM terms_of_payment');
      if (existingTerms[0].total === 0) {
        await db.execute(`
          INSERT INTO terms_of_payment (name, is_active)
          VALUES
            ('30% Deposit 70% Balance Payments Agains Documents', 1),
            ('L/C Irrevocable', 1),
            ('50:50', 1)
        `);
        console.log('Seeded default terms_of_payment');
      }
    } catch (topErr) {
      console.warn('Migration check for terms_of_payment table:', topErr.message);
    }
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

const BCRYPT_ROUNDS = 10;

const hashPassword = async (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

const verifyPassword = async (password, storedHash) => {
  if (storedHash?.startsWith('$2')) {
    return bcrypt.compare(password, storedHash);
  }
  // Legacy SHA-256 hashes (pre-bcrypt migration)
  const crypto = require('crypto');
  const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
  return legacyHash === storedHash;
};

const VALID_MENU_KEYS = ['folders', 'products', 'buyers', 'orders', 'reports', 'users'];

const parseMenuPermissions = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((k) => VALID_MENU_KEYS.includes(k));
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter((k) => VALID_MENU_KEYS.includes(k)) : [];
  } catch {
    return [];
  }
};

const parseMenuRoles = (value, permissions = []) => {
  let roles = {};
  if (value) {
    try {
      roles = typeof value === 'string' ? JSON.parse(value) : (typeof value === 'object' ? value : {});
    } catch {
      roles = {};
    }
  }
  const result = {};
  permissions.forEach((key) => {
    result[key] = roles && roles[key] === 'viewer' ? 'viewer' : 'editor';
  });
  return result;
};

const parseAllowedFolderIds = (value) => {
  if (!value) return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const ids = parsed.map((id) => parseInt(id, 10)).filter((n) => !isNaN(n));
      return ids.length > 0 ? ids : null;
    }
    return null;
  } catch {
    return null;
  }
};

const sanitizeUser = (row) => {
  if (!row) return null;
  // eslint-disable-next-line no-unused-vars
  const { password, menu_permissions, menu_roles, can_view_price, allowed_folder_ids, ...rest } = row;
  const permissions = parseMenuPermissions(menu_permissions);
  return {
    ...rest,
    menu_permissions: permissions,
    menu_roles: parseMenuRoles(menu_roles, permissions),
    can_view_price: can_view_price === 0 || can_view_price === false ? 0 : 1,
    allowed_folder_ids: parseAllowedFolderIds(allowed_folder_ids),
  };
};

// Products API Routes
// Get products with pagination and search
app.get('/api/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = req.query.limit === 'all' || parseInt(req.query.limit) === -1 ? 10000 : (parseInt(req.query.limit) || 10);
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];

    const folderId = req.query.folder_id;
    const folderIds = req.query.folder_ids;
    
    if (search) {
      whereClause = 'WHERE (p.km_code LIKE ? OR p.description LIKE ? OR p.client_code LIKE ?)';
      queryParams = [`%${search}%`, `%${search}%`, `%${search}%`];
    }
    
    if (folderId) {
      if (whereClause) {
        whereClause += ' AND p.folder_id = ?';
        queryParams.push(folderId);
      } else {
        whereClause = 'WHERE p.folder_id = ?';
        queryParams = [folderId];
      }
    } else if (folderIds) {
      const ids = folderIds.split(',').map((id) => parseInt(id.trim(), 10)).filter((n) => !isNaN(n));
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        if (whereClause) {
          whereClause += ` AND p.folder_id IN (${placeholders})`;
          queryParams.push(...ids);
        } else {
          whereClause = `WHERE p.folder_id IN (${placeholders})`;
          queryParams = ids;
        }
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
    const search = req.query.search || '';
    
    let whereClause = '';
    let queryParams = [];

    if (search) {
      whereClause = 'WHERE (p.km_code LIKE ? OR p.description LIKE ? OR p.client_code LIKE ?)';
      queryParams = [`%${search}%`, `%${search}%`, `%${search}%`];
    }

    const [products] = await db.execute(
      `SELECT p.id, p.client_code, p.client_barcode, p.client_description, p.km_code, p.description, p.cbm, p.fob_price, p.gross_weight, p.net_weight, p.total_gw, p.total_nw, p.picture_url, p.size_width, p.size_depth, p.size_height, p.packing_width, p.packing_depth, p.packing_height, p.color, p.folder_id, f.name as folder_name FROM products p LEFT JOIN product_folders f ON p.folder_id = f.id ${whereClause} ORDER BY p.km_code LIMIT 100`,
      queryParams
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
      packing_width, packing_depth, packing_height, cbm, wood_cbm, color,
      gross_weight, net_weight, total_gw, total_nw, fob_price, currency, total_price, hs_code
    } = req.body;

    let picture_url = null;
    const pictureFile = req.files && req.files['picture'] ? req.files['picture'][0] : (req.file || null);
    if (pictureFile) {
      picture_url = '/uploads-furniture/' + pictureFile.filename;
    }

    let detailPics = [];
    if (req.files && req.files['detail_pictures']) {
      req.files['detail_pictures'].forEach((f) => {
        detailPics.push('/uploads-furniture/' + f.filename);
      });
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

    const [prodCols] = await db.execute('SHOW COLUMNS FROM products');
    const pColNames = prodCols.map((c) => c.Field);
    const hasWood = pColNames.includes('wood_cbm');
    const hasCur = pColNames.includes('currency');
    const hasDetails = pColNames.includes('detail_pictures');

    let colList = ['client_code', 'client_barcode', 'client_description', 'km_code', 'description', 'folder_id', 'picture_url', 'size_width', 'size_depth', 'size_height', 'packing_width', 'packing_depth', 'packing_height', 'cbm', 'color', 'gross_weight', 'net_weight', 'total_gw', 'total_nw', 'fob_price', 'total_price', 'hs_code'];
    let valList = [
      client_code || null, client_barcode || null, client_description || null, km_code, description || null, folder_id || null, picture_url, size_width, size_depth, size_height,
      packing_width, packing_depth, packing_height, calculatedCBM || cbm, color,
      gross_weight, net_weight, calculatedTotalGW || total_gw, calculatedTotalNW || total_nw || null, 
      fob_price, calculatedTotalPrice || total_price, hs_code
    ];

    if (hasCur) {
      colList.push('currency');
      valList.push(currency || 'USD');
    }
    if (hasWood) {
      colList.push('wood_cbm');
      valList.push(wood_cbm ? parseFloat(wood_cbm) : null);
    }
    if (hasDetails) {
      colList.push('detail_pictures');
      valList.push(detailPics && detailPics.length > 0 ? JSON.stringify(detailPics) : null);
    }

    const placeholders = colList.map(() => '?').join(', ');
    const [result] = await db.execute(
      `INSERT INTO products (${colList.join(', ')}) VALUES (${placeholders})`,
      valList
    );

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Product created successfully' 
    });
  } catch (error) {
    handleDbError(error, res, 'create product');
  }
});

// Update product
app.put('/api/products/:id', productUpload, async (req, res) => {
  try {
    const {
      client_code, client_barcode, client_description, km_code, description, folder_id, size_width, size_depth, size_height,
      packing_width, packing_depth, packing_height, cbm, wood_cbm, color,
      gross_weight, net_weight, total_gw, total_nw, fob_price, currency, total_price, hs_code,
      existing_detail_pictures
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
    
    const pictureFile = req.files && req.files['picture'] ? req.files['picture'][0] : (req.file || null);
    if (pictureFile) {
      if (picture_url) {
        const oldImagePath = path.join(__dirname, picture_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      picture_url = '/uploads-furniture/' + pictureFile.filename;
    }

    let detailPics = [];
    if (existing_detail_pictures) {
      try {
        detailPics = typeof existing_detail_pictures === 'string' ? JSON.parse(existing_detail_pictures) : existing_detail_pictures;
      } catch {
        detailPics = [];
      }
    } else if (currentProduct[0].detail_pictures) {
      try {
        detailPics = typeof currentProduct[0].detail_pictures === 'string' ? JSON.parse(currentProduct[0].detail_pictures) : currentProduct[0].detail_pictures;
      } catch {
        detailPics = [];
      }
    }
    if (req.files && req.files['detail_pictures']) {
      req.files['detail_pictures'].forEach((f) => {
        detailPics.push('/uploads-furniture/' + f.filename);
      });
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
        cbm = ?, wood_cbm = ?, color = ?, gross_weight = ?, net_weight = ?, total_gw = ?, total_nw = ?,
        fob_price = ?, currency = ?, total_price = ?, hs_code = ?, detail_pictures = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      client_code || null, client_barcode || null, client_description || null, km_code, description || null, folder_id || null, picture_url, size_width, size_depth, size_height,
      packing_width, packing_depth, packing_height, calculatedCBM || cbm, wood_cbm ? parseFloat(wood_cbm) : null, color,
      gross_weight, net_weight, calculatedTotalGW || total_gw, calculatedTotalNW || total_nw || null, 
      fob_price, currency || 'USD', calculatedTotalPrice || total_price, hs_code,
      detailPics && detailPics.length > 0 ? JSON.stringify(detailPics) : null,
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
    let whereClause = '';
    let queryParams = [];

    if (req.query.ids) {
      const ids = req.query.ids.split(',').map((id) => parseInt(id.trim(), 10)).filter((n) => !isNaN(n));
      if (ids.length > 0) {
        whereClause = `WHERE f.id IN (${ids.map(() => '?').join(',')})`;
        queryParams = ids;
      }
    }

    const [folders] = await db.execute(
      `SELECT f.*, COUNT(p.id) as product_count FROM product_folders f LEFT JOIN products p ON f.id = p.folder_id ${whereClause} GROUP BY f.id ORDER BY f.name`,
      queryParams
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
    const limit = req.query.limit === 'all' || parseInt(req.query.limit) === -1 ? 10000 : (parseInt(req.query.limit) || 10);
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
      } catch {
        order.custom_columns = [];
      }
    }
    
    // Parse custom_column_values for each item and derive per-unit weights
    const parsedItems = items.map(item => {
      if (item.custom_column_values && typeof item.custom_column_values === 'string') {
        try {
          item.custom_column_values = JSON.parse(item.custom_column_values);
        } catch {
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
      no_po,
      buyer_name,
      buyer_address,
      currency,
      invoice_date,
      volume,
      port_loading,
      destination_port,
      terms_of_payment,
      delivery_terms,
      cargo_ready_by,
      bank_id,
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
      `INSERT INTO orders (
        buyer_id, no_pi, no_po, buyer_name, buyer_address, currency, invoice_date,
        volume, port_loading, destination_port, terms_of_payment, delivery_terms,
        cargo_ready_by, bank_id, custom_columns, template_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        buyerId,
        no_pi,
        no_po || null,
        buyer_name,
        buyer_address,
        currency || 'USD',
        invoice_date || null,
        volume || null,
        port_loading || null,
        destination_port || null,
        terms_of_payment || null,
        delivery_terms || null,
        cargo_ready_by || null,
        bank_id || null,
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
          fob, custom_column_values, discount_5, discount_10,
          door_count, drawer_count, hinge_price, blum_runner_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        nullIfUndefined(item.discount_10),
        nullIfUndefined(item.door_count),
        nullIfUndefined(item.drawer_count),
        nullIfUndefined(item.hinge_price),
        nullIfUndefined(item.blum_runner_price)
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
      no_po,
      buyer_name,
      buyer_address,
      currency,
      invoice_date,
      volume,
      port_loading,
      destination_port,
      terms_of_payment,
      delivery_terms,
      cargo_ready_by,
      bank_id,
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
      `UPDATE orders SET
        buyer_id = ?, no_pi = ?, no_po = ?, buyer_name = ?, buyer_address = ?, currency = ?,
        invoice_date = ?, volume = ?, port_loading = ?, destination_port = ?,
        terms_of_payment = ?, delivery_terms = ?, cargo_ready_by = ?, bank_id = ?,
        custom_columns = ?, template_type = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        buyerId,
        no_pi,
        no_po || null,
        buyer_name,
        buyer_address,
        currency || 'USD',
        invoice_date || null,
        volume || null,
        port_loading || null,
        destination_port || null,
        terms_of_payment || null,
        delivery_terms || null,
        cargo_ready_by || null,
        bank_id || null,
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
          fob, custom_column_values, discount_5, discount_10,
          door_count, drawer_count, hinge_price, blum_runner_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        nullIfUndefined(item.discount_10),
        nullIfUndefined(item.door_count),
        nullIfUndefined(item.drawer_count),
        nullIfUndefined(item.hinge_price),
        nullIfUndefined(item.blum_runner_price)
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
      } catch {
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
        } catch {
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

// Auth & Users API (no route-level authorization — permissions enforced on frontend)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [users] = await db.execute(
      'SELECT * FROM users WHERE username = ? AND is_active = 1',
      [username.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = users[0];
    const passwordValid = await verifyPassword(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const menu_permissions = parseMenuPermissions(user.menu_permissions);
    if (menu_permissions.length === 0) {
      return res.status(403).json({ error: 'User has no menu access configured' });
    }

    const sanitized = sanitizeUser(user);
    res.json({
      id: user.id,
      username: user.username,
      menu_permissions: sanitized.menu_permissions,
      menu_roles: sanitized.menu_roles,
      can_view_price: sanitized.can_view_price,
      allowed_folder_ids: sanitized.allowed_folder_ids,
    });
  } catch (error) {
    handleDbError(error, res, 'login');
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];

    if (search) {
      whereClause = 'WHERE username LIKE ?';
      queryParams = [`%${search}%`];
    }

    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const [countResult] = await db.execute(countQuery, queryParams);
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    const usersQuery = `
      SELECT *
      FROM users
      ${whereClause}
      ORDER BY username ASC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.execute(usersQuery, [...queryParams, limit, offset]);

    res.json({
      users: rows.map(sanitizeUser),
      totalItems,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    handleDbError(error, res, 'fetch users');
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT * FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(sanitizeUser(users[0]));
  } catch (error) {
    handleDbError(error, res, 'fetch user');
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username, password, menu_permissions, menu_roles, can_view_price, allowed_folder_ids, is_active } = req.body;

    if (!username?.trim() || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const permissions = parseMenuPermissions(menu_permissions);
    if (permissions.length === 0) {
      return res.status(400).json({ error: 'At least one menu permission is required' });
    }

    const [existing] = await db.execute(
      'SELECT id FROM users WHERE username = ?',
      [username.trim()]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const roles = parseMenuRoles(menu_roles, permissions);
    const viewPriceVal = can_view_price === 0 || can_view_price === false ? 0 : 1;
    const foldersVal = parseAllowedFolderIds(allowed_folder_ids);
    const activeVal = is_active === false || is_active === 0 ? 0 : 1;

    // Check existing columns to be compatible before/after migration
    const [cols] = await db.execute('SHOW COLUMNS FROM users');
    const colNames = cols.map((c) => c.Field);

    let insertQuery = '';
    let insertParams = [];

    if (colNames.includes('menu_roles') && colNames.includes('can_view_price') && colNames.includes('allowed_folder_ids')) {
      insertQuery = 'INSERT INTO users (username, password, menu_permissions, menu_roles, can_view_price, allowed_folder_ids, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)';
      insertParams = [
        username.trim(),
        await hashPassword(password),
        JSON.stringify(permissions),
        JSON.stringify(roles),
        viewPriceVal,
        foldersVal ? JSON.stringify(foldersVal) : null,
        activeVal,
      ];
    } else {
      insertQuery = 'INSERT INTO users (username, password, menu_permissions, is_active) VALUES (?, ?, ?, ?)';
      insertParams = [
        username.trim(),
        await hashPassword(password),
        JSON.stringify(permissions),
        activeVal,
      ];
    }

    const [result] = await db.execute(insertQuery, insertParams);

    const [created] = await db.execute(
      'SELECT * FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(sanitizeUser(created[0]));
  } catch (error) {
    handleDbError(error, res, 'create user');
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { username, password, menu_permissions, menu_roles, can_view_price, allowed_folder_ids, is_active } = req.body;

    const [users] = await db.execute('SELECT id FROM users WHERE id = ?', [req.params.id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const permissions = parseMenuPermissions(menu_permissions);
    if (permissions.length === 0) {
      return res.status(400).json({ error: 'At least one menu permission is required' });
    }

    if (username?.trim()) {
      const [duplicate] = await db.execute(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username.trim(), req.params.id]
      );

      if (duplicate.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    const roles = parseMenuRoles(menu_roles, permissions);
    const viewPriceVal = can_view_price === 0 || can_view_price === false ? 0 : 1;
    const foldersVal = parseAllowedFolderIds(allowed_folder_ids);
    const activeVal = is_active === false || is_active === 0 ? 0 : 1;

    const [cols] = await db.execute('SHOW COLUMNS FROM users');
    const colNames = cols.map((c) => c.Field);
    const hasNewCols = colNames.includes('menu_roles') && colNames.includes('can_view_price') && colNames.includes('allowed_folder_ids');

    if (password) {
      if (hasNewCols) {
        await db.execute(
          `UPDATE users SET
            username = COALESCE(?, username),
            password = ?,
            menu_permissions = ?,
            menu_roles = ?,
            can_view_price = ?,
            allowed_folder_ids = ?,
            is_active = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [
            username?.trim() || null,
            await hashPassword(password),
            JSON.stringify(permissions),
            JSON.stringify(roles),
            viewPriceVal,
            foldersVal ? JSON.stringify(foldersVal) : null,
            activeVal,
            req.params.id,
          ]
        );
      } else {
        await db.execute(
          `UPDATE users SET
            username = COALESCE(?, username),
            password = ?,
            menu_permissions = ?,
            is_active = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [
            username?.trim() || null,
            await hashPassword(password),
            JSON.stringify(permissions),
            activeVal,
            req.params.id,
          ]
        );
      }
    } else {
      if (hasNewCols) {
        await db.execute(
          `UPDATE users SET
            username = COALESCE(?, username),
            menu_permissions = ?,
            menu_roles = ?,
            can_view_price = ?,
            allowed_folder_ids = ?,
            is_active = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [
            username?.trim() || null,
            JSON.stringify(permissions),
            JSON.stringify(roles),
            viewPriceVal,
            foldersVal ? JSON.stringify(foldersVal) : null,
            activeVal,
            req.params.id,
          ]
        );
      } else {
        await db.execute(
          `UPDATE users SET
            username = COALESCE(?, username),
            menu_permissions = ?,
            is_active = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [
            username?.trim() || null,
            JSON.stringify(permissions),
            activeVal,
            req.params.id,
          ]
        );
      }
    }

    const [updated] = await db.execute(
      'SELECT * FROM users WHERE id = ?',
      [req.params.id]
    );

    res.json(sanitizeUser(updated[0]));
  } catch (error) {
    handleDbError(error, res, 'update user');
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const [users] = await db.execute('SELECT id FROM users WHERE id = ?', [req.params.id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [adminCount] = await db.execute('SELECT COUNT(*) as total FROM users');
    if (adminCount[0].total <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last user' });
    }

    await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    handleDbError(error, res, 'delete user');
  }
});



// Bank Accounts API Routes
app.get('/api/bank-accounts', async (req, res) => {
  try {
    const [banks] = await db.execute('SELECT * FROM bank_accounts WHERE is_active = 1 ORDER BY id ASC');
    res.json({ banks });
  } catch (error) {
    handleDbError(error, res, 'fetch bank accounts');
  }
});

app.post('/api/bank-accounts', async (req, res) => {
  try {
    const { name, bank_name, account_name, account, account_currency, swift_code, address } = req.body;
    if (!name || !account) {
      return res.status(400).json({ error: 'Nama rekening dan nomor rekening wajib diisi' });
    }
    const bank_key = (name || 'bank').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    const [result] = await db.execute(
      'INSERT INTO bank_accounts (bank_key, name, bank_name, account_name, account, account_currency, swift_code, address, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [bank_key, name.trim(), bank_name?.trim() || null, account_name?.trim() || 'CV KAYU MANIS', account.trim(), account_currency?.trim() || null, swift_code?.trim() || null, address?.trim() || null]
    );
    res.status(201).json({
      id: result.insertId,
      bank_key,
      name: name.trim(),
      account: account.trim(),
      message: 'Bank account added successfully'
    });
  } catch (error) {
    handleDbError(error, res, 'create bank account');
  }
});

// Terms of Payment API Routes
app.get('/api/terms-of-payment', async (req, res) => {
  try {
    const [terms] = await db.execute('SELECT * FROM terms_of_payment WHERE is_active = 1 ORDER BY id ASC');
    res.json({ terms: terms.map((t) => t.name) });
  } catch (error) {
    handleDbError(error, res, 'fetch terms of payment');
  }
});

app.post('/api/terms-of-payment', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Terms of payment name is required' });
    }
    await db.execute('INSERT IGNORE INTO terms_of_payment (name, is_active) VALUES (?, 1)', [name.trim()]);
    res.status(201).json({ message: 'Terms of payment added successfully', name: name.trim() });
  } catch (error) {
    handleDbError(error, res, 'create terms of payment');
  }
});

// Error handling middleware
// eslint-disable-next-line no-unused-vars
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