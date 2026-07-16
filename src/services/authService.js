import { apiClient, clearApiToken, setApiToken } from "./apiClient";

export const authService = {
  async login(email, password) {
    const response = await apiClient.post("/api/auth/login", { email, password });
    setApiToken(response.token);
    return response;
  },

  async register(data) {
    const response = await apiClient.post("/api/auth/register", data);
    setApiToken(response.token);
    return response;
  },

  me() {
    return apiClient.get("/api/auth/me");
  },

  async logout() {
    try {
      return await apiClient.post("/api/auth/logout", {});
    } finally {
      clearApiToken();
    }
  },

  forgotPassword(email) {
    return apiClient.post("/api/auth/password/forgot", { email });
  },

  resetPassword(token, password, passwordConfirmation) {
    return apiClient.patch("/api/auth/password/reset", {
      token,
      password,
      password_confirmation: passwordConfirmation,
    });
  },
};
