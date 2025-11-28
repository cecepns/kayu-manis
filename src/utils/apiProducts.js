import axios from 'axios';

const API_URL = 'https://api-inventory.isavralabel.com/kayu-manis-properti/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Products API
export const productsAPI = {
  // Get all products with pagination and search
  getProducts: async (page = 1, limit = 10, search = '') => {
    try {
      const response = await api.get(`/products?page=${page}&limit=${limit}&search=${search}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get product by ID
  getProduct: async (id) => {
    try {
      const response = await api.get(`/products/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Create product with image upload
  createProduct: async (productData) => {
    try {
      const formData = new FormData();
      
      // Append all product fields
      Object.keys(productData).forEach(key => {
        if (key === 'picture' && productData[key]) {
          formData.append('picture', productData[key]);
        } else if (productData[key] !== null && productData[key] !== undefined) {
          formData.append(key, productData[key]);
        }
      });

      const response = await api.post('/products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update product
  updateProduct: async (id, productData) => {
    try {
      const formData = new FormData();
      
      Object.keys(productData).forEach(key => {
        if (key === 'picture' && productData[key]) {
          formData.append('picture', productData[key]);
        } else if (productData[key] !== null && productData[key] !== undefined) {
          formData.append(key, productData[key]);
        }
      });

      const response = await api.put(`/products/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete product
  deleteProduct: async (id) => {
    try {
      const response = await api.delete(`/products/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get products for select dropdown
  getProductsForSelect: async () => {
    try {
      const response = await api.get('/products/select');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default productsAPI;