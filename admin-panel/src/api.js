import axios from "axios";

const API_URL = "https://ramazonbot-api.saidqodirxon.uz/api";

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor - token qo'shish
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - xatolarni boshqarish
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth
export const auth = {
  login: (username, password) =>
    api.post("/auth/login", { username, password }),
  register: (data) => api.post("/auth/register", data),
};

// Users
export const users = {
  getAll: (page = 1, limit = 20) =>
    api.get(`/users?page=${page}&limit=${limit}`),
  search: (query) => api.get(`/users/search?query=${query}`),
  getById: (userId) => api.get(`/users/${userId}`),
  block: (userId, is_block) =>
    api.patch(`/users/${userId}/block`, { is_block }),
  makeAdmin: (userId, isAdmin, role) =>
    api.patch(`/users/${userId}/admin`, { isAdmin, role }),
};

// Settings
export const settings = {
  getAll: () => api.get("/settings"),
  getByKey: (key) => api.get(`/settings/${key}`),
  update: (key, value, description) =>
    api.put(`/settings/${key}`, { value, description }),
  setRequiredChannel: (channelId, channelUsername, channelTitle) =>
    api.post("/settings/required-channel", {
      channelId,
      channelUsername,
      channelTitle,
    }),
  setGreetingChannel: (channelId) =>
    api.post("/settings/greeting-channel", { channelId }),
  setReminderSettings: (reminderSettings) =>
    api.post("/settings/reminder-settings", reminderSettings),
  setAboutBot: (aboutText) => api.post("/settings/about-text", { aboutText }),
  setRamadanDate: (date) => api.post("/settings/ramadan-date", { date }),
  setPrayers: (prayers) => api.post("/settings/prayers", { prayers }),
};

// Greetings
export const greetings = {
  getAll: (status) => api.get(`/greetings${status ? `?status=${status}` : ""}`),
  approve: (id) => api.patch(`/greetings/${id}/approve`),
  reject: (id) => api.patch(`/greetings/${id}/reject`),
  delete: (id) => api.delete(`/greetings/${id}`),
};

// Stats
export const stats = {
  getDashboard: () => api.get("/stats"),
  getGrowth: () => api.get("/stats/growth"),
};

// Locations
export const locations = {
  getAll: () => api.get("/locations"),
  getById: (id) => api.get(`/locations/${id}`),
  create: (data) => api.post("/locations", data),
  update: (id, data) => api.put(`/locations/${id}`, data),
  delete: (id) => api.delete(`/locations/${id}`),
  getPublic: () => api.get("/locations/public/list"),
};

export default api;
