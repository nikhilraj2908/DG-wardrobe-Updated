import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  PanResponder,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/app/theme/ThemeContext";
import api from "@/api/api";
import { storage } from "@/utils/storage";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import AppBackground from "@/components/AppBackground";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CANVAS_HEIGHT = Math.min(SCREEN_HEIGHT * 0.52, 450);

interface WardrobeItem {
  _id: string;
  images?: string[];
  imageUrl?: string;
  image?: string;
  brand?: string;
  price?: number;
  category?: {
    _id?: string;
    name?: string;
    type?: string;
  } | string;
  categoryType?: string;
  wardrobe?: {
    _id?: string;
    name?: string;
  } | string;
}

interface CanvasGarment {
  instanceId: string;
  item: WardrobeItem;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  zIndex: number;
}

/* =========================================================
   DRAGGABLE & RESIZABLE CANVAS GARMENT COMPONENT
========================================================= */
interface DraggableGarmentProps {
  garment: CanvasGarment;
  isSelected: boolean;
  onSelect: (instanceId: string) => void;
  onUpdatePosition: (instanceId: string, x: number, y: number) => void;
  onRemove: (instanceId: string) => void;
  primaryColor: string;
}

const DraggableGarment: React.FC<DraggableGarmentProps> = ({
  garment,
  isSelected,
  onSelect,
  onUpdatePosition,
  onRemove,
  primaryColor,
}) => {
  const pan = useRef(new Animated.ValueXY({ x: garment.x, y: garment.y })).current;

  // Sync pan when x or y prop changes
  useEffect(() => {
    pan.setValue({ x: garment.x, y: garment.y });
  }, [garment.x, garment.y]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: () => {
        onSelect(garment.instanceId);
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        const currentX = (pan.x as any)._value;
        const currentY = (pan.y as any)._value;
        onUpdatePosition(garment.instanceId, currentX, currentY);
      },
    })
  ).current;

  const rawImg =
    (Array.isArray(garment.item.images) && garment.item.images[0]) ||
    garment.item.imageUrl ||
    garment.item.image ||
    "";
  const imageUri = resolveImageUrl(rawImg);

  const displayWidth = garment.width * garment.scale;
  const displayHeight = garment.height * garment.scale;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.draggableItemContainer,
        {
          transform: pan.getTranslateTransform(),
          zIndex: garment.zIndex,
          width: displayWidth,
          height: displayHeight,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onSelect(garment.instanceId)}
        style={[
          styles.garmentWrapper,
          isSelected && [styles.garmentSelected, { borderColor: primaryColor }],
        ]}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.garmentImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholderGarment}>
            <Ionicons name="shirt-outline" size={36} color={primaryColor} />
          </View>
        )}

        {/* Selected badge & Delete button */}
        {isSelected && (
          <TouchableOpacity
            style={[styles.removeHandle, { backgroundColor: "#EF4444" }]}
            onPress={() => onRemove(garment.instanceId)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

/* =========================================================
   MAIN MATCH PAIR SCREEN
========================================================= */
export default function MatchPairScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ outfitId?: string }>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Garments currently placed on the canvas
  const [canvasGarments, setCanvasGarments] = useState<CanvasGarment[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);

  // User's catalog of uploaded clothes
  const [allItems, setAllItems] = useState<WardrobeItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("All");

  // Save outfit modal state
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [outfitName, setOutfitName] = useState("");
  const [savingOutfit, setSavingOutfit] = useState(false);

  // Fetch all user wardrobe items
  useEffect(() => {
    fetchMyClothes();
  }, []);

  // Load existing outfit if restyling from profile
  useEffect(() => {
    if (params?.outfitId) {
      loadExistingOutfit(params.outfitId);
    }
  }, [params?.outfitId]);

  const loadExistingOutfit = async (id: string) => {
    try {
      const token = await storage.getItem("token");
      if (!token) return;
      const res = await api.get("/api/outfits/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const target = (res.data.outfits || []).find((o: any) => o._id === id);
      if (!target || !target.items || target.items.length === 0) return;

      if (target.name) {
        setOutfitName(target.name);
      }

      const garmentsToLoad: CanvasGarment[] = target.items.map((slot: any, idx: number) => ({
        instanceId: `canvas_${Date.now()}_${idx}`,
        item: slot.item,
        x: typeof slot.x === "number" ? slot.x : Math.max(10, (SCREEN_WIDTH - 200) / 2),
        y: typeof slot.y === "number" ? slot.y : idx === 0 ? 30 : idx === 1 ? 190 : 280,
        width: slot.width || 170,
        height: slot.height || 170,
        scale: slot.scale || 1,
        zIndex: slot.zIndex || idx + 1,
      }));

      setCanvasGarments(garmentsToLoad);
      if (garmentsToLoad.length > 0) {
        setSelectedInstanceId(garmentsToLoad[0].instanceId);
      }
    } catch (err) {
      console.log("Error loading existing outfit for restyle:", err);
    }
  };

  const fetchMyClothes = async () => {
    try {
      setLoadingItems(true);
      const token = await storage.getItem("token");
      if (!token) {
        Alert.alert("Authentication Required", "Please login to match pairs from your wardrobe.");
        return;
      }

      const res = await api.get("/api/wardrobe/my", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const items = Array.isArray(res.data) ? res.data : [];
      setAllItems(items);
    } catch (err) {
      console.error("Error fetching user clothes for match pair:", err);
      Alert.alert("Error", "Failed to load your wardrobe clothes.");
    } finally {
      setLoadingItems(false);
    }
  };

  // Derive available categories from user's clothes
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((it) => {
      let name = "";
      if (it.category && typeof it.category === "object") {
        name = it.category.name || "";
      } else if (typeof it.category === "string") {
        name = it.category;
      }
      if (name.trim()) {
        set.add(name.trim());
      }
    });

    const list = Array.from(set);
    return ["All", ...list];
  }, [allItems]);

  // Filter items by selected category
  const filteredItems = useMemo(() => {
    if (selectedCategoryTab === "All") return allItems;
    return allItems.filter((it) => {
      const catName =
        typeof it.category === "object"
          ? it.category?.name || ""
          : it.category || "";
      return catName.toLowerCase() === selectedCategoryTab.toLowerCase();
    });
  }, [allItems, selectedCategoryTab]);

  // Helper to get active garment on canvas
  const activeGarment = useMemo(() => {
    return canvasGarments.find((g) => g.instanceId === selectedInstanceId) || null;
  }, [canvasGarments, selectedInstanceId]);

  /* =========================================================
     CANVAS ACTIONS: ADD, REMOVE, MOVE, RESIZE
  ========================================================= */

  // Add item from drawer onto canvas
  const handleAddItemToCanvas = (item: WardrobeItem) => {
    // Intelligent initial vertical placement:
    // If canvas is empty, place at top (Y = 20)
    // If 1 item already exists (like shirt), place next item below it (Y = 190)
    // If 2 items exist, place below (Y = 280)
    const count = canvasGarments.length;
    const initialY = count === 0 ? 30 : count === 1 ? 190 : 280;
    const initialX = Math.max(10, (SCREEN_WIDTH - 200) / 2);

    const newGarment: CanvasGarment = {
      instanceId: `canvas_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      item,
      x: initialX,
      y: Math.min(initialY, CANVAS_HEIGHT - 160),
      width: 170,
      height: 170,
      scale: 1,
      zIndex: count + 1,
    };

    setCanvasGarments((prev) => [...prev, newGarment]);
    setSelectedInstanceId(newGarment.instanceId);
  };

  const handleUpdatePosition = (instanceId: string, x: number, y: number) => {
    setCanvasGarments((prev) =>
      prev.map((g) => (g.instanceId === instanceId ? { ...g, x, y } : g))
    );
  };

  const handleRemoveGarment = (instanceId: string) => {
    setCanvasGarments((prev) => prev.filter((g) => g.instanceId !== instanceId));
    if (selectedInstanceId === instanceId) {
      setSelectedInstanceId(null);
    }
  };

  const handleClearCanvas = () => {
    if (canvasGarments.length === 0) return;
    Alert.alert("Clear Canvas?", "Remove all clothes from the canvas?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: () => {
          setCanvasGarments([]);
          setSelectedInstanceId(null);
        },
      },
    ]);
  };

  // Adjust scale / width / height of active garment
  const handleScaleChange = (delta: number) => {
    if (!selectedInstanceId) return;
    setCanvasGarments((prev) =>
      prev.map((g) => {
        if (g.instanceId !== selectedInstanceId) return g;
        const newScale = Math.min(Math.max(0.6, g.scale + delta), 2.0);
        return { ...g, scale: Number(newScale.toFixed(2)) };
      })
    );
  };

  const handleDimensionChange = (dimension: "width" | "height", delta: number) => {
    if (!selectedInstanceId) return;
    setCanvasGarments((prev) =>
      prev.map((g) => {
        if (g.instanceId !== selectedInstanceId) return g;
        const currentVal = g[dimension];
        const newVal = Math.min(Math.max(100, currentVal + delta), 320);
        return { ...g, [dimension]: newVal };
      })
    );
  };

  const handleLayerChange = (direction: "front" | "back") => {
    if (!selectedInstanceId) return;
    setCanvasGarments((prev) => {
      const maxZ = Math.max(...prev.map((p) => p.zIndex), 1);
      const minZ = Math.min(...prev.map((p) => p.zIndex), 1);
      return prev.map((g) => {
        if (g.instanceId !== selectedInstanceId) return g;
        return {
          ...g,
          zIndex: direction === "front" ? maxZ + 1 : Math.max(1, minZ - 1),
        };
      });
    });
  };

  /* =========================================================
     SAVE OUTFIT / MATCHED PAIR
  ========================================================= */
  const handleSaveOutfit = async () => {
    if (canvasGarments.length === 0) {
      Alert.alert("Empty Pair", "Please select at least one garment on the canvas to match a pair.");
      return;
    }

    setOutfitName("");
    setSaveModalVisible(true);
  };

  const handleConfirmSaveOutfit = async () => {
    try {
      setSavingOutfit(true);
      const token = await storage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Please login again.");
        return;
      }

      const payload = {
        name: outfitName.trim() || `Pair ${new Date().toLocaleDateString()}`,
        items: canvasGarments.map((g) => ({
          itemId: g.item._id,
          x: g.x,
          y: g.y,
          scale: g.scale,
          width: g.width,
          height: g.height,
          zIndex: g.zIndex,
        })),
      };

      const res = await api.post("/api/outfits", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSaveModalVisible(false);
      Alert.alert(
        "Pair Saved! 🎉",
        `"${res.data.outfit?.name || "Matched Pair"}" has been saved to your wardrobe profile.`,
        [
          {
            text: "View Profile",
            onPress: () => router.push("/(tabs)/profile"),
          },
          {
            text: "Keep Styling",
            style: "cancel",
          },
        ]
      );
    } catch (err: any) {
      console.error("Error saving outfit pair:", err);
      Alert.alert("Save Failed", err.response?.data?.message || "Could not save outfit pair.");
    } finally {
      setSavingOutfit(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <AppBackground>
        <View style={styles.container}>
          {/* ================= HEADER ================= */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back-outline" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={{ alignItems: "center" }}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Match Pair Studio</Text>
              <Text style={styles.headerSubtitle}>
                {canvasGarments.length === 0
                  ? "Select items to build a pair"
                  : `${canvasGarments.length} items on canvas`}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              {canvasGarments.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearCanvas}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.clearBtn}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger || "#EF4444"} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: canvasGarments.length > 0 ? colors.primary : colors.card },
                ]}
                onPress={handleSaveOutfit}
                disabled={canvasGarments.length === 0}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="sparkles"
                  size={15}
                  color={canvasGarments.length > 0 ? "#FFFFFF" : colors.textMuted}
                />
                <Text
                  style={[
                    styles.saveBtnText,
                    { color: canvasGarments.length > 0 ? "#FFFFFF" : colors.textMuted },
                  ]}
                >
                  Save Pair
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ================= CANVASS (FITTING ROOM) ================= */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setSelectedInstanceId(null)}
            style={[styles.canvasContainer, { backgroundColor: colors.surface }]}
          >
            {/* Studio Guide Silhouette / Grid Hint */}
            <View style={styles.canvasBackgroundGuide}>
              <Ionicons name="body-outline" size={130} color={colors.border} style={{ opacity: 0.15 }} />
            </View>

            {canvasGarments.length === 0 ? (
              <View style={styles.emptyCanvasNotice}>
                <Ionicons name="shirt-outline" size={42} color={colors.primary} style={{ opacity: 0.6 }} />
                <Text style={[styles.emptyCanvasTitle, { color: colors.textPrimary }]}>
                  Your Canvas is Empty
                </Text>
                <Text style={[styles.emptyCanvasSub, { color: colors.textMuted }]}>
                  Tap any shirt, pant, or jacket below to start pairing your outfit!
                </Text>
              </View>
            ) : null}

            {/* Placed Canvas Garments */}
            {canvasGarments.map((garment) => (
              <DraggableGarment
                key={garment.instanceId}
                garment={garment}
                isSelected={selectedInstanceId === garment.instanceId}
                onSelect={(id) => setSelectedInstanceId(id)}
                onUpdatePosition={handleUpdatePosition}
                onRemove={handleRemoveGarment}
                primaryColor={colors.primary}
              />
            ))}
          </TouchableOpacity>

          {/* ================= ACTIVE GARMENT ADJUSTMENT BAR ================= */}
          {activeGarment ? (
            <View style={[styles.adjustmentToolbar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.toolTitleRow}>
                <Text style={[styles.toolActiveName, { color: colors.textPrimary }]} numberOfLines={1}>
                  Adjusting: {typeof activeGarment.item.category === "object" ? activeGarment.item.category?.name : activeGarment.item.category || "Item"}
                </Text>
                <Text style={styles.toolSizeBadge}>
                  {Math.round(activeGarment.scale * 100)}%
                </Text>
              </View>

              <View style={styles.adjustmentControlsRow}>
                {/* Size / Scale controls */}
                <View style={styles.controlGroup}>
                  <Text style={styles.controlLabel}>Scale</Text>
                  <View style={styles.buttonStepper}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleScaleChange(-0.1)}
                    >
                      <Ionicons name="remove" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleScaleChange(0.1)}
                    >
                      <Ionicons name="add" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Length / Height adjustment */}
                <View style={styles.controlGroup}>
                  <Text style={styles.controlLabel}>Length (↕)</Text>
                  <View style={styles.buttonStepper}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleDimensionChange("height", -15)}
                    >
                      <Ionicons name="remove" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleDimensionChange("height", 15)}
                    >
                      <Ionicons name="add" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Width adjustment */}
                <View style={styles.controlGroup}>
                  <Text style={styles.controlLabel}>Width (↔)</Text>
                  <View style={styles.buttonStepper}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleDimensionChange("width", -15)}
                    >
                      <Ionicons name="remove" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleDimensionChange("width", 15)}
                    >
                      <Ionicons name="add" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Layer order */}
                <View style={styles.controlGroup}>
                  <Text style={styles.controlLabel}>Layer</Text>
                  <View style={styles.buttonStepper}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleLayerChange("back")}
                    >
                      <Ionicons name="arrow-down" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleLayerChange("front")}
                    >
                      <Ionicons name="arrow-up" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          {/* ================= CATEGORY SELECTOR CHIPS ================= */}
          <View style={styles.categorySection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScrollContainer}
            >
              {categoriesList.map((cat) => {
                const isActive = selectedCategoryTab.toLowerCase() === cat.toLowerCase();
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      isActive && [styles.categoryChipActive, { backgroundColor: colors.primary }],
                      !isActive && { backgroundColor: colors.card },
                    ]}
                    onPress={() => setSelectedCategoryTab(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        isActive && styles.categoryChipTextActive,
                        !isActive && { color: colors.textSecondary },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ================= CLOTHES DRAWER (PICK ITEMS TO ADD) ================= */}
          <View style={[styles.drawerContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <View style={styles.drawerHeaderRow}>
              <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>
                {selectedCategoryTab} Clothes ({filteredItems.length})
              </Text>
              <Text style={styles.drawerInstruction}>Tap item to add onto canvas</Text>
            </View>

            {loadingItems ? (
              <View style={styles.drawerLoading}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={[styles.drawerLoadingText, { color: colors.textMuted }]}>
                  Loading your clothes...
                </Text>
              </View>
            ) : filteredItems.length === 0 ? (
              <View style={styles.drawerEmpty}>
                <Text style={[styles.drawerEmptyText, { color: colors.textMuted }]}>
                  No items found in this category.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.drawerItemsScroll}
              >
                {filteredItems.map((item) => {
                  const raw =
                    (Array.isArray(item.images) && item.images[0]) ||
                    item.imageUrl ||
                    item.image ||
                    "";
                  const resolved = resolveImageUrl(raw);
                  const itemName =
                    typeof item.category === "object"
                      ? item.category?.name || "Item"
                      : item.category || "Item";

                  return (
                    <TouchableOpacity
                      key={item._id}
                      style={[styles.shelfCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => handleAddItemToCanvas(item)}
                      activeOpacity={0.8}
                    >
                      {resolved ? (
                        <Image source={{ uri: resolved }} style={styles.shelfImage} resizeMode="contain" />
                      ) : (
                        <View style={styles.shelfPlaceholder}>
                          <Ionicons name="shirt-outline" size={28} color={colors.primary} />
                        </View>
                      )}
                      <Text style={[styles.shelfItemName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {itemName}
                      </Text>
                      {item.brand ? (
                        <Text style={[styles.shelfBrand, { color: colors.textMuted }]} numberOfLines={1}>
                          {item.brand}
                        </Text>
                      ) : null}
                      <View style={[styles.addIconCircle, { backgroundColor: colors.primary }]}>
                        <Ionicons name="add" size={14} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* ================= SAVE OUTFIT MODAL ================= */}
          <Modal
            visible={saveModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setSaveModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconCircle, { backgroundColor: colors.primary + "20" }]}>
                    <Ionicons name="sparkles" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                    Name Your Matched Pair
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                    Save this combination to your wardrobe profile for quick access.
                  </Text>
                </View>

                <TextInput
                  style={[
                    styles.outfitNameInput,
                    {
                      backgroundColor: colors.card,
                      color: colors.textPrimary,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="e.g. Summer Date Outfit, Office Formal"
                  placeholderTextColor={colors.textMuted}
                  value={outfitName}
                  onChangeText={setOutfitName}
                  autoFocus
                  maxLength={60}
                />

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                    onPress={() => setSaveModalVisible(false)}
                    disabled={savingOutfit}
                  >
                    <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                    onPress={handleConfirmSaveOutfit}
                    disabled={savingOutfit}
                  >
                    {savingOutfit ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalConfirmText}>Save Pair</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </AppBackground>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#888888",
    marginTop: 1,
  },
  clearBtn: {
    padding: 6,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },

  /* Canvas */
  canvasContainer: {
    height: CANVAS_HEIGHT,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  canvasBackgroundGuide: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  emptyCanvasNotice: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyCanvasTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 12,
  },
  emptyCanvasSub: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },

  /* Draggable Garment */
  draggableItemContainer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  garmentWrapper: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
    position: "relative",
  },
  garmentSelected: {
    borderStyle: "dashed",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  garmentImage: {
    width: "100%",
    height: "100%",
  },
  placeholderGarment: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  removeHandle: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    elevation: 4,
  },

  /* Adjustment Toolbar */
  adjustmentToolbar: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toolTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  toolActiveName: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  toolSizeBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888888",
  },
  adjustmentControlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  controlGroup: {
    alignItems: "center",
  },
  controlLabel: {
    fontSize: 10,
    color: "#888888",
    marginBottom: 4,
    fontWeight: "500",
  },
  buttonStepper: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
    padding: 2,
    gap: 4,
  },
  stepperBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  /* Category Selector */
  categorySection: {
    marginTop: 8,
    marginBottom: 4,
  },
  categoryScrollContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryChipActive: {},
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },

  /* Bottom Drawer */
  drawerContainer: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  drawerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  drawerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  drawerInstruction: {
    fontSize: 11,
    color: "#888888",
  },
  drawerLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  drawerLoadingText: {
    fontSize: 13,
  },
  drawerEmpty: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  drawerEmptyText: {
    fontSize: 13,
  },
  drawerItemsScroll: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 16,
  },
  shelfCard: {
    width: 95,
    height: 125,
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  shelfImage: {
    width: 75,
    height: 75,
    borderRadius: 10,
  },
  shelfPlaceholder: {
    width: 75,
    height: 75,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  shelfItemName: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
    width: "100%",
  },
  shelfBrand: {
    fontSize: 9,
    textAlign: "center",
    width: "100%",
  },
  addIconCircle: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  outfitNameInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

