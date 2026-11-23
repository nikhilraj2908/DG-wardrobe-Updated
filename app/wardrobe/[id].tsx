// app/wardrobe/[id].tsx
import AppBackground from "@/components/AppBackground";
import { Ionicons } from "@expo/vector-icons";
import { storage } from "@/utils/storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../api/api";
import { useTheme } from "@/app/theme/ThemeContext";

import { resolveImageUrl } from "@/utils/resolveImageUrl";

interface Category {
  _id: string;
  name: string;
  type: string;
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

interface Wardrobe {
  _id: string;
  name: string;
}

export default function WardrobeDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const wardrobeId = params.id as string;
  const wardrobeName = params.name as string;

  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<"dateNewest" | "dateOldest" | "priceHigh" | "priceLow" | "nameAZ">("dateNewest");
  const [isGridView, setIsGridView] = useState(true);
  const [loading, setLoading] = useState(true);
  const isPublicView = params.public === "true";
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const itemSelectionMode = selectedItemIds.length > 0;
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [wardrobes, setWardrobes] = useState<Wardrobe[]>([]);
  const [moving, setMoving] = useState(false);
  const [renderVersion, setRenderVersion] = useState(0);

  const getBrandLabel = (item: WardrobeItem) => {
    if (item.brand && item.brand.trim().length > 0) {
      return item.brand;
    }
    return "No Brand";
  };

  const fetchWardrobes = async () => {
    try {
      const token = await storage.getItem("token");
      if (!token) return;

      const res = await api.get("/api/wardrobe/list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setWardrobes(res.data.wardrobes || []);
    } catch (err) {
      console.error("Error fetching wardrobes", err);
    }
  };

  const toggleItemSelect = (id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const cancelItemSelection = () => {
    setSelectedItemIds([]);
    setRenderVersion(v => v + 1);
  };

  const confirmItemDelete = () => {
    const isSingle = selectedItemIds.length === 1;

    Alert.alert(
      isSingle ? "Delete item?" : "Delete items?",
      isSingle
        ? "This item will be permanently deleted."
        : "All selected items will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: isSingle
            ? deleteSingleItem
            : deleteMultipleItems,
        },
      ]
    );
  };

  const deleteSingleItem = async () => {
    const token = await storage.getItem("token");
    await api.delete(`/api/wardrobe/item/${selectedItemIds[0]}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    cancelItemSelection();
    fetchItems();
  };

  const deleteMultipleItems = async () => {
    const token = await storage.getItem("token");
    await api.delete("/api/wardrobe/items/bulk-delete", {
      headers: { Authorization: `Bearer ${token}` },
      data: { itemIds: selectedItemIds },
    });
    cancelItemSelection();
    fetchItems();
  };

  const getFirstItemImage = (item: WardrobeItem): string | null => {
    if (Array.isArray(item.images) && item.images.length > 0) {
      return resolveImageUrl(item.images[0]) || null;
    }
    if (item.imageUrl) {
      return resolveImageUrl(item.imageUrl) || null;
    }
    return null;
  };

  const fetchItems = async () => {
    try {
      setLoading(true);

      const token = await storage.getItem("token");

      if (isPublicView) {
        const res = await api.get(`/api/wardrobe/${wardrobeId}/items`);
        setItems(res.data || []);
        return;
      }

      if (token) {
        const res = await api.get("/api/wardrobe/my", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const filteredItems = res.data.filter(
          (item: any) =>
            typeof item.wardrobe === "string"
              ? item.wardrobe === wardrobeId
              : item.wardrobe?._id === wardrobeId
        );
        setItems(filteredItems);
        return;
      }

      const res = await api.get(`/api/wardrobe/${wardrobeId}/items`);
      setItems(res.data || []);

    } catch (err) {
      console.error("Error fetching wardrobe items:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToWardrobe = async (targetWardrobeId: string, targetName: string) => {
    try {
      setMoving(true);
      const token = await storage.getItem("token");
      if (!token) return;

      if (selectedItemIds.length === 1) {
        await api.put(
          `/api/wardrobe/${selectedItemIds[0]}/move`,
          { targetWardrobeId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await api.put(
          `/api/wardrobe/move-bulk`,
          {
            itemIds: selectedItemIds,
            targetWardrobeId,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      Alert.alert(
        "Moved successfully",
        selectedItemIds.length === 1
          ? `Item moved to ${targetName}`
          : `${selectedItemIds.length} items moved to ${targetName}`
      );

      setMoveModalVisible(false);
      cancelItemSelection();
      fetchItems();

    } catch (err) {
      console.error("Move error", err);
      Alert.alert("Error", "Failed to move items");
    } finally {
      setMoving(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchItems();
      fetchWardrobes();
    }, [wardrobeId, isPublicView])
  );

  const handleAddClothes = () => {
    router.push({
      pathname: "/add-wardrobe",
      params: {
        wardrobeName,
        wardrobeId,
      },
    });
  };

  const sortedItems = [...items].sort((a, b) => {
    switch (sortBy) {
      case "dateOldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "priceHigh": return b.price - a.price;
      case "priceLow": return a.price - b.price;
      case "nameAZ": {
        const nameA =
          typeof a.category === "string"
            ? a.category
            : a.category?.name || "";

        const nameB =
          typeof b.category === "string"
            ? b.category
            : b.category?.name || "";

        return nameA.localeCompare(nameB);
      }
      case "dateNewest":
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top","bottom"]}>
      <AppBackground>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="arrow-back-outline" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={1}>{wardrobeName}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {!isPublicView && (
                <TouchableOpacity
                  style={styles.headerAddBtn}
                  onPress={handleAddClothes}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.headerAddBtnText}>Add</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setIsGridView(!isGridView)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name={isGridView ? "grid-outline" : "list-outline"} size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSortModalVisible(true)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="filter-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {itemSelectionMode && (
            <View style={styles.selectionBar}>
              <Text style={styles.selectionText}>
                {selectedItemIds.length} selected
              </Text>

              <View style={{ flexDirection: "row", gap: 16 }}>
                {selectedItemIds.length === 1 && (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/add-wardrobe",
                        params: {
                          mode: "edit",
                          itemId: selectedItemIds[0],
                        },
                      })
                    }
                  >
                    <Ionicons name="create-outline" size={22} color={colors.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setMoveModalVisible(true)}>
                  <Ionicons name="swap-horizontal-outline" size={22} color="#6366F1" />
                </TouchableOpacity>

                <TouchableOpacity onPress={confirmItemDelete}>
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </TouchableOpacity>

                <TouchableOpacity onPress={cancelItemSelection}>
                  <Ionicons name="close-outline" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={styles.itemCountText}>{items.length} {items.length === 1 ? "item" : "items"} in this wardrobe</Text>

          <ScrollView
            key={renderVersion}
            style={{ padding: 16 }}
            contentContainerStyle={{ paddingBottom: 110 }}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
            ) : sortedItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="shirt-outline" size={44} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>This wardrobe is empty</Text>
                <Text style={styles.emptySubtitle}>
                  Add clothes and outfits directly to your "{wardrobeName}" collection.
                </Text>
                {!isPublicView && (
                  <TouchableOpacity
                    style={styles.emptyAddBtn}
                    onPress={handleAddClothes}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.emptyAddBtnText}>Add Clothes to {wardrobeName}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={isGridView ? styles.gridContainer : undefined}>
                {sortedItems.map((item) => {
                  const imagePath = getFirstItemImage(item);
                  const isSelected = selectedItemIds.includes(item._id);
                  const itemKey = `${item._id}-${renderVersion}-${isSelected ? 'selected' : 'normal'}`;

                  return (
                    <TouchableOpacity
                      key={itemKey}
                      activeOpacity={0.9}
                      onPress={() =>
                        itemSelectionMode
                          ? toggleItemSelect(item._id)
                          : router.push(`/wardrobe/item/${item._id}`)
                      }
                      onLongPress={() => {
                        if (!itemSelectionMode) {
                          setSelectedItemIds([item._id]);
                        }
                      }}
                      style={[
                        isGridView ? styles.gridItem : styles.listItem,
                        isSelected && styles.selectedItem,
                      ]}
                    >
                      <View style={styles.imageContainer}>
                        {imagePath ? (
                          <Image
                            key={`image-${itemKey}`}
                            source={{ uri: imagePath }}
                            style={[
                              isGridView ? styles.gridImage : styles.listImage,
                              itemSelectionMode && !isSelected && { opacity: 0.3 }
                            ]}
                            resizeMode="cover"
                            onError={(e) => console.log('Image error for', item._id, e.nativeEvent.error)}
                          />
                        ) : (
                          <View style={isGridView ? styles.gridImagePlaceholder : styles.listImagePlaceholder}>
                            <Ionicons name="shirt-outline" size={36} color={colors.primary} />
                          </View>
                        )}

                        {/* Selection indicator */}
                        {itemSelectionMode && (
                          <View style={[
                            styles.selectionIndicator,
                            isSelected ? styles.selectedIndicator : styles.unselectedIndicator
                          ]}>
                            {isSelected ? (
                              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                            ) : (
                              <View style={[styles.unselectedCircle, { borderColor: colors.primary }]} />
                            )}
                          </View>
                        )}
                      </View>

                      <View style={[
                        isGridView ? { padding: 8 } : { flex: 1, paddingLeft: 12 },
                        itemSelectionMode && !isSelected && styles.dimmedContent
                      ]}>
                        <Text style={styles.itemName}>
                          {typeof item.category === "string"
                            ? item.category
                            : item.category?.name}
                        </Text>
                        {!isGridView && (
                          <>
                            <Text style={styles.itemCategory}>
                              {getBrandLabel(item)}
                            </Text>
                            <Text style={styles.itemPrice}>₹{item.price}</Text>
                            <Text style={styles.itemDate}>
                              Added: {new Date(item.createdAt).toLocaleDateString()}
                            </Text>
                          </>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Floating Action Button (FAB) */}
          {!isPublicView && !itemSelectionMode && (
            <TouchableOpacity
              style={styles.fabBtn}
              onPress={handleAddClothes}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
              <Text style={styles.fabBtnText}>Add Clothes</Text>
            </TouchableOpacity>
          )}

          {/* Sort Modal */}
          <Modal animationType="slide" transparent visible={sortModalVisible} onRequestClose={() => setSortModalVisible(false)}>
            <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Sort By</Text>
                <View style={styles.sortSection}>
                  <Text style={[styles.sortSectionTitle, { color: colors.textSecondary }]}>By Date</Text>
                  <View style={styles.sortButtons}>
                    <TouchableOpacity
                      style={[styles.sortBtn, sortBy === "dateNewest" && styles.activeSortBtn]}
                      onPress={() => { setSortBy("dateNewest"); setSortModalVisible(false); }}
                    >
                      <Text style={sortBy === "dateNewest" ? styles.activeSortText : [styles.sortText, { color: colors.textSecondary }]}>
                        Newest
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sortBtn, sortBy === "dateOldest" && styles.activeSortBtn]}
                      onPress={() => { setSortBy("dateOldest"); setSortModalVisible(false); }}
                    >
                      <Text style={sortBy === "dateOldest" ? styles.activeSortText : [styles.sortText, { color: colors.textSecondary }]}>
                        Oldest
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.sortSection}>
                  <Text style={[styles.sortSectionTitle, { color: colors.textSecondary }]}>By Price</Text>
                  <View style={styles.sortButtons}>
                    <TouchableOpacity
                      style={[styles.sortBtn, sortBy === "priceHigh" && styles.activeSortBtn]}
                      onPress={() => { setSortBy("priceHigh"); setSortModalVisible(false); }}
                    >
                      <Text style={sortBy === "priceHigh" ? styles.activeSortText : [styles.sortText, { color: colors.textSecondary }]}>
                        High to Low
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sortBtn, sortBy === "priceLow" && styles.activeSortBtn]}
                      onPress={() => { setSortBy("priceLow"); setSortModalVisible(false); }}
                    >
                      <Text style={sortBy === "priceLow" ? styles.activeSortText : [styles.sortText, { color: colors.textSecondary }]}>
                        Low to High
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.sortSection}>
                  <Text style={[styles.sortSectionTitle, { color: colors.textSecondary }]}>By Name</Text>
                  <TouchableOpacity
                    style={[styles.sortBtn, sortBy === "nameAZ" && styles.activeSortBtn]}
                    onPress={() => { setSortBy("nameAZ"); setSortModalVisible(false); }}
                  >
                    <Text style={sortBy === "nameAZ" ? styles.activeSortText : [styles.sortText, { color: colors.textSecondary }]}>
                      A to Z
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.closeModalBtn, { backgroundColor: colors.primary }]} onPress={() => setSortModalVisible(false)}>
                  <Text style={[styles.closeModalText, { color: colors.textLight }]}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Move Modal */}
          <Modal
            animationType="slide"
            transparent
            visible={moveModalVisible}
            onRequestClose={() => setMoveModalVisible(false)}
          >
            <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Move to wardrobe</Text>

                <ScrollView>
                  {wardrobes
                    .filter(w => w._id !== wardrobeId)
                    .map(w => (
                      <TouchableOpacity
                        key={w._id}
                        style={[styles.moveWardrobeItem, { borderBottomColor: colors.border }]}
                        disabled={moving}
                        onPress={() => handleMoveToWardrobe(w._id, w.name)}
                      >
                        <Text style={[styles.moveWardrobeText, { color: colors.textPrimary }]}>{w.name}</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.closeModalBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setMoveModalVisible(false)}
                >
                  <Text style={[styles.closeModalText, { color: colors.primaryDark }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </AppBackground>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      paddingTop: 0,
    },
    headerLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginRight: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    itemCountText: {
      marginLeft: 16,
      color: colors.textMuted,
      marginBottom: 8,
    },
    gridContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    gridItem: {
      width: "48%",
      backgroundColor: colors.card,
      borderRadius: 16,
      marginBottom: 12,
      overflow: "hidden",
    },
    listItem: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: 16,
      marginBottom: 12,
      overflow: "hidden",
    },
    gridImage: {
      width: "100%",
      height: 150,
    },
    listImage: {
      width: 100,
      height: 100,
      borderRadius: 12,
    },
    gridImagePlaceholder: {
      width: "100%",
      height: 150,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    listImagePlaceholder: {
      width: 100,
      height: 100,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    itemName: {
      fontWeight: "700",
      fontSize: 14,
      marginBottom: 2,
      color: colors.textPrimary,
    },
    itemCategory: {
      fontSize: 12,
      color: colors.textMuted,
    },
    itemPrice: {
      fontWeight: "600",
      marginTop: 2,
      color: colors.textPrimary,
    },
    itemDate: {
      fontSize: 10,
      color: colors.textMuted,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      marginBottom: 35,
    },
    modalContent: {
      padding: 16,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 12,
    },
    sortSection: {
      marginBottom: 12,
    },
    sortSectionTitle: {
      fontWeight: "600",
      marginBottom: 4,
    },
    sortButtons: {
      flexDirection: "row",
      marginBottom: 8,
    },
    sortBtn: {
      flex: 1,
      padding: 10,
      marginRight: 8,
      borderRadius: 20,
      backgroundColor: colors.card,
      alignItems: "center",
    },
    activeSortBtn: {
      backgroundColor: colors.primary,
    },
    sortText: {
      fontWeight: "600",
    },
    activeSortText: {
      color: colors.textLight,
      fontWeight: "600",
    },
    closeModalBtn: {
      marginTop: 12,
      marginBottom: 12,
      padding: 12,
      alignItems: "center",
      borderRadius: 20,
    },
    closeModalText: {
      fontWeight: "700",
    },
    selectionBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginHorizontal: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectionText: {
      fontWeight: "600",
      color: colors.textSecondary,
    },
    selectedItem: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    imageContainer: {
      position: 'relative',
    },
    selectionIndicator: {
      position: 'absolute',
      top: 8,
      right: 8,
      zIndex: 10,
      backgroundColor: colors.background,
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectedIndicator: {
      // Already has icon
    },
    unselectedIndicator: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    unselectedCircle: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1,
      backgroundColor: 'transparent',
    },
    dimmedContent: {
      opacity: 0.6,
    },
    moveWardrobeItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    moveWardrobeText: {
      fontSize: 15,
      fontWeight: "600",
    },
    headerAddBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 18,
      gap: 4,
    },
    headerAddBtnText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
    },
    fabBtn: {
      position: "absolute",
      bottom: 24,
      right: 20,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 30,
      gap: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 6,
      zIndex: 99,
    },
    fabBtnText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
      paddingHorizontal: 24,
    },
    emptyIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 20,
    },
    emptyAddBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 22,
      paddingVertical: 12,
      borderRadius: 24,
      gap: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 4,
    },
    emptyAddBtnText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
  });