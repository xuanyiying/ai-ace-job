/**
 * Unified HTTP Client for AI Providers
 * Provides a standardized axios wrapper with common configuration and error handling
 */

import { Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

/**
 * Authentication configuration
 */
export interface AIHttpClientAuth {
  type: 'bearer' | 'apikey' | 'custom';
  token?: string;
  headerName?: string;
  headerValue?: string;
}

/**
 * HTTP Client configuration
 */
export interface AIHttpClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  authentication?: AIHttpClientAuth;
  logger?: Logger;
  providerName?: string;
}

/**
 * Unified HTTP Client for AI Providers
 * Wraps axios with standardized configuration, logging, and error handling
 */
export class AIHttpClient {
  private readonly client: AxiosInstance;
  private readonly logger?: Logger;
  private readonly providerName: string;

  constructor(config: AIHttpClientConfig) {
    this.logger = config.logger;
    this.providerName = config.providerName || 'AI Provider';

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    // Add authentication header if provided
    if (config.authentication) {
      this.addAuthenticationHeader(headers, config.authentication);
    }

    // Create axios instance
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers,
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (request) => {
        if (this.logger) {
          this.logger.debug(
            `[${this.providerName}] ${request.method?.toUpperCase()} ${request.url}`
          );
        }
        return request;
      },
      (error) => {
        if (this.logger) {
          this.logger.error(
            `[${this.providerName}] Request error: ${error.message}`
          );
        }
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        if (this.logger) {
          this.logger.debug(
            `[${this.providerName}] Response ${response.status} from ${response.config.url}`
          );
        }
        return response;
      },
      (error: AxiosError) => {
        if (this.logger) {
          const status = error.response?.status || 'unknown';
          const url = error.config?.url || 'unknown';
          this.logger.warn(
            `[${this.providerName}] Response error ${status} from ${url}: ${error.message}`
          );
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Add authentication header based on configuration
   */
  private addAuthenticationHeader(
    headers: Record<string, string>,
    auth: AIHttpClientAuth
  ): void {
    switch (auth.type) {
      case 'bearer':
        if (auth.token) {
          headers['Authorization'] = `Bearer ${auth.token}`;
        }
        break;
      case 'apikey':
        if (auth.headerName && auth.token) {
          headers[auth.headerName] = auth.token;
        }
        break;
      case 'custom':
        if (auth.headerName && auth.headerValue) {
          headers[auth.headerName] = auth.headerValue;
        }
        break;
    }
  }

  /**
   * Get the underlying axios instance
   */
  getInstance(): AxiosInstance {
    return this.client;
  }

  /**
   * Make a GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * Make a POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  /**
   * Make a PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }
}
