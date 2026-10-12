import axios from 'axios';
import Cookies from 'js-cookie';
import { API_URL } from '@/lib/config';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Rút thông điệp lỗi dễ đọc từ phản hồi lỗi của BE (ApiResponse hoặc ProblemDetails). */
function extractErrorMessage(error: any): string | null {
  const data = error?.response?.data;
  if (data && typeof data === 'object') {
    if (typeof data.message === 'string' && data.message) return data.message;
    if (data.errors && typeof data.errors === 'object') {
      const first = Object.values(data.errors as Record<string, string[]>)[0];
      if (Array.isArray(first) && first[0]) return first[0];
    }
    if (typeof data.title === 'string' && data.title) return data.title;
  }
  if (error?.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (error?.response?.status === 429) return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.';
  if (error?.code === 'ERR_NETWORK') return 'Không kết nối được máy chủ. Hãy kiểm tra Backend đã chạy chưa.';
  return null;
}

// Response interceptor: trả thẳng body { success, message, data }
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = extractErrorMessage(error);
    if (message) {
      return Promise.reject(new Error(message));
    }
    return Promise.reject(error);
  }
);

export const AuthAPI = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  sendRegisterOtp: (data: { email: string }) => api.post('/auth/send-register-otp', data),
  register: (data: { nickname: string; email: string; password: string; otp: string }) =>
    api.post('/auth/register', data),
  sendForgotPasswordOtp: (data: { email: string }) => api.post('/auth/forgot-password', data),
  resetPassword: (data: { email: string; otp: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),
  // BE dùng JWT stateless, không có endpoint logout → chỉ cần xoá cookie ở FE.
  logout: () => Promise.resolve(),
};

export const QuizAPI = {
  /** Danh sách bộ đề công khai (trang chủ) */
  getAll: () => api.get('/quizzes'),
  /** Bộ đề của chính người dùng (public + private) */
  getMine: () => api.get('/quizzes/mine'),
  getById: (id: string) => api.get(`/quizzes/${id}`),
  create: (data: { title: string; topic?: string; coverImageUrl?: string; isPublic?: boolean }) =>
    api.post('/quizzes', data),
  update: (id: string, data: any) => api.put(`/quizzes/${id}`, data),
  delete: (id: string) => api.delete(`/quizzes/${id}`),
  clone: (id: string) => api.post(`/quizzes/${id}/clone`),
};

export const GroupAPI = {
  getAll: () => api.get('/groups'),
  getMembers: (groupId: string) => api.get(`/groups/${groupId}/members`),
  create: (data: { name: string; description?: string }) => api.post('/groups', data),
  join: (groupCode: string) => api.post('/groups/join', { groupCode }),
  respondMember: (groupId: string, memberId: string, isApproved: boolean) =>
    api.put(`/groups/${groupId}/members/${memberId}`, { isApproved }),
  approveMember: (groupId: string, memberId: string) =>
    api.put(`/groups/${groupId}/members/${memberId}`, { isApproved: true }),
  rejectMember: (groupId: string, memberId: string) =>
    api.put(`/groups/${groupId}/members/${memberId}`, { isApproved: false }),
  removeMember: (groupId: string, memberId: string) =>
    api.delete(`/groups/${groupId}/members/${memberId}`),
  deleteGroup: (groupId: string) => api.delete(`/groups/${groupId}`),
};

export const SlideAPI = {
  getAllByQuiz: (quizId: string) => api.get(`/quizzes/${quizId}/slides`),
  create: (quizId: string, data: any) => api.post(`/quizzes/${quizId}/slides`, data),
  update: (quizId: string, slideId: string, data: any) =>
    api.put(`/quizzes/${quizId}/slides/${slideId}`, data),
  delete: (quizId: string, slideId: string) => api.delete(`/quizzes/${quizId}/slides/${slideId}`),
  approve: (quizId: string, slideId: string) =>
    api.post(`/quizzes/${quizId}/slides/${slideId}/approve`),
  reject: (quizId: string, slideId: string) =>
    api.post(`/quizzes/${quizId}/slides/${slideId}/reject`),
  approveAll: (quizId: string) => api.post(`/quizzes/${quizId}/slides/approve-all`),
};

export const AIJobAPI = {
  // BE nhận đường dẫn/URL tài liệu (không upload file trực tiếp)
  createJob: (data: { quizId: string; fileUrl: string }) => api.post('/aijobs', data),
  getJobStatus: (jobId: string) => api.get(`/aijobs/${jobId}`),
};

export const RoomAPI = {
  create: (data: { quizId: string; mode: string }) => api.post('/rooms', data),
  getByPin: (pin: string) => api.get(`/rooms/pin/${pin}`),
  getById: (id: string) => api.get(`/rooms/${id}`),
  getLeaderboard: (id: string) => api.get(`/rooms/${id}/leaderboard`),
  inviteGroup: (roomId: string, groupId: string) =>
    api.post(`/rooms/${roomId}/invite-group/${groupId}`),
  finish: (id: string) => api.post(`/rooms/${id}/finish`),
  exportReport: (id: string) => api.get(`/rooms/${id}/export`, { responseType: 'blob' }),
};

export const AnswerAPI = {
  saveDraft: (data: { roomPlayerId: string; slideId: string; answerData: string }) =>
    api.put('/rooms/answers/draft', data),
};
