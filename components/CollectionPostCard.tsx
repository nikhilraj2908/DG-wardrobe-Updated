import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../api/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { useTheme } from "@/app/theme/ThemeContext";

const { width: WINDOW_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = WINDOW_WIDTH - 24; // paddingHorizontal: 12 on container
const DOOR_WIDTH = CARD_WIDTH / 2;
const CARD_HEIGHT = 380;

/* ================= TYPES ================= */

interface WardrobeItem {
  _id: string;
  name?: string;
  brand?: string;
  price?: number;
  imageUrl?: string;
  images?: string[];
  image?: string;
  category?: any;
  wardrobe?: any;
  visibility?: string;
}

interface CollectionPostCardProps {
  item: {
    _id: string;
    type: "collection";
    user: {
      _id: string;
      username: string;
      photo?: string;
    };
    stats: {
      totalWorth: number;
      totalWardrobes: number;
      totalItems: number;
    };
  };
}

/* ================= COMPONENT ================= */

export default function CollectionPostCard({ item }: CollectionPostCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isOpen, setIsOpen] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);

  const leftDoorAnim = useRef(new Animated.Value(0)).current;
  const rightDoorAnim = useRef(new Animated.Value(0)).current;
  const interiorAnim = useRef(new Animated.Value(0)).current;

  /* ================= HELPERS ================= */

  const formatPrice = (price?: number) => {
    if (!price) return "₹0";
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
    if (price >= 1000) return `₹${(price / 1000).toFixed(1)}K`;
    return `₹${price}`;
  };

  const getItemImage = (i: WardrobeItem): string | null => {
    if (Array.isArray(i.images) && i.images.length > 0) {
      return resolveImageUrl(i.images[0]) || null;
    }
    if (i.imageUrl) {
      return resolveImageUrl(i.imageUrl) || null;
    }
    if (i.image) {
      return resolveImageUrl(i.image) || null;
    }
    return null;
  };

  useEffect(() => {
    fetchLikeCount();
    fetchViewCount();
  }, []);

  const fetchLikeCount = async () => {
    try {
      const res = await api.get(`/api/collections/${item.user._id}/likes`);
      setLikeCount(res.data.totalLikes || 0);
    } catch (err) {
      // Quiet fail
    }
  };

  const fetchViewCount = async () => {
    try {
      const res = await api.get(`/api/collections/${item.user._id}/view`);
      setViewCount(res.data.totalViews || 0);
    } catch (err) {
      // Quiet fail
    }
  };

  const trackView = async () => {
    try {
      const res = await api.post(`/api/collections/${item.user._id}/view`);
      if (res.data?.totalViews) setViewCount(res.data.totalViews);
    } catch (err) {
      // Quiet fail
    }
  };

  const loadWardrobeItems = async () => {
    if (items.length > 0) return;

    try {
      setLoadingItems(true);
      const token = await AsyncStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await api.get(`/api/wardrobe/user/${item.user._id}/items`, {
        headers,
      });

      const fetched = res.data?.items || res.data || [];
      setItems(Array.isArray(fetched) ? fetched : []);
    } catch (err) {
      console.log("Error loading collection items:", err);
    } finally {
      setLoadingItems(false);
    }
  };

  /* ================= DOOR ANIMATIONS ================= */

  const openGate = () => {
    setIsOpen(true);
    trackView();
    loadWardrobeItems();

    Animated.parallel([
      Animated.timing(leftDoorAnim, {
        toValue: -DOOR_WIDTH - 15,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rightDoorAnim, {
        toValue: DOOR_WIDTH + 15,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(interiorAnim, {
        toValue: 1,
        duration: 450,
        delay: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeGate = () => {
    Animated.parallel([
      Animated.timing(leftDoorAnim, {
        toValue: 0,
        duration: 450,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rightDoorAnim, {
        toValue: 0,
        duration: 450,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(interiorAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsOpen(false);
    });
  };

  const handleItemPress = (wardrobeItem: WardrobeItem) => {
    router.push(`/wardrobe/item/${wardrobeItem._id}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* ================= LAYER 1: INTERIOR (REVEALED WHEN OPEN) ================= */}
        <Animated.View
          style={[
            styles.interiorContainer,
            {
              opacity: interiorAnim,
              transform: [
                {
                  scale: interiorAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.94, 1],
                  }),
                },
              ],
            },
          ]}
          pointerEvents={isOpen ? "auto" : "none"}
        >
          {/* Header Bar */}
          <View style={styles.interiorHeader}>
            <View style={styles.interiorHeaderLeft}>
              <View style={styles.miniAvatar}>
                {item.user.photo ? (
                  <Image
                    source={{ uri: resolveImageUrl(item.user.photo) }}
                    style={styles.miniAvatarImg}
                  />
                ) : (
                  <Text style={styles.miniAvatarText}>
                    {item.user.username.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.interiorTitle} numberOfLines={1}>
                  {item.user.username}’s Wardrobe
                </Text>
                <Text style={styles.interiorSubtitle}>
                  {loadingItems
                    ? "Opening closet..."
                    : `${items.length} ${items.length === 1 ? "item" : "items"} • ${formatPrice(item.stats.totalWorth)}`}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={closeGate}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={16} color="#fff" />
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>

          {/* Items Content */}
          {loadingItems ? (
            <View style={styles.interiorLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.interiorLoadingText}>
                Loading clothes inside...
              </Text>
            </View>
          ) : items.length > 0 ? (
            <ScrollView
              style={styles.itemsScrollView}
              contentContainerStyle={styles.itemsGrid}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {items.map((clothing) => {
                const imgUrl = getItemImage(clothing);
                const itemName =
                  clothing.name ||
                  (typeof clothing.category === "object"
                    ? clothing.category?.name
                    : clothing.category) ||
                  "Wardrobe Item";

                return (
                  <TouchableOpacity
                    key={clothing._id}
                    style={styles.itemCard}
                    activeOpacity={0.8}
                    onPress={() => handleItemPress(clothing)}
                  >
                    <View style={styles.itemImageWrapper}>
                      {imgUrl ? (
                        <Image
                          source={{ uri: imgUrl }}
                          style={styles.itemImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.itemImagePlaceholder}>
                          <Ionicons
                            name="shirt-outline"
                            size={28}
                            color={colors.textMuted}
                          />
                        </View>
                      )}
                      {clothing.price ? (
                        <View style={styles.itemPriceTag}>
                          <Text style={styles.itemPriceText}>
                            ₹{clothing.price.toLocaleString("en-IN")}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {itemName}
                      </Text>
                      {clothing.brand ? (
                        <Text style={styles.itemBrand} numberOfLines={1}>
                          {clothing.brand}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyInterior}>
              <Ionicons
                name="shirt-outline"
                size={44}
                color="rgba(255,255,255,0.4)"
              />
              <Text style={styles.emptyInteriorTitle}>Wardrobe is empty</Text>
              <Text style={styles.emptyInteriorSub}>
                No visible items found in this wardrobe
              </Text>
            </View>
          )}
        </Animated.View>

        {/* ================= LAYER 2: LEFT DOOR ================= */}
        <Animated.View
          style={[
            styles.door,
            styles.leftDoor,
            {
              transform: [{ translateX: leftDoorAnim }],
            },
          ]}
          pointerEvents={isOpen ? "none" : "auto"}
        >
          <View style={styles.doorCrop}>
            <Image
              source={require("../assets/images/bg-wardrobe.png")}
              style={[styles.doorBgImage, { left: 0 }]}
              resizeMode="cover"
            />
            <View style={styles.doorDarkOverlay} />
          </View>
          <View style={styles.leftDoorBorder} />
          <View style={styles.leftDoorHandle} />
        </Animated.View>

        {/* ================= LAYER 3: RIGHT DOOR ================= */}
        <Animated.View
          style={[
            styles.door,
            styles.rightDoor,
            {
              transform: [{ translateX: rightDoorAnim }],
            },
          ]}
          pointerEvents={isOpen ? "none" : "auto"}
        >
          <View style={styles.doorCrop}>
            <Image
              source={require("../assets/images/bg-wardrobe.png")}
              style={[styles.doorBgImage, { left: -DOOR_WIDTH }]}
              resizeMode="cover"
            />
            <View style={styles.doorDarkOverlay} />
          </View>
          <View style={styles.rightDoorBorder} />
          <View style={styles.rightDoorHandle} />
        </Animated.View>

        {/* ================= LAYER 4: CLOSED OVERLAY CONTENT ================= */}
        <Animated.View
          style={[
            styles.closedContentOverlay,
            {
              opacity: interiorAnim.interpolate({
                inputRange: [0, 0.25],
                outputRange: [1, 0],
              }),
              transform: [
                {
                  scale: interiorAnim.interpolate({
                    inputRange: [0, 0.25],
                    outputRange: [1, 0.92],
                  }),
                },
              ],
            },
          ]}
          pointerEvents={isOpen ? "none" : "auto"}
        >
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={openGate}
            style={styles.touchableArea}
          >
            <View style={styles.content}>
              {/* Avatar */}
              <View style={styles.avatar}>
                {item.user.photo ? (
                  <Image
                    source={{ uri: resolveImageUrl(item.user.photo) }}
                    style={styles.avatarPhoto}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {item.user.username.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>

              {/* Username & Handle */}
              <Text style={styles.username}>{item.user.username}</Text>
              <Text style={styles.handle}>
                @{item.user.username.toLowerCase()}
              </Text>

              {/* Stats Pill */}
              <View style={styles.statsPill}>
                <View style={styles.moneyStat}>
                  <View style={styles.rupeeCircle}>
                    <Text style={styles.rupeeSymbol}>₹</Text>
                  </View>
                  <Text style={styles.moneyValue}>
                    {formatPrice(item.stats.totalWorth).replace("₹", "")}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.statRight}>
                  <View style={styles.statRow}>
                    <Ionicons name="thumbs-up-outline" size={14} color="#fff" />
                    <Text style={styles.statText}>{likeCount} Likes</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Ionicons name="shirt-outline" size={14} color="#fff" />
                    <Text style={styles.statText}>
                      {item.stats.totalItems} Items
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Ionicons name="eye-outline" size={14} color="#fff" />
                    <Text style={styles.statText}>{viewCount} Views</Text>
                  </View>
                </View>
              </View>

              {/* Peek text / Call to action */}
              <View style={styles.peekContainer}>
                <Ionicons
                  name="hand-right-outline"
                  size={15}
                  color="#fff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.peekText}>What’s inside? Wanna see!</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

/* ================= STYLES ================= */

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 12,
      marginBottom: 16,
    },
    card: {
      height: CARD_HEIGHT,
      borderRadius: 28,
      overflow: "hidden",
      backgroundColor: "#16121E",
      marginTop: 16,
      borderWidth: 1.5,
      borderColor: colors.primaryDark,
      position: "relative",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 6,
    },

    /* ---- DOORS ---- */
    door: {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: DOOR_WIDTH,
      zIndex: 2,
      overflow: "hidden",
    },
    leftDoor: {
      left: 0,
    },
    rightDoor: {
      right: 0,
    },
    doorCrop: {
      width: DOOR_WIDTH,
      height: CARD_HEIGHT,
      overflow: "hidden",
    },
    doorBgImage: {
      position: "absolute",
      top: 0,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    },
    doorDarkOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0, 0, 0, 0.35)",
    },
    leftDoorBorder: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      width: 1.5,
      backgroundColor: "rgba(255, 255, 255, 0.22)",
    },
    rightDoorBorder: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 1.5,
      backgroundColor: "rgba(0, 0, 0, 0.4)",
    },
    leftDoorHandle: {
      position: "absolute",
      right: 6,
      top: "44%",
      width: 5,
      height: 48,
      borderRadius: 3,
      backgroundColor: "#DDD6FE",
      shadowColor: "#000",
      shadowOffset: { width: -2, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 3,
      elevation: 5,
    },
    rightDoorHandle: {
      position: "absolute",
      left: 6,
      top: "44%",
      width: 5,
      height: 48,
      borderRadius: 3,
      backgroundColor: "#DDD6FE",
      shadowColor: "#000",
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 3,
      elevation: 5,
    },

    /* ---- CLOSED CONTENT OVERLAY ---- */
    closedContentOverlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 3,
    },
    touchableArea: {
      flex: 1,
    },
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 10,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: colors.primary,
    },
    avatarPhoto: {
      width: "100%",
      height: "100%",
    },
    avatarText: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.primaryDark,
    },
    username: {
      fontSize: 18,
      fontWeight: "700",
      color: "#ffffff",
    },
    handle: {
      fontSize: 13,
      color: "rgba(255, 255, 255, 0.7)",
      marginBottom: 16,
    },
    statsPill: {
      flexDirection: "row",
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 14,
      width: "100%",
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    moneyStat: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    rupeeCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#ffffff",
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    rupeeSymbol: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.primary,
    },
    moneyValue: {
      fontSize: 20,
      fontWeight: "700",
      color: "#ffffff",
    },
    divider: {
      width: 1.5,
      backgroundColor: "rgba(255,255,255,0.35)",
      marginHorizontal: 16,
    },
    statRight: {
      flex: 1,
      justifyContent: "center",
      gap: 6,
    },
    statRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    statText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "500",
    },
    peekContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.25)",
    },
    peekText: {
      fontSize: 13,
      color: "#ffffff",
      fontWeight: "600",
      letterSpacing: 0.3,
    },

    /* ---- INTERIOR (OPEN STATE) ---- */
    interiorContainer: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "#181422",
      zIndex: 1,
    },
    interiorHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255, 255, 255, 0.1)",
      backgroundColor: "rgba(0, 0, 0, 0.25)",
    },
    interiorHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 10,
    },
    miniAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 10,
      overflow: "hidden",
    },
    miniAvatarImg: {
      width: "100%",
      height: "100%",
    },
    miniAvatarText: {
      color: "#ffffff",
      fontSize: 15,
      fontWeight: "700",
    },
    interiorTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: "#ffffff",
    },
    interiorSubtitle: {
      fontSize: 12,
      color: "rgba(255, 255, 255, 0.65)",
      marginTop: 2,
    },
    closeBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      gap: 4,
    },
    closeBtnText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "600",
    },

    /* ---- INTERIOR ITEMS GRID ---- */
    itemsScrollView: {
      flex: 1,
    },
    itemsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 20,
    },
    itemCard: {
      width: "48%",
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      borderRadius: 14,
      padding: 7,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.12)",
    },
    itemImageWrapper: {
      width: "100%",
      height: 110,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      marginBottom: 6,
      position: "relative",
    },
    itemImage: {
      width: "100%",
      height: "100%",
    },
    itemImagePlaceholder: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    itemPriceTag: {
      position: "absolute",
      bottom: 5,
      right: 5,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    itemPriceText: {
      color: "#ffffff",
      fontSize: 11,
      fontWeight: "700",
    },
    itemInfo: {
      paddingHorizontal: 2,
    },
    itemName: {
      fontSize: 12,
      fontWeight: "600",
      color: "#ffffff",
      marginBottom: 2,
    },
    itemBrand: {
      fontSize: 11,
      color: "rgba(255, 255, 255, 0.65)",
    },

    /* ---- LOADING & EMPTY STATES ---- */
    interiorLoading: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    interiorLoadingText: {
      marginTop: 12,
      color: "rgba(255, 255, 255, 0.8)",
      fontSize: 13,
      fontWeight: "500",
    },
    emptyInterior: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    emptyInteriorTitle: {
      marginTop: 10,
      fontSize: 15,
      fontWeight: "700",
      color: "#ffffff",
    },
    emptyInteriorSub: {
      marginTop: 4,
      fontSize: 12,
      color: "rgba(255, 255, 255, 0.6)",
      textAlign: "center",
    },
  });
