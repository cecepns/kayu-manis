import axios from 'axios';

const API_URL = 'https://api-inventory.isavralabel.com/kayu-manis-properti/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Folders API
export const foldersAPI = {
  // Get all folders
  getFolders: async () => {
    try {
      const response = await api.get('/folders');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get folder by ID
  getFolder: async (id) => {
    try {
      const response = await api.get(`/folders/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Create folder
  createFolder: async (folderData) => {
    try {
      const response = await api.post('/folders', folderData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update folder
  updateFolder: async (id, folderData) => {
    try {
      const response = await api.put(`/folders/${id}`, folderData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete folder
  deleteFolder: async (id) => {
    try {
      const response = await api.delete(`/folders/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default foldersAPI;

