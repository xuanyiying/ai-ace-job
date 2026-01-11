/**
 * Knowledge Base Service
 * API client for knowledge base operations
 */

import axios from '../config/axios';
import type {
  KBDocument,
  KBStats,
  KBQueryResponse,
  DocumentCategory,
} from '@/types';

const API_BASE = '/admin/knowledge-base';

/**
 * Upload a document to the knowledge base
 */
export async function uploadDocument(
  file: File,
  options: {
    category?: DocumentCategory;
    tags?: string[];
    title?: string;
  } = {}
): Promise<KBDocument> {
  const formData = new FormData();
  formData.append('file', file);

  if (options.category) {
    formData.append('category', options.category);
  }
  if (options.tags?.length) {
    options.tags.forEach((tag) => formData.append('tags', tag));
  }
  if (options.title) {
    formData.append('title', options.title);
  }

  const response = await axios.post<KBDocument>(
    `${API_BASE}/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

/**
 * Get all documents in the knowledge base
 */
export async function getDocuments(
  category?: DocumentCategory
): Promise<KBDocument[]> {
  const params = category ? { category } : {};
  const response = await axios.get<KBDocument[]>(`${API_BASE}/documents`, {
    params,
  });
  return response.data;
}

/**
 * Delete a document from the knowledge base
 */
export async function deleteDocument(
  id: string
): Promise<{ success: boolean; message: string }> {
  const response = await axios.delete<{ success: boolean; message: string }>(
    `${API_BASE}/documents/${id}`
  );
  return response.data;
}

/**
 * Get knowledge base statistics
 */
export async function getStats(): Promise<KBStats> {
  const response = await axios.get<KBStats>(`${API_BASE}/stats`);
  return response.data;
}

/**
 * Query the knowledge base
 */
export async function queryKnowledgeBase(
  query: string,
  options: {
    topK?: number;
    category?: DocumentCategory;
    generateAnswer?: boolean;
  } = {}
): Promise<KBQueryResponse> {
  const response = await axios.post<KBQueryResponse>(`${API_BASE}/query`, {
    query,
    ...options,
  });
  return response.data;
}

/**
 * Clear the entire knowledge base
 */
export async function clearKnowledgeBase(): Promise<{
  success: boolean;
  message: string;
}> {
  const response = await axios.delete<{ success: boolean; message: string }>(
    `${API_BASE}/clear`
  );
  return response.data;
}

export default {
  uploadDocument,
  getDocuments,
  deleteDocument,
  getStats,
  queryKnowledgeBase,
  clearKnowledgeBase,
};
