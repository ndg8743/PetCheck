import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { secureStorage } from './secureStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      // Security: set timeout to prevent hanging requests
      timeout: 30000,
      // Security: don't send credentials to cross-origin by default
      withCredentials: false,
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = secureStorage.getItem('authToken');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear secure storage and redirect to login
          secureStorage.removeItem('authToken');
          secureStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  get instance(): AxiosInstance {
    return this.client;
  }
}

export const api = new ApiClient().instance;
export default api;
