import api from "@/api/api";
import AppBackground from "@/components/AppBackground";
import WardrobeHeader from "@/components/WardrobeHeader";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/app/theme/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChangePassword() {
  const { token } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [fetchingUser, setFetchingUser] = useState(true);

  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // Password visibility states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!token) return;
        const res = await api.get("/api/user/me");
        const provider = res.data?.user?.authProvider || res.data?.authProvider;
        if (provider === "google") {
          setIsGoogleUser(true);
        }
      } catch (e) {
        console.error("Error fetching user in change-password:", e);
      } finally {
        setFetchingUser(false);
      }
    };
    fetchUser();
  }, [token]);

  const passwordsMatch = newPass.length > 0 && confirm.length > 0 && newPass === confirm;
  const passwordsMismatch = confirm.length > 0 && newPass !== confirm;
  const isFormValid = current.length > 0 && newPass.length >= 6 && confirm.length >= 6 && passwordsMatch;

  const handleChange = async () => {
    if (!current || !newPass || !confirm) {
      Alert.alert("Missing Fields", "Please fill in all password fields.");
      return;
    }

    if (newPass.length < 6) {
      Alert.alert("Password Too Short", "New password must be at least 6 characters long.");
      return;
    }

    if (newPass !== confirm) {
      Alert.alert("Mismatch", "New password and confirmation do not match.");
      return;
    }

    if (current === newPass) {
      Alert.alert("Invalid Password", "New password cannot be the same as your current password.");
      return;
    }

    try {
      setLoading(true);

      await api.post(
        "/api/auth/change-password",
        {
          currentPassword: current,
          newPassword: newPass,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert("Success", "Your password has been changed successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to change password. Please check your current password.";
      Alert.alert("Change Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppBackground>
          <WardrobeHeader title="Change Password" onBack={() => router.back()} />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Checking account security...</Text>
          </View>
        </AppBackground>
      </SafeAreaView>
    );
  }

  if (isGoogleUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppBackground>
          <WardrobeHeader title="Change Password" onBack={() => router.back()} />
          <View style={styles.googleContainer}>
            <View style={styles.googleCard}>
              <View style={styles.googleIconCircle}>
                <Ionicons name="logo-google" size={32} color="#4285F4" />
              </View>
              <Text style={styles.googleTitle}>Google Account Linked</Text>
              <Text style={styles.googleDesc}>
                Your account signs in securely using Google OAuth. You do not have a separate password for DigiWardrobe.
              </Text>
              <Text style={styles.googleSubtext}>
                To update your password or security settings, please visit your Google Account management page.
              </Text>
              <TouchableOpacity
                style={styles.returnBtn}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Text style={styles.returnBtnText}>Back to Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </AppBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppBackground>
        <WardrobeHeader title="Change Password" onBack={() => router.back()} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* HERO SECURITY BANNER */}
            <View style={styles.heroCard}>
              <LinearGradient
                colors={["#A855F7", "#EC4899"]}
                style={styles.heroIconCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="shield-checkmark" size={26} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.heroTextWrapper}>
                <Text style={styles.heroTitle}>Security & Password</Text>
                <Text style={styles.heroSubtitle}>
                  Choose a secure password to protect your wardrobe and account.
                </Text>
              </View>
            </View>

            {/* FORM CARD */}
            <View style={styles.formCard}>
              {/* CURRENT PASSWORD */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CURRENT PASSWORD</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.leftIcon} />
                  <TextInput
                    placeholder="Enter current password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showCurrent}
                    style={styles.input}
                    value={current}
                    onChangeText={setCurrent}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrent(!showCurrent)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showCurrent ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* NEW PASSWORD */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="key-outline" size={20} color={colors.primary} style={styles.leftIcon} />
                  <TextInput
                    placeholder="Enter new password (min. 6 characters)"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showNew}
                    style={styles.input}
                    value={newPass}
                    onChangeText={setNewPass}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNew(!showNew)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showNew ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* CONFIRM NEW PASSWORD */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
                  {passwordsMatch && (
                    <Text style={styles.matchSuccess}>✓ Passwords match</Text>
                  )}
                  {passwordsMismatch && (
                    <Text style={styles.matchError}>✗ Passwords do not match</Text>
                  )}
                </View>
                <View
                  style={[
                    styles.inputWrapper,
                    passwordsMatch && styles.inputSuccessBorder,
                    passwordsMismatch && styles.inputErrorBorder,
                  ]}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} style={styles.leftIcon} />
                  <TextInput
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showConfirm}
                    style={styles.input}
                    value={confirm}
                    onChangeText={setConfirm}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm(!showConfirm)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showConfirm ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* REQUIREMENTS TIPS BOX */}
              <View style={styles.tipsBox}>
                <Text style={styles.tipsHeading}>Password Guidelines</Text>
                <View style={styles.tipRow}>
                  <Ionicons
                    name={newPass.length >= 6 ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={newPass.length >= 6 ? "#10B981" : colors.textMuted}
                  />
                  <Text style={[styles.tipText, newPass.length >= 6 && styles.tipActive]}>
                    At least 6 characters
                  </Text>
                </View>
                <View style={styles.tipRow}>
                  <Ionicons
                    name={passwordsMatch ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={passwordsMatch ? "#10B981" : colors.textMuted}
                  />
                  <Text style={[styles.tipText, passwordsMatch && styles.tipActive]}>
                    Both passwords match
                  </Text>
                </View>
                <View style={styles.tipRow}>
                  <Ionicons
                    name={current && current !== newPass ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={current && current !== newPass ? "#10B981" : colors.textMuted}
                  />
                  <Text style={[styles.tipText, current && current !== newPass && styles.tipActive]}>
                    Different from current password
                  </Text>
                </View>
              </View>

              {/* ACTION BUTTON */}
              <TouchableOpacity
                onPress={handleChange}
                disabled={loading}
                activeOpacity={0.85}
                style={styles.btnWrapper}
              >
                <LinearGradient
                  colors={["#A855F7", "#EC4899"]}
                  style={[styles.gradientBtn, !isFormValid && styles.gradientBtnDisabled]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="key" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.btnText}>Change Password</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },

    // Hero Security Banner
    heroCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    heroIconCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },
    heroTextWrapper: {
      flex: 1,
    },
    heroTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 3,
    },
    heroSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },

    // Form Card
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.35 : 0.07,
      shadowRadius: 12,
      elevation: 3,
    },
    fieldGroup: {
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary,
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    labelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    matchSuccess: {
      fontSize: 12,
      fontWeight: "600",
      color: "#10B981",
    },
    matchError: {
      fontSize: 12,
      fontWeight: "600",
      color: "#EF4444",
    },

    // Inputs
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDarkMode ? "#1A1A24" : "#F8FAFC",
      borderRadius: 14,
      borderWidth: 1.2,
      borderColor: colors.border,
      paddingHorizontal: 14,
      height: 52,
    },
    inputSuccessBorder: {
      borderColor: "#10B981",
    },
    inputErrorBorder: {
      borderColor: "#EF4444",
    },
    leftIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      height: "100%",
    },

    // Tips Box
    tipsBox: {
      backgroundColor: isDarkMode ? "#1C1929" : "#FAF5FF",
      borderRadius: 14,
      padding: 14,
      marginTop: 4,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.lightborder || colors.border,
    },
    tipsHeading: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primaryDark || "#7C3AED",
      marginBottom: 8,
    },
    tipRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
    },
    tipText: {
      fontSize: 12.5,
      color: colors.textMuted,
      fontWeight: "500",
    },
    tipActive: {
      color: colors.textPrimary,
      fontWeight: "600",
    },

    // Button
    btnWrapper: {
      borderRadius: 14,
      overflow: "hidden",
      shadowColor: "#A855F7",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    gradientBtn: {
      height: 52,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
      borderRadius: 14,
    },
    gradientBtnDisabled: {
      opacity: 0.65,
    },
    btnText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 0.3,
    },

    // Google User State
    googleContainer: {
      flex: 1,
      padding: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    googleCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 28,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
      width: "100%",
      maxWidth: 360,
    },
    googleIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "#EEF2FF",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    googleTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 10,
      textAlign: "center",
    },
    googleDesc: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 12,
    },
    googleSubtext: {
      fontSize: 12.5,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 18,
      marginBottom: 24,
    },
    returnBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 14,
      width: "100%",
      alignItems: "center",
    },
    returnBtnText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
  });
