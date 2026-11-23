// app/wardrobe/items.tsx
import AppBackground from "@/components/AppBackground";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { Ionicons } from "@expo/vector-icons";
import { storage } from "@/utils/storage";
import { Image as ExpoImage } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import api from "../../api/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/app/theme/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface WardrobeItem {
  _id: string;
  wardrobe: string;
  category: {
    _id: string;
    name: string;
    type: "mens" | "womens" | "unisex";
  };
  price: number;
  brand?: string;
  color?: string;
  imageUrl?: string;
  images?: string[];
  createdAt: string;
  description?: string;
  // 👇 NEW FIELDS
  visibility?: "public" | "private";
  accessLevel?: "normal" | "premium";
}

// Category Icons - unchanged
const CATEGORY_ICONS = {
  mens: {
    accessories: require("../../assets/categories/mens/Accessories.png"),
    blazers: require("../../assets/categories/mens/Blazers.png"),
    cargos: require("../../assets/categories/mens/Cargo.png"),
    shirts: require("../../assets/categories/mens/Shirts.png"),
    chinos: require("../../assets/categories/mens/Chino.png"),
    coats: require("../../assets/categories/mens/Coats.png"),
    denimjackets: require("../../assets/categories/mens/DenimJackets.png"),
    dhotis: require("../../assets/categories/mens/Dhotis.png"),
    formalwear: require("../../assets/categories/mens/FormalWear.png"),
    hoodies: require("../../assets/categories/mens/Hoodies.png"),
    jackets: require("../../assets/categories/mens/Jackets.png"),
    jeans: require("../../assets/categories/mens/Jeans.png"),
    joggers: require("../../assets/categories/mens/Joggers.png"),
    kurtas: require("../../assets/categories/mens/Kurtas.png"),
    pajamas: require("../../assets/categories/mens/Pajamas.png"),
    pants: require("../../assets/categories/mens/Pants.png"),
    poloshirts: require("../../assets/categories/mens/PoloShirts.png"),
    raincoats: require("../../assets/categories/mens/Raincoats.png"),
    sherwanis: require("../../assets/categories/mens/Sherwanis.png"),
    shorts: require("../../assets/categories/mens/Shorts.png"),
    socks: require("../../assets/categories/mens/Socks.png"),
    sportswear: require("../../assets/categories/mens/Sportswear.png"),
    lifestyle: require("../../assets/categories/mens/Lifestyle.png"),
    straightfit: require("../../assets/categories/mens/Straightfit.png"),
    suits: require("../../assets/categories/mens/Suits.png"),
    tanktops: require("../../assets/categories/mens/TankTops.png"),
    thermals: require("../../assets/categories/mens/Thermals.png"),
    trackpants: require("../../assets/categories/mens/TrackPants.png"),
    traditionalwear: require("../../assets/categories/mens/TraditionalWear.png"),
    trousers: require("../../assets/categories/mens/Trousers.png"),
    underwear: require("../../assets/categories/mens/Underwear.png"),
    vests: require("../../assets/categories/mens/Vests.png"),
    sweaters: require("../../assets/categories/mens/Sweaters.png"),
    swimwear: require("../../assets/categories/mens/Swimwear.png"),
    leatherjackets: require("../../assets/categories/mens/LeatherJackets.png"),
    casualwear: require("../../assets/categories/mens/CasualWear.png"),
    "t-shirts": require("../../assets/categories/mens/T-Shirts.png"),
  },
  womens: {
    accessories: require("../../assets/categories/womens/Accessories.png"),
    anarkalis: require("../../assets/categories/womens/Anarkali.png"),
    bikinis: require("../../assets/categories/womens/Bikini.png"),
    blazers: require("../../assets/categories/womens/Blazer.png"),
    blouse: require("../../assets/categories/womens/Blouse.png"),
    bras: require("../../assets/categories/womens/Bra.png"),
    capris: require("../../assets/categories/womens/Capri.png"),
    cardigans: require("../../assets/categories/womens/Cardigan.png"),
    casualwear: require("../../assets/categories/womens/CasualWear.png"),
    coats: require("../../assets/categories/womens/Coat.png"),
    dresses: require("../../assets/categories/womens/Dress.png"),
    formalwear: require("../../assets/categories/womens/FormalWear.png"),
    gowns: require("../../assets/categories/womens/Gown.png"),
    hoodies: require("../../assets/categories/womens/Hoodie.png"),
    jackets: require("../../assets/categories/womens/Jacket.png"),
    jeans: require("../../assets/categories/womens/Jean.png"),
    jumpsuits: require("../../assets/categories/womens/Jumpsuit.png"),
    kurtis: require("../../assets/categories/womens/Kurti.png"),
    leggings: require("../../assets/categories/womens/Legging.png"),
    lehengas: require("../../assets/categories/womens/Lehnga.png"),
    lingerie: require("../../assets/categories/womens/Lingerie.png"),
    nightwear: require("../../assets/categories/womens/NightWear.png"),
    pajamas: require("../../assets/categories/womens/Pajama.png"),
    panties: require("../../assets/categories/womens/Panty.png"),
    palazzos: require("../../assets/categories/womens/Plazzo.png"),
    raincoats: require("../../assets/categories/womens/Raincoat.png"),
    rompers: require("../../assets/categories/womens/Romper.png"),
    salwarsuits: require("../../assets/categories/womens/SalwarSuit.png"),
    sarees: require("../../assets/categories/womens/Saree.png"),
    shirts: require("../../assets/categories/womens/Shirt.png"),
    socks: require("../../assets/categories/womens/Socks.png"),
    shorts: require("../../assets/categories/womens/Shorts.png"),
    sportswear: require("../../assets/categories/womens/SportsWear.png"),
    stockings: require("../../assets/categories/womens/Stocking.png"),
    suits: require("../../assets/categories/womens/Suit.png"),
    sweaters: require("../../assets/categories/womens/Sweater.png"),
    swimwear: require("../../assets/categories/womens/SwimWear.png"),
    tanktops: require("../../assets/categories/womens/TankTop.png"),
    traditionalwear: require("../../assets/categories/womens/TraditionalWear.png"),
    trousers: require("../../assets/categories/womens/Trouser.png"),
    't-shirts': require("../../assets/categories/womens/Tshirt.png"),
    vests: require("../../assets/categories/womens/Vest.png"),
    tops: require("../../assets/categories/womens/Top.png"),
    skirts: require("../../assets/categories/womens/Skirt.png"),
  },
  unisex: {},
};

const normalizeCategoryKey = (name: string) =>
  name.toLowerCase().replace(/\s+/g, "");

const getCategoryIcon = (categoryName: string) => {
  const key = normalizeCategoryKey(categoryName);
  const mensIcons = CATEGORY_ICONS.mens as any;
  if (mensIcons[key]) return mensIcons[key];
  const womensIcons = CATEGORY_ICONS.womens as any;
  if (womensIcons[key]) return womensIcons[key];
  return null;
};

export default function AllWardrobeItemsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  type SortOption =
    | "dateNewest"
    | "dateOldest"
    | "colorAZ"
    | "priceHigh"
    | "priceLow"
    | "nameAZ"
    | "publicFirst"
    | "privateFirst"
    | "premiumFirst";

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("dateNewest");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isGridView, setIsGridView] = useState(true);
  const [loading, setLoading] = useState(true);
  const { userId } = useLocalSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userGender, setUserGender] = useState<"mens" | "womens" | "unisex">("unisex");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const itemSelectionMode = selectedItemIds.length > 0;

  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [wardrobes, setWardrobes] = useState<any[]>([]);
  const [moving, setMoving] = useState(false);

  const fetchItems = async () => {
    try {
      if (!items || items.length === 0) {
        setLoading(true);
      }
      const token = await storage.getItem("token");

      let res;

      if (userId) {
        res = await api.get(`/api/wardrobe/user/${userId}/items`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setItems(res.data.items);
      } else {
        const [itemsRes, userRes] = await Promise.all([
          api.get("/api/wardrobe/my", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get("/api/user/me", {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null),
        ]);
        setItems(itemsRes.data);

        if (userRes?.data?.gender) {
          setUserGender(userRes.data.gender);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (id: string) => {
    if (itemSelectionMode) {
      toggleItemSelect(id);
    } else {
      router.push(`/wardrobe/item/${id}`);
    }
  };

  const handleItemLongPress = (id: string) => {
    if (!itemSelectionMode) {
      setSelectedItemIds([id]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setSelectedCategory(null);
      fetchItems();
    }, [userId])
  );

  const toggleItemSelect = (id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const cancelItemSelection = () => {
    setSelectedItemIds([]);
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

  useEffect(() => {
    fetchWardrobes();
  }, []);

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
          onPress: isSingle ? deleteSingleItem : deleteMultipleItems,
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
          { itemIds: selectedItemIds, targetWardrobeId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      Alert.alert("Moved successfully");
      setMoveModalVisible(false);
      cancelItemSelection();
      fetchItems();
    } catch {
      Alert.alert("Error", "Failed to move items");
    } finally {
      setMoving(false);
    }
  };

  const categoriesWithCounts = useMemo(() => {
    const categoryMap = new Map<string, number>();

    items.forEach((item) => {
      const categoryName = item.category?.name;
      if (!categoryName) return;
      categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1);
    });

    return Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const getColorHex = (name?: string): string => {
    if (!name) return "#A855F7";
    const clean = name.trim().toLowerCase();
    if (clean.startsWith("#")) return clean;
    const map: Record<string, string> = {
      black: "#111827",
      white: "#FFFFFF",
      navy: "#1E3A8A",
      blue: "#2563EB",
      grey: "#6B7280",
      gray: "#6B7280",
      beige: "#D4B996",
      brown: "#78350F",
      red: "#DC2626",
      pink: "#EC4899",
      green: "#059669",
      yellow: "#F59E0B",
      purple: "#7C3AED",
      orange: "#EA580C",
    };
    return map[clean] || "#A855F7";
  };

  const COLOR_NAME_ALIASES: Record<string, string[]> = {
    black: ["black", "#000000", "#111827", "#000", "noir", "jet black", "dark black"],
    white: ["white", "#ffffff", "#fff", "blanc", "off white", "off-white"],
    navy: ["navy", "#1e3a8a", "navy blue", "dark blue"],
    blue: ["blue", "#2563eb", "light blue", "sky blue", "cyan", "indigo", "denim", "royal blue"],
    grey: ["grey", "gray", "#6b7280", "#808080", "silver", "charcoal"],
    beige: ["beige", "#d4b996", "khaki", "cream", "sand", "tan", "nude", "ivory"],
    brown: ["brown", "#78350f", "#8b4513", "chocolate", "coffee"],
    red: ["red", "#dc2626", "#ff0000", "crimson", "maroon", "burgundy"],
    pink: ["pink", "#ec4899", "rose", "magenta", "blush", "salmon", "baby pink"],
    green: ["green", "#059669", "#00ff00", "olive", "emerald", "mint", "forest green"],
    yellow: ["yellow", "#f59e0b", "#ffff00", "mustard", "gold"],
    purple: ["purple", "#7c3aed", "violet", "lavender", "lilac", "plum"],
    orange: ["orange", "#ea580c", "peach", "coral", "tangerine", "rust"],
  };

  const isColorMatch = (itemColor?: string, targetColor?: string): boolean => {
    const cleanItem = (itemColor || "").trim().toLowerCase();
    const cleanTarget = (targetColor || "").trim().toLowerCase();
    if (!cleanItem || !cleanTarget) return false;

    // 1. Direct equality
    if (cleanItem === cleanTarget) return true;

    // 2. Substring matching
    if (cleanItem.includes(cleanTarget) || cleanTarget.includes(cleanItem)) return true;

    // 3. Alias / Hex / Variation matching
    for (const [canonical, aliases] of Object.entries(COLOR_NAME_ALIASES)) {
      const targetMatches = cleanTarget === canonical || aliases.includes(cleanTarget);
      if (targetMatches) {
        if (cleanItem === canonical || aliases.some((a) => cleanItem === a || cleanItem.includes(a) || a.includes(cleanItem))) {
          return true;
        }
      }
    }

    return false;
  };

  const PRESET_POPULAR_COLORS = useMemo(
    () => [
      "Black",
      "White",
      "Red",
      "Blue",
      "Green",
      "Navy",
      "Yellow",
      "Pink",
      "Grey",
      "Beige",
      "Brown",
      "Purple",
      "Orange",
    ],
    []
  );

  const colorsWithCounts = useMemo(() => {
    const colorMap = new Map<string, number>();
    items.forEach((item) => {
      if (item.color && item.color.trim()) {
        const clean = item.color.trim();
        const formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
        colorMap.set(formatted, (colorMap.get(formatted) || 0) + 1);
      }
    });
    return Array.from(colorMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const colorListToRender = useMemo(() => {
    const list: { name: string; count: number }[] = [];
    const seen = new Set<string>();

    // 1. Explicit colors in user's items
    items.forEach((item) => {
      if (item.color && item.color.trim()) {
        const clean = item.color.trim();
        const formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
        if (!seen.has(formatted.toLowerCase())) {
          seen.add(formatted.toLowerCase());
          const count = items.filter((i) => isColorMatch(i.color, formatted)).length;
          list.push({ name: formatted, count });
        }
      }
    });

    // 2. Preset popular colors
    PRESET_POPULAR_COLORS.forEach((preset) => {
      const pLower = preset.toLowerCase();
      if (!seen.has(pLower)) {
        const count = items.filter((i) => isColorMatch(i.color, preset)).length;
        list.push({ name: preset, count });
        seen.add(pLower);
      }
    });

    // Sort: colors with count > 0 first, then remaining
    return list.sort((a, b) => {
      if (a.count > 0 && b.count === 0) return -1;
      if (b.count > 0 && a.count === 0) return 1;
      return b.count - a.count;
    });
  }, [items, PRESET_POPULAR_COLORS]);

  const availableColors = useMemo(() => {
    return colorListToRender.filter((c) => c.count > 0).map((c) => c.name);
  }, [colorListToRender]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat = selectedCategory ? item.category?.name === selectedCategory : true;
      const matchColor = selectedColor ? isColorMatch(item.color, selectedColor) : true;
      return matchCat && matchColor;
    });
  }, [items, selectedCategory, selectedColor]);

  const sortedItems = useMemo(() => {
    const list = [...filteredItems];

    // Primary sort
    switch (sortBy) {
      case "colorAZ":
        list.sort((a, b) => {
          const cA = (a.color || "").trim().toLowerCase();
          const cB = (b.color || "").trim().toLowerCase();
          if (!cA && !cB) return 0;
          if (!cA) return 1;
          if (!cB) return -1;
          return cA.localeCompare(cB);
        });
        break;
      case "dateNewest":
        list.sort((a, b) => {
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          return (isNaN(bTime) ? 0 : bTime) - (isNaN(aTime) ? 0 : aTime);
        });
        break;
      case "dateOldest":
        list.sort((a, b) => {
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          return (isNaN(aTime) ? 0 : aTime) - (isNaN(bTime) ? 0 : bTime);
        });
        break;
      case "priceHigh":
        list.sort((a, b) => b.price - a.price);
        break;
      case "priceLow":
        list.sort((a, b) => a.price - b.price);
        break;
      case "nameAZ":
        list.sort((a, b) => (a.category?.name || "").localeCompare(b.category?.name || ""));
        break;
      case "publicFirst":
        list.sort((a, b) => {
          const getRank = (item: WardrobeItem) => {
            if (item.visibility === "public") return item.accessLevel === "premium" ? 1 : 2;
            return 0;
          };
          return getRank(b) - getRank(a);
        });
        break;
      case "premiumFirst":
        list.sort((a, b) => {
          const getRank = (item: WardrobeItem) => {
            if (item.accessLevel === "premium") return 2;
            if (item.visibility === "public") return 1;
            return 0;
          };
          return getRank(b) - getRank(a);
        });
        break;
      case "privateFirst":
        list.sort((a, b) => {
          const aPrivate = a.visibility === "private" ? 1 : 0;
          const bPrivate = b.visibility === "private" ? 1 : 0;
          return bPrivate - aPrivate;
        });
        break;
      default:
        break;
    }

    return list;
  }, [filteredItems, sortBy]);
  const DEFAULT_IMAGE = "https://ui-avatars.com/api/?name=Item&background=random";

  const getBrandLabel = (item: WardrobeItem) => {
    return item.brand && item.brand.trim() ? item.brand : "No Brand";
  };


  const renderVisibilityBadgeInline = (item: WardrobeItem) => {
    if (item.visibility === 'private') {
      return (
        <View style={[styles.visibilityBadgeInline, { backgroundColor: colors.danger + '20' }]}>
          <Ionicons name="lock-closed" size={10} color={colors.danger} />
          <Text style={[styles.visibilityBadgeText, { color: colors.danger }]}>Private</Text>
        </View>
      );
    }
    if (item.accessLevel === 'premium') {
      return (
        <View style={[styles.visibilityBadgeInline, { backgroundColor: '#FFD70020' }]}>
          <Ionicons name="diamond" size={10} color="#B8860B" />
          <Text style={[styles.visibilityBadgeText, { color: '#B8860B' }]}>Premium</Text>
        </View>
      );
    }
    return null;
  };
  const getItemImageUrl = (item: WardrobeItem): string | undefined => {
    const imagePath = item.images?.[0] || item.imageUrl || undefined;
    return resolveImageUrl(imagePath);
  };

  const renderCategoryChip = ({ name, count }: { name: string; count: number }) => {
    const icon = getCategoryIcon(name);
    const isSelected = selectedCategory === name;

    return (
      <TouchableOpacity
        key={name}
        onPress={() => setSelectedCategory(isSelected ? null : name)}
        style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
        activeOpacity={0.8}
      >
        <View style={[styles.categoryIconContainer, isSelected && styles.categoryIconContainerSelected]}>
          {icon ? (
            <Image
              source={icon}
              style={[styles.categoryIcon, isSelected && styles.categoryIconSelected]}
            />
          ) : (
            <Ionicons
              name="shirt-outline"
              size={22}
              color={isSelected ? "#FFFFFF" : colors.primary}
            />
          )}

          {count > 0 && (
            <View style={[styles.categoryCountBadge, isSelected && styles.categoryCountBadgeSelected]}>
              <Text style={[styles.categoryCountText, isSelected && styles.categoryCountTextSelected]}>
                {count}
              </Text>
            </View>
          )}
        </View>

        <Text
          style={[styles.categoryChipLabel, isSelected && styles.categoryChipLabelSelected]}
          numberOfLines={2}
        >
          {name}
        </Text>
      </TouchableOpacity>
    );
  };

  // 👇 Helper to render visibility badge
  const renderVisibilityBadge = (item: WardrobeItem) => {
    // Don't show badges in selection mode
    if (itemSelectionMode) return null;

    if (item.visibility === "private") {
      return (
        <View style={styles.visibilityBadge}>
          <Ionicons name="lock-closed" size={14} color="#fff" />
        </View>
      );
    }
    if (item.accessLevel === "premium") {
      return (
        <View style={[styles.visibilityBadge, { backgroundColor: "#FFD700" }]}>
          <Ionicons name="diamond" size={14} color="#000" />
        </View>
      );
    }
    return null;
  };

  const renderGridViewItem = (item: WardrobeItem) => {
    const imageUri = getItemImageUrl(item);
    const isSelected = selectedItemIds.includes(item._id);
    const itemKey = `${item._id}-${itemSelectionMode ? 'select' : 'normal'}-${isSelected ? 'selected' : 'unselected'}`;
    const isColorMatchActive = selectedColor ? isColorMatch(item.color, selectedColor) : false;

    return (
      <TouchableOpacity
        key={`${item._id}-${isSelected ? "selected" : "normal"}`}
        activeOpacity={0.85}
        delayLongPress={300}
        onPress={() => handleItemPress(item._id)}
        onLongPress={() => handleItemLongPress(item._id)}
        style={[
          styles.gridItem,
          isSelected && styles.selectedItem,
          isColorMatchActive && styles.colorMatchedItem,
        ]}
      >
        <View style={styles.gridImageContainer}>
          <ExpoImage
            source={imageUri ? { uri: imageUri } : require("../../assets/images/bg.jpg")}
            style={styles.gridImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            recyclingKey={item._id}
            priority="high"
          />

          {itemSelectionMode && !isSelected && <View style={styles.dimOverlay} />}

          {itemSelectionMode && (
            <View style={[styles.selectionIndicator, isSelected ? styles.selectedIndicator : styles.unselectedIndicator]}>
              {isSelected ? (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              ) : (
                <View style={[styles.unselectedCircle, { borderColor: colors.primary }]} />
              )}
            </View>
          )}

          {/* 👇 Visibility badge */}
          {renderVisibilityBadge(item)}

          <View style={styles.gridCategoryBadge}>
            <Text style={styles.gridCategoryText} numberOfLines={1}>
              {item.category?.name}
            </Text>
          </View>
        </View>

        <View style={[styles.gridItemInfo, itemSelectionMode && !isSelected && styles.dimmedTextContainer]}>
          <View style={styles.gridItemHeader}>
            <Text style={styles.gridItemName} numberOfLines={1}>
              {item.category?.name}
            </Text>
            <Text style={styles.gridItemPrice}>₹{item.price}</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
            <Text style={[styles.gridItemBrand, { flex: 1, marginRight: 6 }]} numberOfLines={1}>
              {getBrandLabel(item)}
            </Text>
            {item.color ? (
              <View style={styles.itemColorTag}>
                <View
                  style={[
                    styles.itemColorTagDot,
                    { backgroundColor: getColorHex(item.color) },
                    item.color.toLowerCase() === "white" && styles.colorDotBorder,
                  ]}
                />
                <Text style={styles.itemColorTagText} numberOfLines={1}>
                  {item.color}
                </Text>
              </View>
            ) : null}
          </View>

          {item.description && (
            <Text style={styles.gridItemDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.listItemFooter}>
            <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
            <Text style={styles.listItemDate}>
              Added: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderListViewItem = (item: WardrobeItem) => {
    const imageUri = getItemImageUrl(item);
    const isSelected = selectedItemIds.includes(item._id);
    const isColorMatchActive = selectedColor ? isColorMatch(item.color, selectedColor) : false;

    return (
      <TouchableOpacity
        key={`${item._id}-${isSelected ? "selected" : "normal"}`}
        activeOpacity={0.85}
        delayLongPress={300}
        onPress={() => handleItemPress(item._id)}
        onLongPress={() => handleItemLongPress(item._id)}
        style={[
          styles.listItem,
          isSelected && styles.selectedItem,
          isColorMatchActive && styles.colorMatchedItem,
          itemSelectionMode && !isSelected && styles.dimmedListItem
        ]}
      >
        <ExpoImage
          source={imageUri ? { uri: imageUri } : require("../../assets/images/bg.jpg")}
          style={styles.listImage}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={item._id}
          priority="high"
        />

        <View style={styles.listItemInfo}>
          <View style={styles.listItemHeader}>
            <Text style={styles.listItemName} numberOfLines={1}>
              {item.category?.name}
            </Text>
            <Text style={styles.listItemPrice}>₹{item.price}</Text>
          </View>

          {/* Meta row with icon, brand, and inline visibility badge */}
          <View style={styles.listItemMeta}>
            <Ionicons name="business-outline" size={14} color={colors.textMuted} />
            <Text style={styles.listItemBrand} numberOfLines={1}>
              {getBrandLabel(item)}
            </Text>
            {item.color ? (
              <View style={styles.itemColorTag}>
                <View
                  style={[
                    styles.itemColorTagDot,
                    { backgroundColor: getColorHex(item.color) },
                    item.color.toLowerCase() === "white" && styles.colorDotBorder,
                  ]}
                />
                <Text style={styles.itemColorTagText} numberOfLines={1}>
                  {item.color}
                </Text>
              </View>
            ) : null}
            {renderVisibilityBadgeInline(item)}
          </View>

          {item.description && (
            <Text style={styles.listItemDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.listItemFooter}>
            <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
            <Text style={styles.listItemDate}>
              Added: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Right side: chevron or selection indicator */}
        <View style={styles.listRightContainer}>
          {itemSelectionMode ? (
            isSelected ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            ) : (
              <View style={[styles.unselectedCircle, { borderColor: colors.primary }]} />
            )
          ) : (
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <AppBackground>
        <View style={styles.container}>
          {/* ========== HEADER ========== */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                onPress={() => router.back()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back-outline" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>All Items</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => setIsGridView(!isGridView)}>
                <Ionicons
                  name={isGridView ? "grid-outline" : "list-outline"}
                  size={22}
                  color={isGridView ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  (sortBy !== "dateNewest" || selectedColor !== null) && styles.sortButtonActive,
                ]}
                onPress={() => setSortModalVisible(true)}
              >
                <Ionicons
                  name={sortBy !== "dateNewest" || selectedColor !== null ? "filter" : "filter-outline"}
                  size={16}
                  color={sortBy !== "dateNewest" || selectedColor !== null ? "#FFFFFF" : colors.primary}
                />
                <Text
                  style={[
                    styles.sortButtonText,
                    (sortBy !== "dateNewest" || selectedColor !== null) && styles.sortButtonTextActive,
                  ]}
                >
                  Sort
                </Text>
                {(sortBy !== "dateNewest" || selectedColor !== null) && (
                  <View style={styles.sortActiveDot} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ========== SELECTION BAR ========== */}
          {itemSelectionMode && (
            <View style={styles.selectionBar}>
              <Text style={styles.selectionText}>{selectedItemIds.length} selected</Text>
              <View style={{ flexDirection: "row", gap: 16 }}>
                {selectedItemIds.length === 1 && (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/add-wardrobe",
                        params: { mode: "edit", itemId: selectedItemIds[0] },
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

          {/* ========== CATEGORIES SECTION ========== */}
          <View style={styles.categoriesSection}>
            <View style={styles.categoriesHeader}>
              <Text style={styles.categoriesTitle}>Categories</Text>
              <TouchableOpacity onPress={() => setSelectedCategory(null)} style={styles.clearFilterButton}>
                <Text style={styles.clearFilterText}>
                  {selectedCategory ? "Clear" : `Total: ${items.length}`}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesScrollView}
              contentContainerStyle={styles.categoriesContent}
            >
              <TouchableOpacity
                onPress={() => setSelectedCategory(null)}
                style={[styles.categoryChip, !selectedCategory && styles.categoryChipSelected]}
                activeOpacity={0.8}
              >
                <View style={[styles.categoryIconContainer, !selectedCategory && styles.categoryIconContainerSelected]}>
                  <Ionicons
                    name="apps-outline"
                    size={22}
                    color={!selectedCategory ? "#FFFFFF" : colors.primary}
                  />
                  {items.length > 0 && (
                    <View style={[styles.categoryCountBadge, !selectedCategory && styles.categoryCountBadgeSelected]}>
                      <Text style={[styles.categoryCountText, !selectedCategory && styles.categoryCountTextSelected]}>
                        {items.length}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.categoryChipLabel, !selectedCategory && styles.categoryChipLabelSelected]}>
                  All
                </Text>
              </TouchableOpacity>
              {categoriesWithCounts.map(renderCategoryChip)}
            </ScrollView>
          </View>

          {/* ========== COLORS SECTION ========== */}
          <View style={styles.colorsSection}>
            <View style={styles.colorsHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="color-palette-outline" size={16} color={colors.primary} />
                <Text style={styles.colorsTitle}>Colors</Text>
              </View>
              {selectedColor && (
                <TouchableOpacity
                  onPress={() => setSelectedColor(null)}
                  style={styles.clearFilterButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.clearFilterText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.colorsScrollView}
              contentContainerStyle={styles.colorsContent}
            >
              {/* All Colors Option */}
              <TouchableOpacity
                onPress={() => setSelectedColor(null)}
                style={[styles.colorSwatchChip, !selectedColor && styles.colorSwatchChipSelected]}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.colorSwatchCircle,
                    !selectedColor && styles.colorSwatchCircleSelected,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Ionicons
                    name="color-palette"
                    size={15}
                    color={!selectedColor ? colors.primaryDark : colors.textMuted}
                  />
                </View>
                <Text
                  style={[
                    styles.colorSwatchLabel,
                    !selectedColor && styles.colorSwatchLabelSelected,
                  ]}
                  numberOfLines={1}
                >
                  All
                </Text>
              </TouchableOpacity>

              {/* Color Swatches */}
              {colorListToRender.map((c) => {
                const isSelected = selectedColor?.toLowerCase() === c.name.toLowerCase();
                const hex = getColorHex(c.name);
                const isWhite = c.name.toLowerCase() === "white";

                return (
                  <TouchableOpacity
                    key={c.name}
                    onPress={() => setSelectedColor(isSelected ? null : c.name)}
                    style={[styles.colorSwatchChip, isSelected && styles.colorSwatchChipSelected]}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.colorSwatchCircle,
                        isSelected && styles.colorSwatchCircleSelected,
                        { backgroundColor: hex },
                        isWhite && styles.whiteColorBorder,
                      ]}
                    >
                      {isSelected ? (
                        <Ionicons
                          name="checkmark"
                          size={13}
                          color={isWhite ? "#111827" : "#FFFFFF"}
                        />
                      ) : null}

                      {c.count > 0 && (
                        <View style={[styles.colorSwatchBadge, isSelected && styles.colorSwatchBadgeSelected]}>
                          <Text style={styles.colorSwatchBadgeText}>{c.count}</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.colorSwatchLabel,
                        isSelected && styles.colorSwatchLabelSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ========== RESULTS INFO ========== */}
          <View style={styles.resultsInfo}>
            <View style={styles.resultsRow}>
              <Text style={styles.resultsText}>
                {selectedCategory && selectedColor
                  ? `${filteredItems.length} ${filteredItems.length === 1 ? 'item' : 'items'} in "${selectedCategory}" • Color: ${selectedColor}`
                  : selectedCategory
                  ? `${filteredItems.length} ${filteredItems.length === 1 ? 'item' : 'items'} in "${selectedCategory}"`
                  : selectedColor
                  ? `${filteredItems.length} ${filteredItems.length === 1 ? 'item' : 'items'} with color "${selectedColor}"`
                  : `${filteredItems.length} items in collection`}
                {sortBy === "colorAZ" ? " • Sorted by Color" : ""}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {selectedCategory && (
                  <TouchableOpacity
                    style={styles.activeColorPill}
                    onPress={() => setSelectedCategory(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pricetag-outline" size={13} color={colors.primaryDark} />
                    <Text style={styles.activeColorBannerText}>Category: {selectedCategory}</Text>
                    <Ionicons name="close-circle" size={15} color={colors.primaryDark} />
                  </TouchableOpacity>
                )}
                {selectedColor && (
                  <TouchableOpacity
                    style={styles.activeColorPill}
                    onPress={() => setSelectedColor(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.colorFilterDot,
                        { backgroundColor: getColorHex(selectedColor) },
                        selectedColor.toLowerCase() === "white" && styles.colorDotBorder,
                      ]}
                    />
                    <Text style={styles.activeColorBannerText}>Color: {selectedColor}</Text>
                    <Ionicons name="close-circle" size={15} color={colors.primaryDark} />
                  </TouchableOpacity>
                )}
                {selectedCategory && selectedColor && (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCategory(null);
                      setSelectedColor(null);
                    }}
                    style={[styles.activeColorPill, { backgroundColor: colors.danger + "15", borderColor: colors.danger }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.activeColorBannerText, { color: colors.danger }]}>Clear All</Text>
                    <Ionicons name="close-circle" size={15} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* ========== ITEMS LIST ========== */}
          <ScrollView
            style={styles.itemsContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.itemsContent}
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading your items...</Text>
              </View>
            ) : sortedItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="shirt-outline" size={64} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>
                  {selectedCategory && selectedColor
                    ? `No ${selectedColor} items in "${selectedCategory}"`
                    : selectedColor
                    ? `No items with color "${selectedColor}"`
                    : selectedCategory
                    ? `No items in "${selectedCategory}"`
                    : "No items found"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {selectedCategory || selectedColor
                    ? "Try selecting a different color or category"
                    : "Start by adding items to your wardrobe"}
                </Text>
              </View>
            ) : isGridView ? (
              <View style={styles.gridContainer}>
                {sortedItems.map(renderGridViewItem)}
              </View>
            ) : (
              <View style={styles.listContainer}>
                {sortedItems.map(renderListViewItem)}
              </View>
            )}
          </ScrollView>

          {/* ========== MOVE MODAL ========== */}
          <Modal
            animationType="slide"
            transparent
            visible={moveModalVisible}
            onRequestClose={() => setMoveModalVisible(false)}
          >
            <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
              <View style={[styles.modalContent, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Move to wardrobe</Text>
                <ScrollView>
                  {wardrobes
                    .filter(w => !selectedItemIds.includes(w._id))
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
                  style={[styles.closeModalBtn, { backgroundColor: colors.card }]}
                  onPress={() => setMoveModalVisible(false)}
                >
                  <Text style={[styles.closeModalText, { color: colors.primary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* ========== SORT & FILTER MODAL ========== */}
          <Modal
            animationType="slide"
            transparent
            visible={sortModalVisible}
            onRequestClose={() => setSortModalVisible(false)}
          >
            <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
              <View style={[styles.modalContent, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 12 }]}>
                {/* Grab handle */}
                <View style={styles.sheetHandle} />

                {/* Header */}
                <View style={styles.modalHeaderNew}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Sort & Filter</Text>
                    <Text style={styles.modalSubtitle}>Customize your wardrobe view</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {(sortBy !== "dateNewest" || selectedColor !== null) && (
                      <TouchableOpacity
                        onPress={() => {
                          setSortBy("dateNewest");
                          setSelectedColor(null);
                        }}
                        style={styles.resetSortBtn}
                      >
                        <Text style={styles.resetSortText}>Reset</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.modalCloseCircle}
                      onPress={() => setSortModalVisible(false)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={18} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.sortModalScroll}>
                  {/* Color Section */}
                  <View style={styles.sortSection}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="color-palette" size={16} color={colors.primary} />
                      <Text style={[styles.sortSectionTitle, { color: colors.textPrimary }]}>By Color</Text>
                    </View>

                    {/* Color A to Z */}
                    <TouchableOpacity
                      style={[
                        styles.sortOptionCard,
                        sortBy === "colorAZ" && styles.sortOptionCardActive,
                      ]}
                      onPress={() => setSortBy(sortBy === "colorAZ" ? "dateNewest" : "colorAZ")}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.sortOptionIconBox, sortBy === "colorAZ" && styles.sortOptionIconBoxActive]}>
                        <Ionicons
                          name="color-filter-outline"
                          size={18}
                          color={sortBy === "colorAZ" ? "#FFFFFF" : colors.primary}
                        />
                      </View>
                      <View style={styles.sortOptionTextWrap}>
                        <Text style={[styles.sortOptionLabel, sortBy === "colorAZ" && styles.sortOptionLabelActive]}>
                          Color: A to Z
                        </Text>
                        <Text style={styles.sortOptionSublabel}>Group clothes by color name alphabetically</Text>
                      </View>
                      <Ionicons
                        name={sortBy === "colorAZ" ? "checkmark-circle" : "ellipse-outline"}
                        size={20}
                        color={sortBy === "colorAZ" ? colors.primary : colors.textMuted}
                      />
                    </TouchableOpacity>

                    {/* Filter by Specific Available Color */}
                    {availableColors.length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.subfilterLabel}>Filter by specific color:</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.colorFilterScroll}
                        >
                          <TouchableOpacity
                            style={[
                              styles.colorFilterChip,
                              selectedColor === null && styles.colorFilterChipActive,
                            ]}
                            onPress={() => setSelectedColor(null)}
                          >
                            <Text
                              style={[
                                styles.colorFilterChipText,
                                selectedColor === null && styles.colorFilterChipTextActive,
                              ]}
                            >
                              All Colors
                            </Text>
                          </TouchableOpacity>

                          {availableColors.map((cName) => {
                            const isChipActive = selectedColor?.toLowerCase() === cName.toLowerCase();
                            const hex = getColorHex(cName);
                            return (
                              <TouchableOpacity
                                key={cName}
                                style={[
                                  styles.colorFilterChip,
                                  isChipActive && styles.colorFilterChipActive,
                                ]}
                                onPress={() => setSelectedColor(isChipActive ? null : cName)}
                              >
                                <View
                                  style={[
                                    styles.colorFilterDot,
                                    { backgroundColor: hex },
                                    cName.toLowerCase() === "white" && styles.colorDotBorder,
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.colorFilterChipText,
                                    isChipActive && styles.colorFilterChipTextActive,
                                  ]}
                                >
                                  {cName}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Date Section */}
                  <View style={styles.sortSection}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                      <Text style={[styles.sortSectionTitle, { color: colors.textPrimary }]}>By Date</Text>
                    </View>
                    <View style={styles.sortOptionsGrid}>
                      <TouchableOpacity
                        style={[
                          styles.sortGridOption,
                          sortBy === "dateNewest" && styles.sortGridOptionActive,
                        ]}
                        onPress={() => setSortBy("dateNewest")}
                      >
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color={sortBy === "dateNewest" ? colors.primary : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.sortGridOptionText,
                            sortBy === "dateNewest" && styles.sortGridOptionTextActive,
                          ]}
                        >
                          Newest First
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.sortGridOption,
                          sortBy === "dateOldest" && styles.sortGridOptionActive,
                        ]}
                        onPress={() => setSortBy("dateOldest")}
                      >
                        <Ionicons
                          name="hourglass-outline"
                          size={16}
                          color={sortBy === "dateOldest" ? colors.primary : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.sortGridOptionText,
                            sortBy === "dateOldest" && styles.sortGridOptionTextActive,
                          ]}
                        >
                          Oldest First
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Price Section */}
                  <View style={styles.sortSection}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="cash-outline" size={16} color={colors.primary} />
                      <Text style={[styles.sortSectionTitle, { color: colors.textPrimary }]}>By Price</Text>
                    </View>
                    <View style={styles.sortOptionsGrid}>
                      <TouchableOpacity
                        style={[
                          styles.sortGridOption,
                          sortBy === "priceHigh" && styles.sortGridOptionActive,
                        ]}
                        onPress={() => setSortBy("priceHigh")}
                      >
                        <Ionicons
                          name="arrow-down-circle-outline"
                          size={16}
                          color={sortBy === "priceHigh" ? colors.primary : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.sortGridOptionText,
                            sortBy === "priceHigh" && styles.sortGridOptionTextActive,
                          ]}
                        >
                          High to Low
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.sortGridOption,
                          sortBy === "priceLow" && styles.sortGridOptionActive,
                        ]}
                        onPress={() => setSortBy("priceLow")}
                      >
                        <Ionicons
                          name="arrow-up-circle-outline"
                          size={16}
                          color={sortBy === "priceLow" ? colors.primary : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.sortGridOptionText,
                            sortBy === "priceLow" && styles.sortGridOptionTextActive,
                          ]}
                        >
                          Low to High
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Name Section */}
                  <View style={styles.sortSection}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="text-outline" size={16} color={colors.primary} />
                      <Text style={[styles.sortSectionTitle, { color: colors.textPrimary }]}>By Name</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.sortOptionCard,
                        sortBy === "nameAZ" && styles.sortOptionCardActive,
                      ]}
                      onPress={() => setSortBy(sortBy === "nameAZ" ? "dateNewest" : "nameAZ")}
                    >
                      <View style={[styles.sortOptionIconBox, sortBy === "nameAZ" && styles.sortOptionIconBoxActive]}>
                        <Ionicons
                          name="text-outline"
                          size={18}
                          color={sortBy === "nameAZ" ? "#FFFFFF" : colors.primary}
                        />
                      </View>
                      <View style={styles.sortOptionTextWrap}>
                        <Text style={[styles.sortOptionLabel, sortBy === "nameAZ" && styles.sortOptionLabelActive]}>
                          Category: A to Z
                        </Text>
                        <Text style={styles.sortOptionSublabel}>Sort categories alphabetically</Text>
                      </View>
                      <Ionicons
                        name={sortBy === "nameAZ" ? "checkmark-circle" : "ellipse-outline"}
                        size={20}
                        color={sortBy === "nameAZ" ? colors.primary : colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Visibility Section */}
                  <View style={[styles.sortSection, { borderBottomWidth: 0 }]}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="eye-outline" size={16} color={colors.primary} />
                      <Text style={[styles.sortSectionTitle, { color: colors.textPrimary }]}>Visibility First</Text>
                    </View>
                    <View style={styles.sortOptionsGridThree}>
                      <TouchableOpacity
                        style={[
                          styles.sortGridOption,
                          sortBy === "publicFirst" && styles.sortGridOptionActive,
                        ]}
                        onPress={() => setSortBy("publicFirst")}
                      >
                        <Ionicons
                          name="globe-outline"
                          size={16}
                          color={sortBy === "publicFirst" ? colors.primary : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.sortGridOptionText,
                            sortBy === "publicFirst" && styles.sortGridOptionTextActive,
                          ]}
                        >
                          Public
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.sortGridOption,
                          sortBy === "privateFirst" && styles.sortGridOptionActive,
                        ]}
                        onPress={() => setSortBy("privateFirst")}
                      >
                        <Ionicons
                          name="lock-closed-outline"
                          size={16}
                          color={sortBy === "privateFirst" ? colors.primary : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.sortGridOptionText,
                            sortBy === "privateFirst" && styles.sortGridOptionTextActive,
                          ]}
                        >
                          Private
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.sortGridOption,
                          sortBy === "premiumFirst" && styles.sortGridOptionActive,
                        ]}
                        onPress={() => setSortBy("premiumFirst")}
                      >
                        <Ionicons
                          name="diamond-outline"
                          size={16}
                          color={sortBy === "premiumFirst" ? "#B8860B" : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.sortGridOptionText,
                            sortBy === "premiumFirst" && styles.sortGridOptionTextActive,
                          ]}
                        >
                          Premium
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={styles.applySortBtn}
                  onPress={() => setSortModalVisible(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.applySortBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Floating Action Button (FAB) */}
          {!itemSelectionMode && (
            <TouchableOpacity
              style={styles.fabBtn}
              onPress={() => router.push("/add-wardrobe")}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
              <Text style={styles.fabBtnText}>Add Clothes</Text>
            </TouchableOpacity>
          )}
        </View>
      </AppBackground>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
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
    sortButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    sortButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    sortButtonText: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: "600",
    },
    sortButtonTextActive: {
      color: "#FFFFFF",
    },
    sortActiveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#FFFFFF",
    },
    categoriesSection: {
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoriesHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    categoriesTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    clearFilterButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.card,
      borderRadius: 12,
    },
    clearFilterText: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "600",
    },
    categoriesScrollView: {
      paddingLeft: 16,
      paddingTop: 8,
      paddingBottom: 4,
      overflow: "visible",
    },
    categoriesContent: {
      paddingRight: 16,
      paddingTop: 6,
      paddingBottom: 4,
      gap: 14,
    },
    categoryChip: {
      alignItems: "center",
      width: 70,
      overflow: "visible",
    },
    categoryChipSelected: {
      transform: [{ scale: 1.05 }],
    },
    categoryIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 6,
      position: "relative",
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    categoryIconContainerSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 6,
    },
    categoryIcon: {
      width: 28,
      height: 28,
      resizeMode: "contain",
      tintColor: colors.primary,
    },
    categoryIconSelected: {
      tintColor: "#FFFFFF",
    },
    categoryCountBadge: {
      position: "absolute",
      top: -3,
      right: -3,
      backgroundColor: colors.primary,
      borderRadius: 11,
      minWidth: 22,
      height: 22,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 4,
      borderWidth: 1.5,
      borderColor: colors.surface,
      zIndex: 10,
      elevation: 3,
    },
    categoryCountBadgeSelected: {
      backgroundColor: "#FFFFFF",
      borderColor: colors.primary,
    },
    colorsSection: {
      paddingTop: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    colorsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      marginBottom: 6,
    },
    colorsTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    colorsScrollView: {
      paddingLeft: 16,
      overflow: "visible",
    },
    colorsContent: {
      paddingRight: 16,
      gap: 10,
    },
    colorSwatchChip: {
      alignItems: "center",
      width: 44,
      overflow: "visible",
    },
    colorSwatchChipSelected: {
      transform: [{ scale: 1.05 }],
    },
    colorSwatchCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 3,
      position: "relative",
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    colorSwatchCircleSelected: {
      borderColor: colors.primaryDark,
      borderWidth: 2,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 4,
      elevation: 4,
    },
    whiteColorBorder: {
      borderColor: "#D1D5DB",
    },
    colorSwatchBadge: {
      position: "absolute",
      top: -3,
      right: -3,
      backgroundColor: colors.primary,
      borderRadius: 8,
      minWidth: 15,
      height: 15,
      paddingHorizontal: 3,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.surface,
    },
    colorSwatchBadgeSelected: {
      backgroundColor: colors.primaryDark,
    },
    colorSwatchBadgeText: {
      color: "#FFFFFF",
      fontSize: 9,
      fontWeight: "700",
    },
    colorSwatchLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: "600",
      textAlign: "center",
    },
    colorSwatchLabelSelected: {
      color: colors.primaryDark,
      fontWeight: "700",
    },
    colorMatchedItem: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    resultsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
    },
    categoryCountText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "700",
    },
    categoryCountTextSelected: {
      color: colors.primary,
      fontWeight: "800",
    },
    categoryChipLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 14,
    },
    categoryChipLabelSelected: {
      color: colors.primary,
      fontWeight: "700",
    },
    resultsInfo: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.card,
    },
    resultsText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    itemsContainer: {
      flex: 1,
    },
    itemsContent: {
      padding: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingTop: 100,
    },
    loadingText: {
      fontSize: 16,
      color: colors.textMuted,
      marginTop: 16,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 100,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      marginTop: 20,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 8,
      maxWidth: 250,
    },
    gridContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    gridItem: {
      width: "48%",
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    gridImageContainer: {
      position: "relative",
      width: "100%",
      height: 160,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      backgroundColor: colors.cardHover || colors.card || "#F3F4F6",
      overflow: "hidden",
    },
    gridImage: {
      width: "100%",
      height: "100%",
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    gridCategoryBadge: {
      position: "absolute",
      top: 10,
      left: 10,
      backgroundColor: colors.overlay,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    gridCategoryText: {
      color: "#fff",
      fontSize: 10,
      fontWeight: "600",
    },
    gridItemInfo: {
      padding: 12,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
    },
    gridItemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 4,
    },
    gridItemName: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary,
      flex: 1,
      marginRight: 8,
    },
    gridItemPrice: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.primary,
    },
    gridItemBrand: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 6,
    },
    gridItemDescription: {
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 14,
      marginBottom: 8,
    },
    listContainer: {
      gap: 12,
    },
    listItem: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 12,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    listImage: {
      width: 80,
      height: 80,
      borderRadius: 12,
    },
    listItemInfo: {
      flex: 1,
      marginLeft: 12,
    },
    listItemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 6,
    },
    listItemName: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textPrimary,
      flex: 1,
      marginRight: 8,
    },
    listItemPrice: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.primary,
    },
    listItemBrand: {
      fontSize: 13,
      color: colors.textMuted,
    },
    listItemDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
      marginBottom: 8,
    },
    listItemFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    listItemDate: {
      fontSize: 11,
      color: colors.textMuted,
    },
    listRightContainer: {
      justifyContent: 'center',
      marginLeft: 8,
    },
    listItemMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
      flexWrap: 'wrap',
    },
    visibilityBadgeInline: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      gap: 3,
    },
    visibilityBadgeText: {
      fontSize: 10,
      fontWeight: '600',
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
    dimOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(255,255,255,0.7)",
      zIndex: 1,
    },
    dimmedTextContainer: {
      opacity: 0.6,
    },
    selectionIndicator: {
      position: "absolute",
      top: 8,
      right: 8,
      zIndex: 2,
      width: 24,
      height: 24,
      justifyContent: "center",
      alignItems: "center",
    },
    selectedIndicator: {
      borderRadius: 12,
      backgroundColor: "transparent",
    },
    unselectedIndicator: {
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 12,
      backgroundColor: colors.background,
    },
    unselectedCircle: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1,
      backgroundColor: "transparent",
    },
    dimmedListItem: {
      opacity: 0.6,
    },
    listSelectionIndicator: {
      marginLeft: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    // 👇 New style for visibility badge
    visibilityBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      backgroundColor: "rgba(0,0,0,0.6)",
      borderRadius: 12,
      padding: 4,
      zIndex: 5,
    },
    itemColorTag: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    itemColorTagDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    itemColorTagText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    colorDotBorder: {
      borderWidth: 0.8,
      borderColor: colors.border || "#D1D5DB",
    },
    activeColorBanner: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      flexDirection: "row",
    },
    activeColorPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardHover || colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 16,
      gap: 6,
      alignSelf: "flex-start",
    },
    activeColorBannerText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primaryDark,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    modalContent: {
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 12,
      paddingBottom: 24,
    },
    sheetHandle: {
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 12,
    },
    modalHeaderNew: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    modalCloseCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },
    resetSortBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginRight: 6,
    },
    resetSortText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.primaryDark,
    },
    sortModalScroll: {
      maxHeight: 460,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 10,
    },
    sortSection: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sortSectionTitle: {
      fontSize: 14,
      fontWeight: "700",
    },
    sortOptionCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    sortOptionCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.cardHover || colors.surface,
      borderWidth: 1.5,
    },
    sortOptionIconBox: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sortOptionIconBoxActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    sortOptionTextWrap: {
      flex: 1,
    },
    sortOptionLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    sortOptionLabelActive: {
      color: colors.primaryDark,
      fontWeight: "700",
    },
    sortOptionSublabel: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    subfilterLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 6,
    },
    colorFilterScroll: {
      paddingVertical: 4,
      paddingRight: 16,
    },
    colorFilterChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    colorFilterChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    colorFilterChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    colorFilterChipTextActive: {
      color: "#FFFFFF",
    },
    colorFilterDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 6,
    },
    sortOptionsGrid: {
      flexDirection: "row",
      gap: 10,
    },
    sortOptionsGridThree: {
      flexDirection: "row",
      gap: 8,
    },
    sortGridOption: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sortGridOptionActive: {
      backgroundColor: colors.cardHover || colors.surface,
      borderColor: colors.primary,
      borderWidth: 1.5,
    },
    sortGridOptionText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    sortGridOptionTextActive: {
      color: colors.primaryDark,
      fontWeight: "700",
    },
    applySortBtn: {
      backgroundColor: colors.addButton || colors.primary,
      paddingVertical: 14,
      borderRadius: 24,
      alignItems: "center",
      marginHorizontal: 20,
      marginTop: 12,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 4,
    },
    applySortBtnText: {
      color: colors.textPrimary || "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
    closeModalBtn: {
      marginHorizontal: 20,
      marginTop: 20,
      padding: 14,
      alignItems: "center",
      borderRadius: 12,
    },
    closeModalText: {
      fontWeight: "600",
      fontSize: 16,
    },
    moveWardrobeItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 14,
      borderBottomWidth: 1,
    },
    moveWardrobeText: {
      fontSize: 15,
      fontWeight: "600",
    },
  });