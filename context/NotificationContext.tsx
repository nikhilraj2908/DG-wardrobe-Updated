import React, { createContext, useContext, useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useAuth } from "./AuthContext";
import { registerForPushNotificationsAsync } from "@/utils/pushNotifications";

interface NotificationContextType {
  registerPushNotifications: () => Promise<string | null>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Register token on mount and whenever authentication state updates
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  useEffect(() => {
    if (isAuthenticated && token) {
      registerForPushNotificationsAsync();
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    // 1. Listen for foreground notifications
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log("📲 Notification received in foreground:", notification.request.content);
    });

    // 2. Listen for user tapping a notification in the mobile shutter or foreground banner
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        type?: string;
        itemId?: string;
        userId?: string;
        ownerId?: string;
        orderNumber?: string;
      } | undefined;

      console.log("👆 User tapped notification shutter with data:", data);

      if (data?.type === "premium_request") {
        // Access request -> redirect to premium requests approval screen
        router.push("/premium/requests" as any);
      } else if (data?.type === "premium_approved") {
        // Access approved -> redirect to owner's profile to see unlocked collection
        const targetUserId = data?.ownerId || data?.userId;
        if (targetUserId) {
          router.push(`/profile/${targetUserId}`);
        } else if (data?.itemId) {
          router.push(`/wardrobe/item/${data.itemId}`);
        } else {
          router.push("/notifications");
        }
      } else if (data?.itemId) {
        // Outfit or clothing item like/comment/approved access
        router.push(`/wardrobe/item/${data.itemId}`);
      } else if (data?.userId) {
        // Follow notification -> redirect to user's public profile
        router.push(`/profile/${data.userId}`);
      } else {
        // Default -> open dedicated in-app notifications screen
        router.push("/notifications");
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);

  return (
    <NotificationContext.Provider
      value={{
        registerPushNotifications: registerForPushNotificationsAsync,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};

