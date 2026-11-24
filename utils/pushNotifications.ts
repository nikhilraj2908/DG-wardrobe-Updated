import api from "@/api/api";
import { storage } from "@/utils/storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// 1. Configure foreground notification presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Configure Android notification channel with MAX importance so it drops down from the mobile shutter
 */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#7C3AED",
      enableVibrate: true,
      showBadge: true,
    });
  }
}

/**
 * Request OS-level permissions, retrieve Expo push token, and sync with backend
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    await setupNotificationChannel();

    if (!Device.isDevice) {
      console.log("ℹ️ Push notifications require a physical device.");
      return null;
    }

    // 1. Check existing permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // 2. Request permission if not already granted
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("⚠️ Push notification permission not granted by user.");
      return null;
    }

    // 3. Resolve EAS Project ID
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      "4d2059e7-e779-4f9d-979b-b64d170fb65f";

    if (!projectId) {
      console.error("❌ EAS Project ID missing for push notifications.");
      return null;
    }

    // 4. Retrieve push token
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenResponse.data;
    console.log("🔔 Expo Push Token retrieved:", pushToken);

    // 5. Cache token locally
    await storage.setItem("expo_push_token", pushToken);

    // 6. Send token to backend
    try {
      await api.post("/api/notifications/push-token", { pushToken });
      console.log("✅ Push token registered with backend.");
    } catch (apiErr) {
      // Backend may be offline or user not logged in yet; token is cached
      console.log("ℹ️ Could not send push token to backend (will retry after login):", apiErr);
    }

    return pushToken;
  } catch (err) {
    console.error("❌ Error registering for push notifications:", err);
    return null;
  }
}

/**
 * Retrieve user's push notification preferences from backend
 */
export async function getNotificationPreference(): Promise<boolean> {
  try {
    const res = await api.get("/api/notifications/preference");
    return res.data?.notificationsEnabled ?? true;
  } catch (err) {
    return true; // Default to enabled
  }
}

/**
 * Update user's push notification preferences on backend
 */
export async function updateNotificationPreference(enabled: boolean): Promise<boolean> {
  try {
    await api.patch("/api/notifications/preference", { enabled });
    return true;
  } catch (err) {
    console.error("❌ Failed to update notification preference:", err);
    return false;
  }
}

