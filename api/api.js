import { storage } from "../utils/storage";
import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

const API_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://13.127.122.25:5001";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// ✅ Attach token automatically on requests
api.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      if (Platform.OS === "web") {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      } else {
        config.headers["Content-Type"] = "multipart/form-data";
        config.timeout = 120000; // 2 minutes for file uploads
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Intercept 401 Unauthorized errors (session expired / invalid token)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.log("🔒 401 Unauthorized detected - Clearing expired auth session");
      try {
        await storage.multiRemove(["token", "profileCompleted"]);
      } catch (e) {
        console.error("Error clearing token on 401:", e);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
