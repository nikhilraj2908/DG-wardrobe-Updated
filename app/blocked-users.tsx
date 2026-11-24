import api from "@/api/api";
import AppBackground from "@/components/AppBackground";
import WardrobeHeader from "@/components/WardrobeHeader";
import { useTheme } from "@/app/theme/ThemeContext";
import { storage } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface BlockedUser {
  id: string;
  username: string;
  photo?: string;
  blockedAt?: string;
}

export default function BlockedUsersScreen() {
  const { theme, isDarkMode } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);

  const loadBlockedUsers = async () => {
    try {
      setLoading(true);
      const userMap = new Map<string, BlockedUser>();

      // 1. Load from local persistent storage
      const rawLocal = await storage.getItem("blocked_users_list");
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed)) {
          parsed.forEach((u: any) => {
            if (u && (u.id || u.username)) {
              const key = u.id || u.username;
              userMap.set(key, {
                id: u.id || key,
                username: u.username || "User",
                photo: u.photo,
                blockedAt: u.blockedAt || new Date().toISOString(),
              });
            }
          });
        }
      }

      // 2. Try fetching from backend API if available
      try {
        const res = await api.get("/api/user/blocked");
        const serverUsers = res.data?.users || res.data?.blockedUsers || res.data || [];
        if (Array.isArray(serverUsers)) {
          serverUsers.forEach((u: any) => {
            const key = u._id || u.id || u.username;
            if (key) {
              userMap.set(key, {
                id: u._id || u.id || key,
                username: u.username || "User",
                photo: u.photo,
                blockedAt: u.blockedAt || new Date().toISOString(),
              });
            }
          });
        }
      } catch (_) {
        // Backend endpoint might not exist, local storage is the source of truth
      }

      setBlockedUsers(Array.from(userMap.values()));
    } catch (err) {
      console.error("Error loading blocked users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const handleUnblock = (user: BlockedUser) => {
    Alert.alert(
      `Unblock @${user.username}?`,
      "They will be able to see your public profile, wardrobes, and clothes again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          style: "default",
          onPress: async () => {
            try {
              setUnblockingId(user.id);

              // 1. Call backend unblock endpoint
              try {
                await api.post(`/api/user/unblock/${user.id}`);
              } catch (_) {
                try {
                  await api.delete(`/api/user/block/${user.id}`);
                } catch (__) {
                  // Fallback for custom backend routes
                }
              }

              // 2. Update local storage
              const updated = blockedUsers.filter((u) => u.id !== user.id && u.username !== user.username);
              setBlockedUsers(updated);
              await storage.setItem("blocked_users_list", JSON.stringify(updated));

              Alert.alert("Unblocked", `@${user.username} has been unblocked.`);
            } catch (err: any) {
              console.error("Error unblocking user:", err);
              Alert.alert("Error", "Could not unblock user. Please try again.");
            } finally {
              setUnblockingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: BlockedUser }) => {
    const isUnblocking = unblockingId === item.id;
    const initial = item.username ? item.username.charAt(0).toUpperCase() : "U";

    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.nameWrapper}>
            <Text style={styles.username}>@{item.username}</Text>
            <Text style={styles.statusText}>Blocked Account</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.unblockBtn}
          onPress={() => handleUnblock(item)}
          disabled={isUnblocking}
          activeOpacity={0.8}
        >
          {isUnblocking ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.unblockBtnText}>Unblock</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="shield-checkmark-outline" size={48} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No Blocked Accounts</Text>
        <Text style={styles.emptySubtitle}>
          You haven't blocked anyone yet. When you block a user from a post or their profile, they will appear here and you can unblock them anytime.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppBackground>
        <WardrobeHeader title="Blocked Accounts" onBack={() => router.back()} />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading blocked accounts...</Text>
          </View>
        ) : (
          <FlatList
            data={blockedUsers}
            keyExtractor={(item) => item.id || item.username}
            renderItem={renderItem}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </AppBackground>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDarkMode: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 15,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    listContent: {
      padding: 16,
      flexGrow: 1,
    },

    // User Card
    userCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    userInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDarkMode ? "#2D1B4E" : "#F3E8FF",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    avatarText: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.primary,
    },
    nameWrapper: {
      flex: 1,
    },
    username: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 2,
    },
    statusText: {
      fontSize: 12.5,
      color: colors.textMuted,
      fontWeight: "500",
    },

    // Unblock Button
    unblockBtn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: isDarkMode ? "transparent" : "#FAF5FF",
      minWidth: 80,
      alignItems: "center",
    },
    unblockBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primary,
    },

    // Empty State
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
      paddingTop: 80,
    },
    emptyIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isDarkMode ? "#2D1B4E" : "#FAF5FF",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyTitle: {
      fontSize: 19,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
  });
