import axios from 'axios';

const API_URL = 'https://api-inventory.isavralabel.com/kayu-manis-properti/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Buyers API
export const buyersAPI = {
  // Get all buyers with pagination and search
  getBuyers: async (page = 1, limit = 10, search = '') => {
    try {
      const response = await api.get(`/buyers?page=${page}&limit=${limit}&search=${search}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get buyer by ID
  getBuyer: async (id) => {
    try {
      const response = await api.get(`/buyers/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Create buyer
  createBuyer: async (buyerData) => {
    try {
      const response = await api.post('/buyers', buyerData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update buyer
  updateBuyer: async (id, buyerData) => {
    try {
      const response = await api.put(`/buyers/${id}`, buyerData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete buyer
  deleteBuyer: async (id) => {
    try {
      const response = await api.delete(`/buyers/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get buyers for select dropdown with search (for react-select)
  getBuyersForSelect: async (search = '') => {
    try {
      const response = await api.get(`/buyers/select?search=${encodeURIComponent(search)}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default buyersAPI;



