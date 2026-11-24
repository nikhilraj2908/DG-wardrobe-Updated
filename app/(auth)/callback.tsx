import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as AuthSession from "expo-auth-session";
import Constants from "expo-constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Alert, View } from "react-native";

const extra = Constants.expoConfig?.extra || (Constants.manifest as any)?.extra || {};
const AUTH0_DOMAIN = extra.AUTH0_DOMAIN || "";
const AUTH0_CLIENT_ID = extra.AUTH0_CLIENT_ID || "";
const API_URL = extra.apiBaseUrl || "";

const discovery = {
    authorizationEndpoint: `https://${AUTH0_DOMAIN}/authorize`,
    tokenEndpoint: `https://${AUTH0_DOMAIN}/oauth/token`,
};

// Module-level singletons: shared across all mounts/re-renders of Callback
const processedCodes = new Set<string>();
let inFlightExchange: Promise<void> | null = null;

export default function Callback() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { login, setAuthInProgress } = useAuth();

    useEffect(() => {
        const run = async () => {
            const code = String(params.code || "");
            if (!code) {
                console.log("❌ No code received, redirecting to welcome");
                setAuthInProgress(false);
                router.replace("/(auth)/welcome");
                return;
            }

            // 1. If this exact authorization code was already exchanged successfully, ignore
            if (processedCodes.has(code)) {
                console.log("🔐 Authorization code already exchanged. Skipping duplicate exchange.");
                return;
            }

            // 2. If an exchange is already in progress, wait for it instead of starting a second one
            if (inFlightExchange) {
                console.log("🔐 Authorization code exchange already in progress. Awaiting existing exchange...");
                try {
                    await inFlightExchange;
                } catch (_) {
                    // Handled by the primary worker
                }
                return;
            }

            // 3. Start the single atomic exchange
            inFlightExchange = (async () => {
                setAuthInProgress(true);
                console.log("🔐 Loading... Checking user authentication");

                const codeVerifier = (await AsyncStorage.getItem("auth0_code_verifier")) || "";
                if (!codeVerifier) {
                    console.log("❌ Missing code_verifier, redirecting to welcome");
                    setAuthInProgress(false);
                    router.replace("/(auth)/welcome");
                    return;
                }

                const redirectUri = (await AsyncStorage.getItem("auth0_redirect_uri")) ||
                    AuthSession.makeRedirectUri({ scheme: "mydgwardrobe", path: "callback" });

                console.log("🔐 Exchange code for token");
                const tokenRes = await AuthSession.exchangeCodeAsync(
                    { clientId: AUTH0_CLIENT_ID, code, redirectUri, extraParams: { code_verifier: codeVerifier } },
                    discovery
                );

                const idToken = tokenRes.idToken;
                if (!idToken) throw new Error("No id_token received");

                console.log("🔐 Token received, sending to backend");
                const res = await axios.post(`${API_URL}/api/auth/google`, { idToken });

                console.log("🔐 Backend response:", res.data);
                const profileCompleted = !!res.data.user?.profileCompleted;
                console.log("🔐 Profile Completed Status:", profileCompleted);

                // Mark code as used before navigating
                processedCodes.add(code);

                // Update auth state in app
                await login(res.data.token, profileCompleted);

                // Clean up temporary Auth0 storage keys
                await AsyncStorage.multiRemove(["auth0_code_verifier", "auth0_redirect_uri"]);

                setAuthInProgress(false);

                if (profileCompleted) {
                    console.log("🔐 Redirecting to profile page");
                    router.replace("/(tabs)/profile");
                } else {
                    console.log("🔐 Redirecting to complete profile page");
                    router.replace("/(auth)/complete-profile");
                }
            })();

            try {
                await inFlightExchange;
            } catch (err: any) {
                console.log("❌ Callback error:", err);
                setAuthInProgress(false);

                // Safety guard: If token is already present (e.g. backend succeeded), suppress alert!
                const savedToken = await AsyncStorage.getItem("token");
                if (savedToken) {
                    console.log("🔐 User token already saved. Suppressing false callback error dialog.");
                    router.replace("/(tabs)/profile");
                    return;
                }

                const errorMsg =
                    err?.response?.data?.message ||
                    err?.message ||
                    "Could not connect to backend server.";
                Alert.alert("Login Failed", `${errorMsg}\n\nEndpoint: ${API_URL}/api/auth/google`, [
                    { text: "OK", onPress: () => router.replace("/(auth)/welcome") }
                ]);
            } finally {
                inFlightExchange = null;
            }
        };

        run();
    }, [params.code]);

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" />
        </View>
    );
}
