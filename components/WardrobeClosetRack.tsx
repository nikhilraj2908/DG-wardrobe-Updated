import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Category {
  _id: string;
  name: string;
  type?: string;
}

interface WardrobeItem {
  _id: string;
  wardrobe: any;
  category: string | Category;
  price: number;
  brand?: string;
  imageUrl: string;
  images?: string[];
  createdAt: string;
}

interface WardrobeClosetRackProps {
  items: WardrobeItem[];
  colors: any;
  onItemPress: (item: WardrobeItem) => void;
  onItemLongPress?: (item: WardrobeItem) => void;
  onAddClothes?: () => void;
  isPublicView?: boolean;
  selectedItemIds?: string[];
  itemSelectionMode?: boolean;
  toggleItemSelect?: (id: string) => void;
  onMatchPair?: (item: WardrobeItem) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ITEM_WIDTH = Math.round(SCREEN_WIDTH * 0.64);
const ITEM_HEIGHT = Math.round(SCREEN_HEIGHT * 0.44);
const SPACING = (SCREEN_WIDTH - ITEM_WIDTH) / 2;

export default function WardrobeClosetRack({
  items,
  colors,
  onItemPress,
  onItemLongPress,
  onAddClothes,
  isPublicView = false,
  selectedItemIds = [],
  itemSelectionMode = false,
  toggleItemSelect,
  onMatchPair,
}: WardrobeClosetRackProps) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<Animated.FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const getFirstItemImage = (item: WardrobeItem): string | null => {
    if (Array.isArray(item.images) && item.images.length > 0) {
      return resolveImageUrl(item.images[0]) || null;
    }
    if (item.imageUrl) {
      return resolveImageUrl(item.imageUrl) || null;
    }
    return null;
  };

  const activeItem = items[activeIndex] || items[0] || null;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true }
  );

  const handleMomentumScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.min(
      Math.max(Math.round(offsetX / ITEM_WIDTH), 0),
      items.length - 1
    );
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const getCategoryName = (item: WardrobeItem) => {
    if (typeof item.category === "string") return item.category;
    return item.category?.name || "Garment";
  };

  const getBrandLabel = (item: WardrobeItem) => {
    if (item.brand && item.brand.trim().length > 0) {
      return item.brand;
    }
    return "Private Collection";
  };

  if (!items || items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
          <Ionicons name="shirt-outline" size={44} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          No clothes on the rack yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Add items to hang them in your virtual wardrobe studio.
        </Text>
        {!isPublicView && onAddClothes && (
          <TouchableOpacity
            style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
            onPress={onAddClothes}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.emptyAddBtnText}>Hang First Clothes</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ================= CLOSET CEILING & RAIL BAR ================= */}
      <View style={styles.wardrobeHeaderContainer}>
        {/* Warm overhead ambient spotlight */}
        <LinearGradient
          colors={["rgba(251, 191, 36, 0.28)", "rgba(251, 191, 36, 0.05)", "transparent"]}
          style={styles.ambientSpotlight}
          pointerEvents="none"
        />

        {/* Top Wardrobe Rail */}
        <View style={styles.railTrackContainer}>
          {/* Left Bracket */}
          <View style={styles.bracket} />

          {/* Chrome / Metallic Rod */}
          <LinearGradient
            colors={["#475569", "#94A3B8", "#F1F5F9", "#94A3B8", "#334155"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.metallicRail}
          />

          {/* Right Bracket */}
          <View style={[styles.bracket, { right: 0, left: undefined }]} />
        </View>
      </View>

      {/* ================= CASCADING SLIDER ================= */}
      <View style={styles.sliderWrapper}>
        <Animated.FlatList
          ref={flatListRef}
          data={items}
          keyExtractor={(item) => item._id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH}
          decelerationRate="fast"
          bounces={true}
          contentContainerStyle={{
            paddingHorizontal: SPACING,
            paddingTop: 14,
            paddingBottom: 10,
          }}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          renderItem={({ item, index }) => {
            const inputRange = [
              (index - 1) * ITEM_WIDTH,
              index * ITEM_WIDTH,
              (index + 1) * ITEM_WIDTH,
            ];

            // Scale interpolation (Active item grows to 1.06, sides shrink to 0.84)
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.83, 1.06, 0.83],
              extrapolate: "clamp",
            });

            // Opacity interpolation (Active item 100%, background layers softly dimmed)
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.6, 1, 0.6],
              extrapolate: "clamp",
            });

            // TranslateY interpolation (creates gentle hanging depth)
            const translateY = scrollX.interpolate({
              inputRange,
              outputRange: [14, 0, 14],
              extrapolate: "clamp",
            });

            const imageUri = getFirstItemImage(item);
            const isSelected = selectedItemIds.includes(item._id);

            return (
              <Animated.View
                style={[
                  styles.itemWrapper,
                  {
                    width: ITEM_WIDTH,
                    transform: [{ scale }, { translateY }],
                    opacity,
                  },
                ]}
              >
                {/* Metallic Hook connecting hanger to rail */}
                <View style={styles.hookWrapper}>
                  <View style={styles.metallicHook} />
                </View>

                {/* Wooden Hanger Structure */}
                <View style={styles.hangerGraphicWrapper}>
                  <View style={styles.woodenHangerBar}>
                    <LinearGradient
                      colors={["#9A5B2D", "#C88A58", "#E8B285", "#A66436"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.woodenHangerGradient}
                    />
                  </View>
                </View>

                {/* Garment Card */}
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => {
                    if (itemSelectionMode && toggleItemSelect) {
                      toggleItemSelect(item._id);
                    } else {
                      onItemPress(item);
                    }
                  }}
                  onLongPress={() => {
                    if (onItemLongPress) {
                      onItemLongPress(item);
                    }
                  }}
                  style={[
                    styles.garmentCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border || "rgba(255,255,255,0.08)",
                    },
                    isSelected && styles.garmentCardSelected,
                  ]}
                >
                  <View style={styles.garmentImageContainer}>
                    {imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.garmentImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.placeholderContainer}>
                        <Ionicons name="shirt-outline" size={54} color={colors.primary} />
                      </View>
                    )}

                    {/* Selection Indicator */}
                    {itemSelectionMode && (
                      <View style={styles.selectionBadge}>
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
                        ) : (
                          <View
                            style={[
                              styles.unselectedCircle,
                              { borderColor: colors.primary },
                            ]}
                          />
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          }}
        />
      </View>

      {/* ================= BOUTIQUE HANGING DETAILS TAG ================= */}
      {activeItem && (
        <View style={styles.boutiqueTagContainer}>
          {/* Subtle hanging cord */}
          <View style={styles.tagCord} />

          {/* Boutique Tag Card */}
          <View
            style={[
              styles.tagCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border || "rgba(255,255,255,0.1)",
              },
            ]}
          >
            <View style={styles.tagContentRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.categoryBadgeRow}>
                  <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>
                    {getCategoryName(activeItem).toUpperCase()}
                  </Text>
                  <Text style={[styles.brandText, { color: colors.textSecondary }]}>
                    • {getBrandLabel(activeItem)}
                  </Text>
                </View>
                <Text style={[styles.priceTagText, { color: colors.textPrimary }]}>
                  ₹{Number(activeItem.price || 0).toLocaleString("en-IN")}
                </Text>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={[styles.inspectButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
                onPress={() => onItemPress(activeItem)}
              >
                <Text style={styles.inspectButtonText}>Inspect</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Pagination dots & index */}
            <View style={styles.paginationRow}>
              <View style={styles.dotsWrapper}>
                {items.slice(0, 10).map((_, i) => (
                  <View
                    key={`dot-${i}`}
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          i === activeIndex
                            ? colors.primary
                            : "rgba(156, 163, 175, 0.35)",
                        width: i === activeIndex ? 18 : 6,
                      },
                    ]}
                  />
                ))}
                {items.length > 10 && (
                  <Text style={[styles.moreDotsText, { color: colors.textMuted }]}>
                    +{items.length - 10}
                  </Text>
                )}
              </View>

              <Text style={[styles.counterText, { color: colors.textMuted }]}>
                {activeIndex + 1} of {items.length}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  wardrobeHeaderContainer: {
    width: "100%",
    height: 40,
    justifyContent: "flex-end",
    position: "relative",
  },
  ambientSpotlight: {
    position: "absolute",
    top: -20,
    left: "15%",
    right: "15%",
    height: 180,
    borderRadius: 90,
  },
  railTrackContainer: {
    height: 14,
    width: "100%",
    justifyContent: "center",
    position: "relative",
    paddingHorizontal: 12,
  },
  metallicRail: {
    height: 7,
    width: "100%",
    borderRadius: 3.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  bracket: {
    position: "absolute",
    left: 8,
    top: 0,
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: "#334155",
    borderWidth: 1,
    borderColor: "#94A3B8",
    zIndex: 2,
  },
  sliderWrapper: {
    height: ITEM_HEIGHT + 70,
    justifyContent: "center",
  },
  itemWrapper: {
    alignItems: "center",
    justifyContent: "flex-start",
  },
  hookWrapper: {
    width: 24,
    height: 22,
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 10,
  },
  metallicHook: {
    width: 16,
    height: 18,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: "#E2E8F0",
    backgroundColor: "transparent",
  },
  hangerGraphicWrapper: {
    width: ITEM_WIDTH * 0.78,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9,
    marginTop: -2,
  },
  woodenHangerBar: {
    width: "100%",
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  woodenHangerGradient: {
    flex: 1,
  },
  garmentCard: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
    marginTop: 4,
  },
  garmentCardSelected: {
    borderWidth: 2.5,
    shadowOpacity: 0.45,
  },
  garmentImageContainer: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  garmentImage: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 20,
  },
  unselectedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  boutiqueTagContainer: {
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 20,
  },
  tagCord: {
    width: 2,
    height: 10,
    backgroundColor: "rgba(156, 163, 175, 0.4)",
  },
  tagCard: {
    width: "100%",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  tagContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  brandText: {
    fontSize: 12,
    fontWeight: "500",
  },
  priceTagText: {
    fontSize: 22,
    fontWeight: "800",
  },
  inspectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  inspectButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(156, 163, 175, 0.2)",
  },
  dotsWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  moreDotsText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 3,
  },
  counterText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyAddBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

