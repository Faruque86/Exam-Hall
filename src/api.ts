/**
 * Client API utility to talk with the full-stack Express backend.
 */

const API_BASE = "/api";

export async function request(url: string, options?: RequestInit) {
  let userIdHeader: Record<string, string> = {};
  try {
    const saved = localStorage.getItem('school_quiz_cur_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.id) {
        userIdHeader = { "X-User-Id": parsed.id };
      }
    }
  } catch (e) {
    // Fail-safe
  }

  const finalOptions = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...userIdHeader,
      ...(options?.headers || {}),
    },
  };
  
  const response = await fetch(`${API_BASE}${url}`, finalOptions);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export const AuthAPI = {
  register: (payload: any) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: any) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  registerRequest: (payload: any) => request("/auth/register-request", { method: "POST", body: JSON.stringify(payload) }),
  registerVerify: (payload: any) => request("/auth/register-verify", { method: "POST", body: JSON.stringify(payload) }),
  loginRequest: (payload: any) => request("/auth/login-request", { method: "POST", body: JSON.stringify(payload) }),
  loginVerify: (payload: any) => request("/auth/login-verify", { method: "POST", body: JSON.stringify(payload) }),
  forgotPassword: (payload: any) => request("/auth/forgot-password", { method: "POST", body: JSON.stringify(payload) }),
  updateProfile: (payload: any) => request("/auth/update-profile", { method: "POST", body: JSON.stringify(payload) }),
  getUsers: () => request("/users"),
  updateUserRole: (id: string, role: 'admin' | 'user') => request(`/users/${id}/role`, { method: "POST", body: JSON.stringify({ role }) }),
};

export const QuizAPI = {
  getAll: (filters: { admin?: boolean; subject?: string; search?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.admin) params.append("admin", "true");
    if (filters.subject) params.append("subject", filters.subject);
    if (filters.search) params.append("search", filters.search);
    return request(`/quizzes?${params.toString()}`);
  },
  getOne: (id: string) => request(`/quizzes/${id}`),
  create: (payload: any) => request("/quizzes", { method: "POST", body: JSON.stringify(payload) }),
  update: (id: string, payload: any) => request(`/quizzes/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  delete: (id: string) => request(`/quizzes/${id}`, { method: "DELETE" }),
  submit: (id: string, payload: { userId: string; userName: string; userEmail: string; answers: any; timeSpentSeconds: number }) => {
    return request(`/quizzes/${id}/submit`, { method: "POST", body: JSON.stringify(payload) });
  },
  importParse: (csvText: string) => request("/quizzes/import-parse", { method: "POST", body: JSON.stringify({ text: csvText }) }),
  aiGenerate: (payload: { command: string; image?: string; imageMimeType?: string }) => request("/quizzes/ai-generate", { method: "POST", body: JSON.stringify(payload) }),
};

export const AnalyticsAPI = {
  getStats: () => request("/analytics"),
  getHistory: (userId: string) => request(`/attempts/user/${userId}`),
  getLeaderboard: () => request("/leaderboard"),
  getQuizAttempts: (quizId: string) => request(`/attempts/quiz/${quizId}`),
};

export const ApprovalsAPI = {
  getAll: () => request("/approvals"),
  getUserApprovals: (userId: string) => request(`/approvals/user/${userId}`),
  request: (payload: { userId: string; userName: string; userEmail: string; quizId: string; quizTitle: string }) => {
    return request("/approvals/request", { method: "POST", body: JSON.stringify(payload) });
  },
  resolve: (id: string, status: 'approved' | 'rejected') => {
    return request(`/approvals/${id}/resolve`, { method: "POST", body: JSON.stringify({ status }) });
  }
};

export const SubMenusAPI = {
  getAll: () => request("/submenus"),
  create: (payload: { parentClass: string; en: string; bn: string }) => {
    return request("/submenus", { method: "POST", body: JSON.stringify(payload) });
  },
  delete: (id: string) => request(`/submenus/${id}`, { method: "DELETE" }),
  reorder: (ids: string[]) => request("/submenus/reorder", { method: "POST", body: JSON.stringify({ ids }) }),
};
