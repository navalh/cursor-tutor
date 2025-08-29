import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const uploadAPI = {
  uploadPDF: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  getProcessingStatus: async (textbookId) => {
    const response = await api.get(`/api/processing-status/${textbookId}`);
    return response.data;
  },

  getTextbooks: async () => {
    const response = await api.get('/api/textbooks');
    return response.data;
  },
};

export const questionsAPI = {
  getChapters: async (textbookId) => {
    const response = await api.get(`/api/chapters/${textbookId}`);
    return response.data;
  },

  getRandomQuestion: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.textbook_id) params.append('textbook_id', filters.textbook_id);
    if (filters.chapter_id) params.append('chapter_id', filters.chapter_id);
    if (filters.question_type) params.append('question_type', filters.question_type);
    
    const response = await api.get(`/api/questions/random?${params}`);
    return response.data;
  },

  getQuestionsByChapter: async (chapterId, limit = 10, offset = 0) => {
    const response = await api.get(
      `/api/questions/by-chapter/${chapterId}?limit=${limit}&offset=${offset}`
    );
    return response.data;
  },

  searchQuestions: async (query, textbookId = null, limit = 10) => {
    const params = new URLSearchParams({ query, limit });
    if (textbookId) params.append('textbook_id', textbookId);
    
    const response = await api.get(`/api/questions/search?${params}`);
    return response.data;
  },

  getStatistics: async (textbookId) => {
    const response = await api.get(`/api/statistics/${textbookId}`);
    return response.data;
  },
};

export default api;