import api from './api';

export const uploadService = {
  uploadImage: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post<{ data: { url: string } }>('/uploads/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.url;
  },
};
