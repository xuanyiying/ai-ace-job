import axios from '../config/axios';

export const resumeService = {
  uploadResume: async (file: File, title?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) {
      formData.append('title', title);
    }

    const response = await axios.post('/resumes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  parseResume: async (resumeId: string) => {
    const response = await axios.get(`/resumes/${resumeId}/parse`);
    return response.data;
  },

  getResumes: async () => {
    const response = await axios.get('/resumes');
    return response.data;
  },

  getResume: async (resumeId: string) => {
    const response = await axios.get(`/resumes/${resumeId}`);
    return response.data;
  },

  updateResume: async (resumeId: string, data: any) => {
    const response = await axios.put(`/resumes/${resumeId}`, data);
    return response.data;
  },

  deleteResume: async (resumeId: string) => {
    await axios.delete(`/resumes/${resumeId}`);
  },

  setPrimaryResume: async (resumeId: string) => {
    const response = await axios.put(`/resumes/${resumeId}/primary`);
    return response.data;
  },
};
