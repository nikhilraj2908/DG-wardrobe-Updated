import AppBackground from "@/components/AppBackground";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { Ionicons } from "@expo/vector-icons";
import { storage } from "@/utils/storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../../api/api";
import { useTheme } from "@/app/theme/ThemeContext";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface WardrobeItem {
  _id: string;
  wardrobe: string | { _id: string; name: string; color?: string };
  category: string;
  price: number;
  brand?: string | { _id: string; name: string; color?: string };
  color?: string;
  imageUrl?: string;
  images?: string[];
  createdAt: string;
  description?: string;
  isPublic?: boolean;
}

interface UserInfo {
  _id: string;
  username: string;
  name?: string;
  photo?: string;
  profilePicture?: string;
}

type SortOption =
  | "dateNewest"
  | "dateOldest"
  | "colorAZ"
  | "priceHigh"
  | "priceLow"
  | "nameAZ";

// Category Icons
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
    shoes: require("../../assets/categories/mens/Shoes.png"),
    footwear: require("../../assets/categories/mens/Shoes.png"),
    sneakers: require("../../assets/categories/mens/Shoes.png"),
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
    shoes: require("../../assets/categories/womens/Shoes.png"),
    footwear: require("../../assets/categories/womens/Shoes.png"),
    sneakers: require("../../assets/categories/womens/Shoes.png"),
    heels: require("../../assets/categories/womens/Shoes.png"),
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
    "t-shirts": require("../../assets/categories/womens/Tshirt.png"),
    vests: require("../../assets/categories/womens/Vest.png"),
    tops: require("../../assets/categories/womens/Top.png"),
    skirts: require("../../assets/categories/womens/Skirt.png"),
  },

  unisex: {},
};

const normalizeCategoryKey = (name?: any) => {
  if (!name || typeof name !== "string") return "";
  return name.toLowerCase().replace(/\s+/g, "");
};

const getCategoryIcon = (categoryName: string) => {
  const key = normalizeCategoryKey(categoryName);
  const mensIcons = CATEGORY_ICONS.mens as any;
  if (mensIcons[key]) return mensIcons[key];
  const womensIcons = CATEGORY_ICONS.womens as any;
  if (womensIcons[key]) return womensIcons[key];
  return null;
};

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
    olive: "#4D7C0F",
    yellow: "#EAB308",
    orange: "#F97316",
    purple: "#9333EA",
    maroon: "#881337",
    cream: "#FEF3C7",
    silver: "#9CA3AF",
    gold: "#D97706",
  };
  return map[clean] || "#A855F7";
};

export default function PublicWardrobeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const params = useLocalSearchParams<{ userId: string; username?: string }>();
  const userId = params.userId;

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("dateNewest");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isGridView, setIsGridView] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const DEFAULT_IMAGE = "https://ui-avatars.com/api/?name=Item&background=random";

  const getCategoryName = (category: any): string => {
    if (!category) return "Uncategorized";
    if (typeof category === "string") return category;
    if (typeof category === "object" && category.name) {
      return category.name;
    }
    return "Uncategorized";
  };

  const displayName = useMemo(() => {
    const raw = userInfo?.username || userInfo?.name || params.username || "User";
    if (!raw || raw.toLowerCase() === "user") return "User";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [userInfo, params.username]);

  const headerTitle = useMemo(() => {
    if (!displayName || displayName === "User") return "User's Wardrobe";
    return displayName.endsWith("s") || displayName.endsWith("S")
      ? `${displayName}' Wardrobe`
      : `${displayName}'s Wardrobe`;
  }, [displayName]);

  const fetchUserPublicItems = async () => {
    try {
      setLoading(true);
      const token = await storage.getItem("token");

      // 1. Fetch public items
      const res = await api.get(`/api/wardrobe/user/${userId}/items`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setItems(res.data.items || []);

      // 2. Fetch user profile (fixed endpoint: /api/user/:userId)
      try {
        const userRes = await api.get(`/api/user/${userId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setUserInfo(userRes.data);
      } catch (err) {
        console.log("Could not fetch user info");
      }
    } catch (err) {
      console.error("Error fetching public items:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const getWardrobeName = (wardrobe: string | { _id: string; name: string; color?: string }): string => {
    if (typeof wardrobe === "string") {
      return wardrobe;
    }
    return wardrobe?.name || "No Wardrobe";
  };

  const getBrandName = (brand?: string | { _id: string; name: string; color?: string }): string => {
    if (!brand) return "No Brand";
    if (typeof brand === "string") {
      return brand;
    }
    return brand?.name || "No Brand";
  };

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        setSelectedCategory(null);
        setSelectedColor(null);
        fetchUserPublicItems();
      }
    }, [userId])
  );

  // Compute Categories with item counts
  const categoriesWithCounts = useMemo(() => {
    const categoryMap = new Map<string, number>();

    items.forEach((item) => {
      const category = getCategoryName(item.category);
      if (!category) return;
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    return Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  // Compute Colors with item counts
  const colorsWithCounts = useMemo(() => {
    const colorMap = new Map<string, number>();

    items.forEach((item) => {
      if (item.color && typeof item.color === "string" && item.color.trim().length > 0) {
        const c = item.color.trim();
        const formatted = c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
        colorMap.set(formatted, (colorMap.get(formatted) || 0) + 1);
      }
    });

    return Array.from(colorMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const availableColors = useMemo(() => {
    return colorsWithCounts.map((c) => c.name);
  }, [colorsWithCounts]);

  // Combined Filtering: Category + Color
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategory && getCategoryName(item.category) !== selectedCategory) {
        return false;
      }
      if (
        selectedColor &&
        (!item.color || item.color.trim().toLowerCase() !== selectedColor.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [items, selectedCategory, selectedColor]);

  // Sorting
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      switch (sortBy) {
        case "dateOldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "priceHigh":
          return b.price - a.price;
        case "priceLow":
          return a.price - b.price;
        case "nameAZ":
          return getCategoryName(a.category).localeCompare(getCategoryName(b.category));
        case "colorAZ":
          return (a.color || "").localeCompare(b.color || "");
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [filteredItems, sortBy]);

  const getItemImageUrl = (item: WardrobeItem): string => {
    const imagePath = item.images?.[0] || item.imageUrl || null;
    return (imagePath ? resolveImageUrl(imagePath) : null) || DEFAULT_IMAGE;
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
        <View
          style={[
            styles.categoryIconContainer,
            isSelected && styles.categoryIconContainerSelected,
          ]}
        >
          {icon ? (
            <Image
              source={icon}
              style={[
                styles.categoryIcon,
                isSelected && styles.categoryIconSelected,
              ]}
            />
          ) : (
            <Ionicons
              name="shirt-outline"
              size={22}
              color={isSelected ? "#FFFFFF" : colors.primary}
            />
          )}

          {count > 0 && (
            <View
              style={[
                styles.categoryCountBadge,
                isSelected && styles.categoryCountBadgeSelected,
              ]}
            >
              <Text
                style={[
                  styles.categoryCountText,
                  isSelected && styles.categoryCountTextSelected,
                ]}
              >
                {count}
              </Text>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.categoryChipLabel,
            isSelected && styles.categoryChipLabelSelected,
          ]}
          numberOfLines={2}
        >
          {name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderGridViewItem = (item: WardrobeItem) => (
    <TouchableOpacity
      key={item._id}
      activeOpacity={0.9}
      style={styles.gridItem}
      onPress={() => router.push(`/wardrobe/item/${item._id}`)}
    >
      <View style={styles.gridImageContainer}>
        <Image
          source={{ uri: getItemImageUrl(item) }}
          style={styles.gridImage}
        />
        <View style={styles.gridCategoryBadge}>
          <Text style={styles.gridCategoryText} numberOfLines={1}>
            {getCategoryName(item.category)}
          </Text>
        </View>
        <View style={styles.publicBadge}>
          <Ionicons name="earth-outline" size={10} color="#fff" />
          <Text style={styles.publicBadgeText}>Public</Text>
        </View>
      </View>

      <View style={styles.gridItemInfo}>
        <View style={styles.gridItemHeader}>
          <Text style={styles.gridItemName} numberOfLines={1}>
            {getCategoryName(item.category)}
          </Text>
          <Text style={styles.gridItemPrice}>₹{item.price}</Text>
        </View>

        <View style={styles.brandAndColorRow}>
          <Text style={styles.gridItemBrand} numberOfLines={1}>
            {getBrandName(item.brand) || getWardrobeName(item.wardrobe)}
          </Text>
          {item.color ? (
            <View style={styles.itemColorTag}>
              <View
                style={[
                  styles.itemColorDot,
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

        <Text style={styles.gridItemDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderListViewItem = (item: WardrobeItem) => (
    <TouchableOpacity
      key={item._id}
      activeOpacity={0.9}
      style={styles.listItem}
      onPress={() => router.push(`/wardrobe/item/${item._id}`)}
    >
      <Image
        source={{ uri: getItemImageUrl(item) }}
        style={styles.listImage}
      />

      <View style={styles.listItemInfo}>
        <View style={styles.listItemHeader}>
          <Text style={styles.listItemName} numberOfLines={1}>
            {getCategoryName(item.category)}
          </Text>
          <Text style={styles.listItemPrice}>₹{item.price}</Text>
        </View>

        <View style={styles.listItemMeta}>
          <Ionicons name="business-outline" size={14} color={colors.textMuted} />
          <Text style={styles.listItemBrand} numberOfLines={1}>
            {getBrandName(item.brand) || getWardrobeName(item.wardrobe)}
          </Text>

          {item.color ? (
            <View style={styles.itemColorTag}>
              <View
                style={[
                  styles.itemColorDot,
                  { backgroundColor: getColorHex(item.color) },
                  item.color.toLowerCase() === "white" && styles.colorDotBorder,
                ]}
              />
              <Text style={styles.itemColorTagText} numberOfLines={1}>
                {item.color}
              </Text>
            </View>
          ) : null}

          <View style={styles.listPublicIndicator}>
            <Ionicons name="earth-outline" size={10} color={colors.success} />
            <Text style={styles.listPublicText}>Public</Text>
          </View>
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

      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  const isFilterOrSortActive = sortBy !== "dateNewest" || selectedColor !== null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <AppBackground>
        <View style={styles.container}>
          {/* Header with User Info */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                onPress={() => router.back()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back-outline" size={24} color={colors.textPrimary} />
              </TouchableOpacity>

              <View style={styles.headerUserInfo}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {headerTitle}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {items.length} public {items.length === 1 ? "item" : "items"}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => setIsGridView(!isGridView)}>
                <Ionicons
                  name={isGridView ? "grid-outline" : "list-outline"}
                  size={24}
                  color={isGridView ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, isFilterOrSortActive && styles.sortButtonActive]}
                onPress={() => setSortModalVisible(true)}
              >
                <Ionicons
                  name={isFilterOrSortActive ? "filter" : "filter-outline"}
                  size={16}
                  color={isFilterOrSortActive ? "#FFFFFF" : colors.primary}
                />
                <Text
                  style={[
                    styles.sortButtonText,
                    isFilterOrSortActive && styles.sortButtonTextActive,
                  ]}
                >
                  Sort
                </Text>
                {isFilterOrSortActive && <View style={styles.sortActiveDot} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Categories Filter Section */}
          {categoriesWithCounts.length > 0 && (
            <View style={styles.categoriesSection}>
              <View style={styles.categoriesHeader}>
                <Text style={styles.categoriesTitle}>Categories</Text>
                <TouchableOpacity
                  onPress={() => setSelectedCategory(null)}
                  style={styles.clearFilterButton}
                >
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
                {/* All Items Chip */}
                <TouchableOpacity
                  onPress={() => setSelectedCategory(null)}
                  style={[
                    styles.categoryChip,
                    !selectedCategory && styles.categoryChipSelected,
                  ]}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.categoryIconContainer,
                      !selectedCategory && styles.categoryIconContainerSelected,
                    ]}
                  >
                    <Ionicons
                      name="apps-outline"
                      size={22}
                      color={!selectedCategory ? "#FFFFFF" : colors.primary}
                    />

                    {items.length > 0 && (
                      <View
                        style={[
                          styles.categoryCountBadge,
                          !selectedCategory && styles.categoryCountBadgeSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryCountText,
                            !selectedCategory && styles.categoryCountTextSelected,
                          ]}
                        >
                          {items.length}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.categoryChipLabel,
                      !selectedCategory && styles.categoryChipLabelSelected,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>

                {/* Category Chips */}
                {categoriesWithCounts.map(renderCategoryChip)}
              </ScrollView>
            </View>
          )}

          {/* Colors Filter Section */}
          {colorsWithCounts.length > 0 && (
            <View style={styles.colorsSection}>
              <View style={styles.colorsHeader}>
                <Text style={styles.colorsTitle}>Filter by Color</Text>
                {selectedColor && (
                  <TouchableOpacity onPress={() => setSelectedColor(null)}>
                    <Text style={styles.clearColorText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.colorsScrollView}
                contentContainerStyle={styles.colorsContent}
              >
                {/* All Colors Chip */}
                <TouchableOpacity
                  onPress={() => setSelectedColor(null)}
                  style={[
                    styles.colorSwatchChip,
                    !selectedColor && styles.colorSwatchChipSelected,
                  ]}
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

                {/* Specific Colors */}
                {colorsWithCounts.map((c) => {
                  const isSelected =
                    selectedColor?.toLowerCase() === c.name.toLowerCase();
                  const hex = getColorHex(c.name);
                  const isWhite = c.name.toLowerCase() === "white";

                  return (
                    <TouchableOpacity
                      key={c.name}
                      onPress={() => setSelectedColor(isSelected ? null : c.name)}
                      style={[
                        styles.colorSwatchChip,
                        isSelected && styles.colorSwatchChipSelected,
                      ]}
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
                        ) : (
                          <View
                            style={[
                              styles.colorSwatchBadge,
                              isSelected && styles.colorSwatchBadgeSelected,
                            ]}
                          >
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
          )}

          {/* Results Info & Active Filter Badges */}
          <View style={styles.resultsInfo}>
            <View style={styles.resultsHeaderRow}>
              <Text style={styles.resultsText}>
                {sortedItems.length} public {sortedItems.length === 1 ? "item" : "items"} found
              </Text>
              {(selectedCategory || selectedColor) && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCategory(null);
                    setSelectedColor(null);
                  }}
                >
                  <Text style={styles.clearAllFiltersText}>Reset Filters</Text>
                </TouchableOpacity>
              )}
            </View>

            {(selectedCategory || selectedColor) && (
              <View style={styles.activeFilterRow}>
                {selectedCategory && (
                  <TouchableOpacity
                    style={styles.activeFilterPill}
                    onPress={() => setSelectedCategory(null)}
                  >
                    <Ionicons name="shirt-outline" size={12} color={colors.primaryDark} />
                    <Text style={styles.activeFilterPillText}>{selectedCategory}</Text>
                    <Ionicons name="close-circle" size={13} color={colors.primaryDark} />
                  </TouchableOpacity>
                )}
                {selectedColor && (
                  <TouchableOpacity
                    style={styles.activeFilterPill}
                    onPress={() => setSelectedColor(null)}
                  >
                    <View
                      style={[
                        styles.colorFilterDot,
                        { backgroundColor: getColorHex(selectedColor) },
                        selectedColor.toLowerCase() === "white" && styles.colorDotBorder,
                      ]}
                    />
                    <Text style={styles.activeFilterPillText}>{selectedColor}</Text>
                    <Ionicons name="close-circle" size={13} color={colors.primaryDark} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Items List */}
          <ScrollView
            style={styles.itemsContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.itemsContent}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading public items...</Text>
              </View>
            ) : sortedItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="shirt-outline" size={64} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>
                  {selectedCategory || selectedColor
                    ? "No items match your filter"
                    : "No public items available"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {selectedCategory || selectedColor
                    ? "Try resetting filters to view all public clothes"
                    : "This user hasn't made any items public yet"}
                </Text>
                {selectedCategory || selectedColor ? (
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                      setSelectedCategory(null);
                      setSelectedColor(null);
                    }}
                  >
                    <Ionicons name="refresh" size={16} color={colors.primaryDark} />
                    <Text style={styles.backButtonText}>Reset Filters</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                  >
                    <Ionicons name="arrow-back" size={16} color={colors.primaryDark} />
                    <Text style={styles.backButtonText}>Go Back</Text>
                  </TouchableOpacity>
                )}
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

          {/* Modern Bottom Sheet Sort & Filter Modal */}
          <Modal
            animationType="slide"
            transparent
            visible={sortModalVisible}
            onRequestClose={() => setSortModalVisible(false)}
          >
            <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
              <View
                style={[
                  styles.modalContent,
                  { backgroundColor: colors.surface, paddingBottom: insets.bottom + 12 },
                ]}
              >
                {/* Grab handle */}
                <View style={styles.sheetHandle} />

                {/* Header */}
                <View style={styles.modalHeaderNew}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                      Sort & Filter
                    </Text>
                    <Text style={styles.modalSubtitle}>Customize your wardrobe view</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {isFilterOrSortActive && (
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
                  {/* By Color Section */}
                  <View style={styles.sortSection}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="color-palette" size={16} color={colors.primary} />
                      <Text style={[styles.sortSectionTitle, { color: colors.textPrimary }]}>
                        By Color
                      </Text>
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
                      <View
                        style={[
                          styles.sortOptionIconBox,
                          sortBy === "colorAZ" && styles.sortOptionIconBoxActive,
                        ]}
                      >
                        <Ionicons
                          name="color-filter-outline"
                          size={18}
                          color={sortBy === "colorAZ" ? "#FFFFFF" : colors.primary}
                        />
                      </View>
                      <View style={styles.sortOptionTextWrap}>
                        <Text
                          style={[
                            styles.sortOptionLabel,
                            sortBy === "colorAZ" && styles.sortOptionLabelActive,
                          ]}
                        >
                          Color: A to Z
                        </Text>
                        <Text style={styles.sortOptionSublabel}>
                          Group clothes by color name alphabetically
                        </Text>
                      </View>
                      <Ionicons
                        name={sortBy === "colorAZ" ? "checkmark-circle" : "ellipse-outline"}
                        size={20}
                        color={sortBy === "colorAZ" ? colors.primary : colors.textMuted}
                      />
                    </TouchableOpacity>

                    {/* Specific Color filter chips */}
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
                            const isChipActive =
                              selectedColor?.toLowerCase() === cName.toLowerCase();
                            const hex = getColorHex(cName);
                            return (
                              <TouchableOpacity
                                key={cName}
                                style={[
                                  styles.colorFilterChip,
                                  isChipActive && styles.colorFilterChipActive,
                                ]}
                                onPress={() =>
                                  setSelectedColor(isChipActive ? null : cName)
                                }
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
                      <Text style={[styles.sortSectionTitle, { color: colors.textPrimary }]}>
                        By Date
                      </Text>
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
                      <Text style={[styles.sortSectionTitle, { color: colors.textPrimary }]}>
                        By Price
                      </Text>
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
                      <Text style={[styles.sortSectionTitle, { color: colors.textPrimary }]}>
                        By Name
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.sortOptionCard,
                        sortBy === "nameAZ" && styles.sortOptionCardActive,
                      ]}
                      onPress={() => setSortBy(sortBy === "nameAZ" ? "dateNewest" : "nameAZ")}
                    >
                      <View
                        style={[
                          styles.sortOptionIconBox,
                          sortBy === "nameAZ" && styles.sortOptionIconBoxActive,
                        ]}
                      >
                        <Ionicons
                          name="text-outline"
                          size={18}
                          color={sortBy === "nameAZ" ? "#FFFFFF" : colors.primary}
                        />
                      </View>
                      <View style={styles.sortOptionTextWrap}>
                        <Text
                          style={[
                            styles.sortOptionLabel,
                            sortBy === "nameAZ" && styles.sortOptionLabelActive,
                          ]}
                        >
                          Category: A to Z
                        </Text>
                        <Text style={styles.sortOptionSublabel}>
                          Sort items by category name alphabetically
                        </Text>
                      </View>
                      <Ionicons
                        name={sortBy === "nameAZ" ? "checkmark-circle" : "ellipse-outline"}
                        size={20}
                        color={sortBy === "nameAZ" ? colors.primary : colors.textMuted}
                      />
                    </TouchableOpacity>
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
        </View>
      </AppBackground>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },

    // Header
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginRight: 12,
    },
    headerUserInfo: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      textAlign: "left",
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "left",
      marginTop: 2,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    sortButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
      position: "relative",
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
      fontWeight: "700",
    },
    sortActiveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#FFFFFF",
    },

    // Categories Section
    categoriesSection: {
      backgroundColor: colors.background,
      paddingTop: 14,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoriesHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    categoriesTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    clearFilterButton: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: colors.card,
      borderRadius: 12,
    },
    clearFilterText: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: "600",
    },
    categoriesScrollView: {
      paddingLeft: 16,
    },
    categoriesContent: {
      paddingRight: 16,
      gap: 14,
    },

    // Category Chips
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
    categoryCountText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "700",
    },
    categoryCountTextSelected: {
      color: colors.primary,
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

    // Colors Section
    colorsSection: {
      paddingTop: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    colorsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      marginBottom: 6,
    },
    colorsTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
    },
    clearColorText: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: "600",
    },
    colorsScrollView: {
      paddingLeft: 16,
    },
    colorsContent: {
      paddingRight: 16,
      gap: 10,
    },
    colorSwatchChip: {
      alignItems: "center",
      width: 48,
    },
    colorSwatchChipSelected: {
      transform: [{ scale: 1.05 }],
    },
    colorSwatchCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.border,
      marginBottom: 3,
      position: "relative",
    },
    colorSwatchCircleSelected: {
      borderColor: colors.primary,
      borderWidth: 2.5,
    },
    whiteColorBorder: {
      borderColor: colors.border,
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

    // Results Info
    resultsInfo: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.card,
    },
    resultsHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    resultsText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    clearAllFiltersText: {
      fontSize: 12,
      color: colors.danger,
      fontWeight: "600",
    },
    activeFilterRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      marginTop: 6,
    },
    activeFilterPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.primary + "15",
      borderWidth: 1,
      borderColor: colors.primary,
    },
    activeFilterPillText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.primaryDark,
    },

    // Items Container
    itemsContainer: {
      flex: 1,
    },
    itemsContent: {
      padding: 16,
      paddingBottom: 40,
    },

    // Grid View
    gridContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 12,
    },
    gridItem: {
      width: (SCREEN_WIDTH - 44) / 2,
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 4,
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 2,
    },
    gridImageContainer: {
      width: "100%",
      height: (SCREEN_WIDTH - 44) / 2,
      position: "relative",
    },
    gridImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    gridCategoryBadge: {
      position: "absolute",
      top: 8,
      left: 8,
      backgroundColor: "rgba(0,0,0,0.6)",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    gridCategoryText: {
      fontSize: 10,
      color: "#FFFFFF",
      fontWeight: "600",
    },
    publicBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(16, 185, 129, 0.85)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      gap: 2,
    },
    publicBadgeText: {
      fontSize: 9,
      color: "#FFFFFF",
      fontWeight: "700",
    },
    gridItemInfo: {
      padding: 10,
    },
    gridItemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 3,
    },
    gridItemName: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary,
      flex: 1,
      marginRight: 4,
    },
    gridItemPrice: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.primary,
    },
    brandAndColorRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    gridItemBrand: {
      fontSize: 12,
      color: colors.textMuted,
      flex: 1,
    },
    itemColorTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.card,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemColorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    itemColorTagText: {
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    gridItemDescription: {
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 14,
      marginBottom: 4,
    },
    gridItemDate: {
      fontSize: 10,
      color: colors.textMuted,
    },

    // List View
    listContainer: {
      gap: 12,
    },
    listItem: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
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
    listItemMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 6,
      flexWrap: "wrap",
    },
    listItemBrand: {
      fontSize: 13,
      color: colors.textMuted,
    },
    listPublicIndicator: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      gap: 3,
    },
    listPublicText: {
      fontSize: 10,
      color: colors.success,
      fontWeight: "600",
    },
    listItemDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
      marginBottom: 6,
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

    // Empty / Loading
    loadingContainer: {
      paddingVertical: 60,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 12,
    },
    emptyContainer: {
      paddingVertical: 60,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textPrimary,
      marginTop: 16,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 8,
      textAlign: "center",
      lineHeight: 18,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      marginTop: 20,
    },
    backButtonText: {
      color: colors.primaryDark,
      fontSize: 13,
      fontWeight: "700",
    },

    // Modern Sort Bottom Sheet
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 8,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginTop: 6,
      marginBottom: 6,
    },
    modalHeaderNew: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
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
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.danger + "15",
      marginRight: 8,
    },
    resetSortText: {
      fontSize: 12,
      color: colors.danger,
      fontWeight: "600",
    },
    sortModalScroll: {
      maxHeight: 460,
    },
    sortSection: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
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
    },
    sortOptionIconBoxActive: {
      backgroundColor: colors.primary,
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
    sortOptionsGrid: {
      flexDirection: "row",
      gap: 10,
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
    subfilterLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 8,
      fontWeight: "500",
    },
    colorFilterScroll: {
      flexDirection: "row",
      gap: 8,
      paddingVertical: 4,
    },
    colorFilterChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    colorFilterChipActive: {
      backgroundColor: colors.primary + "15",
      borderColor: colors.primary,
    },
    colorFilterChipText: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    colorFilterChipTextActive: {
      color: colors.primaryDark,
      fontWeight: "700",
    },
    colorFilterDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    colorDotBorder: {
      borderWidth: 1,
      borderColor: colors.border,
    },
    applySortBtn: {
      backgroundColor: colors.addButton || colors.primary,
      paddingVertical: 14,
      borderRadius: 24,
      alignItems: "center",
      marginHorizontal: 20,
      marginTop: 12,
    },
    applySortBtnText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
  });
