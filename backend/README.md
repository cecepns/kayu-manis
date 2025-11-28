# Furniture Order Management - Backend

Backend API server for the Furniture Order Management System built with Express.js and MySQL.

## Features

- **Products Management**: Complete CRUD operations for furniture products
- **Image Upload**: Handle product image uploads with multer
- **Orders Management**: Create and manage orders with multiple items  
- **Report Generation**: Generate detailed packing list and invoice reports
- **Database Relations**: Properly structured MySQL database with foreign keys
- **Error Handling**: Comprehensive error handling and validation
- **File Management**: Automatic cleanup of uploaded images

## Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn package manager

## Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   - Create a MySQL database named `furniture_order_management`
   - Import the provided SQL file:
     ```bash
     mysql -u root -p furniture_order_management < database.sql
     ```
   - Or run the SQL commands from `database.sql` in your MySQL client

3. **Configure Database Connection**
   Update the database configuration in `server.js` if needed:
   ```javascript
   const dbConfig = {
     host: 'localhost',
     user: 'root',
     password: 'your_password',
     database: 'furniture_order_management'
   };
   ```

4. **Start the Server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://api-inventory.isavralabel.com/kayu-manis-properti`

## API Endpoints

### Products
- `GET /api/products` - Get all products (with pagination & search)
- `GET /api/products/:id` - Get single product
- `GET /api/products/select` - Get products for dropdown select
- `POST /api/products` - Create new product (with image upload)
- `PUT /api/products/:id` - Update product (with image upload)
- `DELETE /api/products/:id` - Delete product

### Orders
- `GET /api/orders` - Get all orders (with pagination & search)
- `GET /api/orders/:id` - Get single order with items
- `POST /api/orders` - Create new order with items
- `PUT /api/orders/:id` - Update order with items
- `DELETE /api/orders/:id` - Delete order

### Reports
- `GET /api/orders/:id/report` - Get order report data for packing list

## Database Schema

### Products Table
- Complete furniture product specifications
- Image upload handling
- Size and packing dimensions
- Weight and pricing information
- HS codes for customs

### Orders Table  
- Order header information
- Buyer details and addresses
- PI (Proforma Invoice) numbers

### Order Items Table
- Individual items within orders
- Quantity and calculated totals
- Client-specific product codes
- Foreign key relationships

## File Upload

Product images are stored in `/backend/uploads-furniture/` directory:
- Maximum file size: 5MB
- Supported formats: JPEG, PNG, GIF
- Automatic file naming with timestamps
- Old image cleanup on updates

## Sample Data

The database includes sample data:
- 8 furniture products with detailed specifications
- 3 sample orders with realistic buyer information  
- Order items with calculated totals
- Views for reporting and analytics

## Error Handling

- Comprehensive database error handling
- File upload validation
- Transaction support for data integrity
- Proper HTTP status codes
- Detailed error messages for debugging

## Development

### Database Views
- `v_order_summary`: Order totals and statistics
- `v_product_popularity`: Product sales analytics

### Performance Optimizations
- Strategic database indexes
- Efficient SQL queries with JOINs
- Pagination for large datasets
- Connection pooling ready

## Production Deployment

1. **Environment Variables**
   - Set database credentials
   - Configure file upload paths
   - Set NODE_ENV=production

2. **Database Optimization**
   - Enable MySQL query caching
   - Monitor slow queries
   - Regular backup procedures

3. **File Storage**
   - Consider cloud storage (AWS S3, etc.)
   - Implement CDN for image delivery
   - Regular cleanup of unused images

## API Testing

Use tools like Postman or curl to test endpoints:

```bash
# Get products
curl https://api-inventory.isavralabel.com/kayu-manis-properti/api/products

# Create product (with image)
curl -X POST https://api-inventory.isavralabel.com/kayu-manis-properti/api/products \
  -F "km_code=TEST001" \
  -F "description=Test Product" \
  -F "picture=@image.jpg" \
  -F "fob_price=100"
```

## Troubleshooting

1. **Database Connection Issues**
   - Verify MySQL service is running
   - Check database credentials
   - Ensure database exists

2. **File Upload Issues**
   - Check directory permissions
   - Verify disk space
   - Confirm file size limits

3. **Performance Issues**
   - Monitor database query performance
   - Check for missing indexes
   - Analyze slow query logs

## License

MIT License - see LICENSE file for details