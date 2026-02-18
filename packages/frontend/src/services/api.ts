import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Custom error class that preserves backend response data
export class ApiError extends Error {
  response?: {
    status: number;
    data: any;
  };

  constructor(message: string, response?: { status: number; data: any }) {
    super(message);
    this.name = 'ApiError';
    this.response = response;
  }
}

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    const apiError = new ApiError(message, error.response ? {
      status: error.response.status,
      data: error.response.data,
    } : undefined);
    return Promise.reject(apiError);
  }
);
