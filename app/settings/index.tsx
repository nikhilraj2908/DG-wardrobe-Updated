import AppBackground from "@/components/AppBackground";
import WardrobeHeader from "@/components/WardrobeHeader";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/app/theme/ThemeContext";
import { useEffect, useMemo, useState } from "react";
import api from "@/api/api";

const settingsPage = () => {
    const { logout } = useAuth();
    const { theme } = useTheme();
    const colors = theme.colors;
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [isGoogleUser, setIsGoogleUser] = useState(false);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const res = await api.get("/api/user/me");
                if (res.data?.user?.authProvider === "google") {
                    setIsGoogleUser(true);
                }
            } catch (e) {
                // Silently ignore
            }
        };
        checkUser();
    }, []);

    const handleBackNavigation = () => {
        router.back();
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "Are you sure you want to permanently delete your account? All your wardrobes, uploaded clothes, stories, and data will be permanently erased. This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete Forever",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.delete("/api/user/me");
                            await logout();
                            Alert.alert("Account Deleted", "Your account and all associated data have been permanently deleted.");
                            router.replace("/(auth)");
                        } catch (error: any) {
                            console.error("Error deleting account:", error);
                            Alert.alert("Error", error.response?.data?.message || "Failed to delete account. Please try again.");
                        }
                    },
                },
            ]
        );
    };

    const handleOpenPrivacyPolicy = () => {
        Alert.alert(
            "Privacy Policy",
            "DG Wardrobe respects your privacy. We collect your username, email, and wardrobe photos solely to provide wardrobe cataloging and community feed features. We never sell your personal data to third parties.",
            [{ text: "OK" }]
        );
    };

    const handleOpenTerms = () => {
        Alert.alert(
            "Terms of Service",
            "By using DG Wardrobe, you agree not to upload inappropriate, offensive, or copyrighted content. Violation of community guidelines will result in account suspension and removal of content.",
            [{ text: "I Agree" }]
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
            <AppBackground>
                <WardrobeHeader title="Settings" onBack={handleBackNavigation} />
                <ScrollView contentContainerStyle={styles.container}>
                    <Text style={styles.heading}>Settings</Text>
                    <Text style={styles.introText}>
                        Manage your account, preferences, and more.
                    </Text>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Account</Text>
                        {isGoogleUser ? (
                            <View style={styles.settingOption}>
                                <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
                                <Text style={[styles.text, { color: colors.textMuted }]}>
                                    Password managed by Google account
                                </Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.settingOption}
                                onPress={() => router.push("/change-password")}
                            >
                                <Ionicons name="key-outline" size={20} color={colors.primary} />
                                <Text style={styles.text}>Change Password</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.settingOption}>
                            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                            <Text style={styles.text}>Privacy Settings</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.settingOption}>
                            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
                            <Text style={styles.text}>Notification Preferences</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.settingOption}
                            onPress={() => router.push("/theme-settings")}
                        >
                            <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
                            <Text style={styles.text}>App Theme</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Support</Text>
                        <TouchableOpacity style={styles.settingOption}>
                            <Ionicons name="mail-outline" size={20} color={colors.primary} />
                            <Text style={styles.text}>Contact Us</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.settingOption} onPress={handleOpenTerms}>
                            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                            <Text style={styles.text}>Terms of Service</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.settingOption} onPress={handleOpenPrivacyPolicy}>
                            <Ionicons name="shield-outline" size={20} color={colors.primary} />
                            <Text style={styles.text}>Privacy Policy</Text>
                        </TouchableOpacity>
                        <Text style={styles.text}>App Version: 1.0.0</Text>
                        <Text style={styles.text}>Managed and created by - Alogicdata</Text>
                        <Text style={styles.text}>© 2026 Alogic Data. All rights reserved.</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.danger || "#EF4444" }]}>Danger Zone</Text>
                        <TouchableOpacity
                            style={[styles.settingOption, { borderBottomColor: "transparent" }]}
                            onPress={handleDeleteAccount}
                        >
                            <Ionicons name="trash-outline" size={20} color={colors.danger || "#EF4444"} />
                            <Text style={[styles.text, { color: colors.danger || "#EF4444", fontWeight: "600" }]}>
                                Delete Account
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </AppBackground>
        </SafeAreaView>
    );
};

const createStyles = (colors: any) =>
    StyleSheet.create({
        container: {
            padding: 20,
        },
        heading: {
            fontSize: 26,
            fontWeight: "bold",
            color: colors.textPrimary,
            marginBottom: 15,
        },
        introText: {
            fontSize: 16,
            color: colors.textSecondary,
            marginBottom: 20,
        },
        section: {
            marginBottom: 20,
        },
        sectionTitle: {
            fontSize: 20,
            fontWeight: "bold",
            color: colors.textPrimary,
            marginBottom: 10,
        },
        settingOption: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            marginBottom: 10,
        },
        text: {
            fontSize: 16,
            color: colors.textPrimary,
            marginLeft: 12,
        },
    });

export default settingsPage;