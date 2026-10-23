import { http, API_BASE_URL } from './http';

export interface ChatMessage {
  _id: string;
  roomType: 'project' | 'team' | 'direct';
  roomId: string;
  sender?: { name?: string; avatar?: string } | string;
  content?: string;
  attachments?: Array<{ url: string; name: string; size: number }>;
  createdAt: string;
}

export const messagesAPI = {
  getProjectMessages: (projectId: string): Promise<ChatMessage[]> => http.get(`/projects/${projectId}/messages`),
  uploadProjectFile: async (projectId: string, file: File, caption?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (caption) form.append('caption', caption);
    const base = API_BASE_URL.replace(/\/api$/, '');
    const res = await fetch(`${base}/api/projects/${projectId}/files`, {
      method: 'POST',
      body: form,
      credentials: 'include',
      headers: { ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) },
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }
};



