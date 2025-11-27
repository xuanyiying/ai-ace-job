import axios from 'axios';
import type {
  Template,
  PDFOptions,
  GeneratedPDF,
} from '../stores/generateStore';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const generateService = {
  async listTemplates(): Promise<Template[]> {
    const response = await axios.get(`${API_BASE_URL}/templates`);
    return response.data;
  },

  async getTemplate(templateId: string): Promise<Template> {
    const response = await axios.get(`${API_BASE_URL}/templates/${templateId}`);
    return response.data;
  },

  async previewPDF(
    optimizationId: string,
    templateId: string,
    options: PDFOptions
  ): Promise<string> {
    const response = await axios.post(
      `${API_BASE_URL}/generate/preview`,
      {
        optimizationId,
        templateId,
        options,
      },
      {
        responseType: 'blob',
      }
    );
    return URL.createObjectURL(response.data);
  },

  async generatePDF(
    optimizationId: string,
    templateId: string,
    options: PDFOptions
  ): Promise<GeneratedPDF> {
    const response = await axios.post(`${API_BASE_URL}/generate/pdf`, {
      optimizationId,
      templateId,
      options,
    });
    return response.data;
  },

  async downloadPDF(fileUrl: string, filename: string): Promise<void> {
    const response = await axios.get(fileUrl, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
