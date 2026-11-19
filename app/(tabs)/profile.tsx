import AppBackground from "@/components/AppBackground";
import { useFollow } from "@/context/FollowContext";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { Ionicons } from "@expo/vector-icons";
import { storage } from "@/utils/storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
// import HelpSupportPage from '../HelpSupportPage/HelpSupportPage'; // import your HelpSupportPage


import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import api from "../../api/api";
import { useTheme } from "../../app/theme/ThemeContext";
import BoxWardrobeCard from "../../components/BoxWardrobeCard";
import SavedGridCard from "../../components/SavedGridCard";
import { useAuth } from "../../context/AuthContext";
import { useSavedItems } from "../../context/SavedItemsContext";
interface Wardrobe {
  _id: string;
  name: string;
  color?: string;
  createdAt: string;
  itemCount?: number;
  totalWorth: number;
  coverImage?: string;
}

interface WardrobeItem {
  _id: string;
  wardrobe: string | { _id?: string; name?: string };
  category: string;
  price: number;
  brand: string;
  imageUrl: string;
  images?: string[];
  visibility?: "public" | "private";
  accessLevel?: string;
  user?: string;
}

interface User {
  _id: string;
  username: string;
  email: string;
  mobile?: string;
  gender?: string;
  dob?: string;
  photo?: string;
  createdAt: string;
  status: string
}

interface UserData {
  name: string;
  handle: string;
  bio: string;
  collectionWorth: string;
  followers: string;
  wardrobeCount: number;
}

interface SavedItem {
  _id: string;
  item: {
    _id: string;
    imageUrl?: string;
    images?: string[];
    cutoutImage?: string;
    image?: string;
    price: number;
    user: {
      username: string;
      photo?: string;
    };
    brand: string;
    name: string;
  };
}

export default function ProfileScreen() {
  const { theme } = useTheme();

  // if (!theme || !theme.colors) return null;

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"myWardrobes" | "savedItems" | "matchedPairs">("myWardrobes");
  const [matchedPairs, setMatchedPairs] = useState<any[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [wardrobes, setWardrobes] = useState<Wardrobe[]>([]);
  const [recentWardrobes, setRecentWardrobes] = useState<Wardrobe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [premiumWorth, setPremiumWorth] = useState(0);
  const [allItemsWorth, setAllItemsWorth] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const { savedItemIds } = useSavedItems();
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const { resetSaved } = useSavedItems();
  const { clearFollowing } = useFollow();
  const [pendingPremiumCount, setPendingPremiumCount] = useState(0);
  const { token, isAuthenticated, isLoading, logout } = useAuth();
  const [blocked, setBlocked] = useState(false);
  // Filter premium items (public items of the logged-in user)
  // ✅ Premium items (public + premium access)
  const premiumItems = wardrobeItems.filter(
    item =>
      item.visibility === "public" &&
      item.accessLevel === "premium"
  );

  // ✅ Public normal items (free items)
  const publicItems = wardrobeItems.filter(
    item =>
      item.visibility === "public" &&
      item.accessLevel === "public"
  );

  // ✅ All items (everything)
  const allItems = wardrobeItems;

  const fetchPendingPremiumCount = async () => {
    const token = await storage.getItem("token");
    if (!token) return;

    const res = await api.get("/api/premium/pending-count", {
      headers: { Authorization: `Bearer ${token}` },
    });

    setPendingPremiumCount(res.data.count || 0);
  };

  useEffect(() => {
    fetchPendingPremiumCount();
  }, []);

  // Calculate premium worth
  useEffect(() => {
    const worth = premiumItems.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      return sum + price;
    }, 0);

    setPremiumWorth(worth);
  }, [premiumItems]);

  const publicWorth = publicItems.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    return sum + price;
  }, 0);


  useEffect(() => {
    const total = allItems.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      return sum + price;
    }, 0);

    setAllItemsWorth(total);
  }, [allItems]);


  // Wardrobe selection state
  const [selectedWardrobeIds, setSelectedWardrobeIds] = useState<string[]>([]);
  const wardrobeSelectionMode = selectedWardrobeIds.length > 0;
  const selectedWardrobe = selectedWardrobeIds.length === 1 ? wardrobes.find(w => w._id === selectedWardrobeIds[0]) : null;

  const toggleWardrobeSelect = (id: string) => {
    setSelectedWardrobeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const cancelWardrobeSelection = () => {
    setSelectedWardrobeIds([]);
  };

  const confirmWardrobeDelete = () => {
    const isSingle = selectedWardrobeIds.length === 1;
    Alert.alert(
      isSingle ? "Delete wardrobe?" : "Delete wardrobes?",
      isSingle
        ? "All items inside this wardrobe will be permanently deleted. This action cannot be undone."
        : "All items inside the selected wardrobes will be permanently deleted. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: isSingle ? deleteSingleWardrobeFromProfile : deleteMultipleWardrobesFromProfile,
        },
      ]
    );
  };

  const deleteSingleWardrobeFromProfile = async () => {
    try {
      const token = await storage.getItem("token");
      await api.delete(`/api/wardrobe/${selectedWardrobeIds[0]}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedWardrobeIds([]);
      fetchProfileData();
    } catch (err) {
      console.error("Profile single delete failed", err);
    }
  };

  const deleteMultipleWardrobesFromProfile = async () => {
    try {
      const token = await storage.getItem("token");
      await api.delete("/api/wardrobe/bulk-delete", {
        headers: { Authorization: `Bearer ${token}` },
        data: { wardrobeIds: selectedWardrobeIds },
      });
      setSelectedWardrobeIds([]);
      fetchProfileData();
    } catch (err) {
      console.error("Profile bulk delete failed", err);
    }
  };

  const fetchLikeCount = async (itemId: string) => {
    try {
      const res = await api.get(`/api/like/item/${itemId}/count`);
      return res.data.count || 0;
    } catch (err) {
      console.log("Like count fetch failed", err);
      return 0;
    }
  };

  const fetchMatchedPairs = async () => {
    try {
      const storedToken = token || (await storage.getItem("token"));
      if (!storedToken) return;
      const res = await api.get("/api/outfits/my", {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      setMatchedPairs(res.data.outfits || []);
    } catch (err) {
      console.log("Error loading matched pairs:", err);
    }
  };

  const deleteMatchedPair = async (outfitId: string) => {
    Alert.alert("Delete Pair?", "Are you sure you want to delete this matched pair?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const storedToken = token || (await storage.getItem("token"));
            await api.delete(`/api/outfits/${outfitId}`, {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            setMatchedPairs((prev) => prev.filter((p) => p._id !== outfitId));
          } catch (err) {
            Alert.alert("Error", "Failed to delete matched pair");
          }
        },
      },
    ]);
  };


  const getWardrobeCoverImage = (wardrobeId: string) => {
    // Guard: if wardrobeItems is empty, return null (will show color until data loads)
    if (!wardrobeItems.length) return null;

    // Find all items belonging to this wardrobe (handle both string and object _id)
    const items = wardrobeItems.filter(item => {
      const itemWardrobeId = typeof item.wardrobe === 'object'
        ? item.wardrobe?._id
        : item.wardrobe;
      return itemWardrobeId === wardrobeId;
    });

    if (!items.length) return null;

    // Find the first item that actually has an image
    const itemWithImage = items.find(item =>
      (item.images && item.images.length > 0) || item.imageUrl
    );

    if (!itemWithImage) return null;

    const imagePath = itemWithImage.images?.[0] || itemWithImage.imageUrl;
    return imagePath ? resolveImageUrl(imagePath) : null;
  };

  // Get first image from all items for "All Items" box
  const getAllItemsCoverImage = () => {
    if (!wardrobeItems.length) return null;
    const firstItem = wardrobeItems[0];
    const imagePath = firstItem.images?.[0] || firstItem.imageUrl || null;
    return imagePath ? resolveImageUrl(imagePath) : null;
  };

  // Get first image from premium items for "Premium" box
  const getPremiumCoverImage = () => {
    if (!premiumItems.length) return null;
    const firstItem = premiumItems[0];
    const imagePath = firstItem.images?.[0] || firstItem.imageUrl || null;
    return imagePath ? resolveImageUrl(imagePath) : null;
  };

  const fetchSavedItems = async () => {
    try {
      const storedToken = token || (await storage.getItem("token"));
      if (!storedToken) return;
      const res = await api.get("/api/saved/me", {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      const cleanSavedItems = (res.data || []).filter((s: any) => s && s.item && s.item._id);
      setSavedItems(cleanSavedItems);
    } catch (err) {
      console.log("Failed to load saved items", err);
    }
  };

  useEffect(() => {
    if (activeTab === "savedItems") {
      fetchSavedItems();
    }
  }, [activeTab, savedItemIds]);

  useEffect(() => {
    if (activeTab !== "savedItems" || savedItems.length === 0) return;
    const loadLikes = async () => {
      try {
        const counts: Record<string, number> = {};
        await Promise.all(
          savedItems.map(async (saved) => {
            if (saved?.item?._id) {
              counts[saved.item._id] = await fetchLikeCount(saved.item._id);
            }
          })
        );
        setLikeCounts(counts);
      } catch (err) {
        console.log("Failed to load likes for saved items", err);
      }
    };
    loadLikes();
  }, [savedItems, activeTab]);

  const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=User&background=random';
  const isFetchingRef = React.useRef(false);

  // Fetch user profile and wardrobes data
  const fetchProfileData = async (showLoading = false) => {
    try {
      if (showLoading && !userData) {
        setLoading(true);
      }
      const authToken = token || (await storage.getItem("token"));
      if (!authToken) return;

      // Parallel fetch for user info, wardrobes, and items
      const [userResponse, wardrobesResponse, itemsResponse] = await Promise.all([
        api.get("/api/user/me", {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        api.get("/api/wardrobe/list", {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        api.get("/api/wardrobe/my", {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      const user = userResponse.data;

      // Check if the user is blocked
      if (user.status === "blocked" || user.status === "suspended") {
        setBlocked(true);
        setUser(null);
        return;
      }

      setUser(user);

      // Fetch followers & following counts concurrently
      const followCountRes = await api.get(`/api/follow/counts/${user._id}`).catch(() => ({
        data: { followers: 0, following: 0 },
      }));
      const followers = followCountRes.data?.followers || 0;
      const following = followCountRes.data?.following || 0;
      setFollowersCount(followers);
      setFollowingCount(following);

      // Process wardrobe items
      let allItems: WardrobeItem[] = [];
      let totalWorth = 0;

      if (Array.isArray(itemsResponse.data)) {
        allItems = itemsResponse.data;
        setWardrobeItems(allItems);
        setTotalItems(allItems.length);

        // Calculate total collection worth
        totalWorth = allItems.reduce((sum, item) => {
          const price = parseFloat(String(item.price)) || 0;
          return sum + price;
        }, 0);
      }

      // Process wardrobe collections data
      let wardrobesList: Wardrobe[] = [];
      if (wardrobesResponse.data?.wardrobes) {
        wardrobesList = wardrobesResponse.data.wardrobes;
        setWardrobes(wardrobesList);

        const sortedByDate = [...wardrobesList].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRecentWardrobes(sortedByDate.slice(0, 3));
      }

      // Format collection worth
      const formattedWorth = formatPrice(totalWorth);

      // Extract user data
      const userName = user.username || "User";
      const userHandle = user.email ? `@${user.email.split('@')[0]}` : `@${user.username || "user"}`;
      const userBio = user.bio || createUserBio(user);

      // Set user data
      setUserData({
        name: userName,
        handle: userHandle,
        bio: userBio,
        collectionWorth: formattedWorth,
        followers: formatNumber(followers),
        wardrobeCount: wardrobesList.length,
      });

    } catch (error: any) {
      console.error("Error fetching profile data:", error);

      // If the API returns 403, treat as blocked (regardless of message)
      if (error.response?.status === 403) {
        setBlocked(true);
        setUser(null);
      } else if (!userData) {
        // Fallback only if no profile data has ever loaded
        setUserData({
          name: "John Doe",
          handle: "@johndoe",
          bio: "Fashion enthusiast | Style curator",
          collectionWorth: "₹0",
          followers: "0",
          wardrobeCount: 0,
        });
        setWardrobes([]);
        setRecentWardrobes([]);
        setWardrobeItems([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  // Create a bio based on user info
  const createUserBio = (user: User): string => {
    let bioParts = [];
    if (user.gender) {
      bioParts.push(`${user.gender} fashion enthusiast`);
    } else {
      bioParts.push("Fashion enthusiast");
    }
    bioParts.push("Style curator");
    return bioParts.join(" | ");
  };

  // Helper function to format price
  const formatPrice = (price: number): string => {
    if (price >= 100000) {
      return `₹${(price / 100000).toFixed(1)}L`;
    } else if (price >= 1000) {
      return `₹${(price / 1000).toFixed(1)}K`;
    }
    return `₹${price}`;
  };

  // Helper function to format numbers with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    if (!name || name.trim() === "") return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  useFocusEffect(
    useCallback(() => {
      if (!isLoading && isAuthenticated) {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        const isInitial = !userData;
        Promise.allSettled([
          fetchProfileData(isInitial),
          fetchMatchedPairs(),
          fetchSavedItems(),
          fetchPendingPremiumCount(),
        ]).finally(() => {
          isFetchingRef.current = false;
        });
      }
    }, [isLoading, isAuthenticated, token, userData === null])
  );

  const onRefresh = () => {
    setRefreshing(true);
    Promise.allSettled([
      fetchProfileData(false),
      fetchMatchedPairs(),
      fetchSavedItems(),
      fetchPendingPremiumCount(),
    ]).finally(() => {
      setRefreshing(false);
    });
  };

  const handleWardrobePress = (wardrobe: Wardrobe) => {
    router.push(`/wardrobe/${wardrobe._id}?name=${encodeURIComponent(wardrobe.name)}`);
  };

  const handleAllWardrobesPress = () => {
    router.push("/wardrobe/all");
  };

  const handleAllWardrobeItemsPress = () => {
    router.push("/wardrobe/items");
  };


  const handlePremiumWardrobePress = () => {
    router.push({
      pathname: "/wardrobe/premium",
      params: {
        userId: user?._id,   // ✅ REQUIRED
      },
    });
  };

  const handleAddWardrobe = () => {
    router.push("/profile/create-wardrobe");
  };

  const handleEditProfile = () => {
    router.push("/profile/edit-profile");
  };

  const handleAddStory = () => {
    console.log("Add story pressed");
  };

  const handleSettingsPress = () => {
    setSettingsModalVisible(true);
  };

  const handleCloseSettings = () => {
    setSettingsModalVisible(false);
  };

  const handleLogout = async () => {
    try {
      setSettingsModalVisible(false);
      resetSaved();
      clearFollowing();
      await logout();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleNavigateToSettings = () => {
    setSettingsModalVisible(false);
    router.push("/settings");
  };

  const handleNavigateToHelp = () => {
    setSettingsModalVisible(false);
    router.push("/help");
  };
useEffect(() => {
  if (blocked) {
    router.replace('/blocked');
  }
}, [blocked]);
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primaryDark} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }
  const getCoverImage = (items: WardrobeItem[]) => {
    if (!items.length) return null;

    const first = items[0];
    const imagePath = first.images?.[0] || first.imageUrl || null;
    return imagePath ? resolveImageUrl(imagePath) : null;
  };

  const premiumImage = getCoverImage(premiumItems);
  const publicImage = getCoverImage(publicItems);
  const allItemsImage = getCoverImage(allItems);


  return (
    <>
      <AppBackground>
        <ScrollView
          style={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.userCard}>
            <View style={styles.avatarContainer}>
              {user?.photo ? (
                <Image
                  source={{ uri: user?.photo ? resolveImageUrl(user.photo) : DEFAULT_AVATAR }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {getInitials(userData?.name.toUpperCase() || "User")}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.addStoryBtn} onPress={handleAddStory}>
                <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.name}>{userData?.name.toUpperCase() || "User"}</Text>
              <Text style={styles.handle}>{userData?.handle || "@user"}</Text>
              <Text style={styles.bio}>{userData?.bio || "Fashion enthusiast | Style curator"}</Text>
            </View>
          </View>

          <View style={styles.actionButtonsContainer}>
            {/* Premium Requests */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.premiumBtn]}
              onPress={() => router.push("/premium/requests")}
            >
              <Ionicons name="diamond" size={16} color="#fff" />

              {pendingPremiumCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingPremiumCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Edit Profile */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.editBtn]}
              onPress={handleEditProfile}
            >
              <Ionicons name="pencil" size={16} color="#fff" />
            </TouchableOpacity>

            {/* Menu */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.menuBtn]}
              onPress={handleSettingsPress}
            >
              <Ionicons name="ellipsis-horizontal" size={16} color="#fff" />
            </TouchableOpacity>
          </View>


          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{userData?.collectionWorth || "₹0"}</Text>
              <Text style={styles.statLabel}>Collection Worth</Text>
            </View>
            <TouchableOpacity
              style={styles.statBox}
              onPress={() => router.push(`/profile/followers?userId=${user?._id}&tab=followers`)}
            >
              <Text style={styles.statValue}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{userData?.wardrobeCount || 0}</Text>
              <Text style={styles.statLabel}>Wardrobes</Text>
            </View>
          </View>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "myWardrobes" && styles.activeTab]}
              onPress={() => setActiveTab("myWardrobes")}
            >
              <Text style={[styles.tabText, activeTab === "myWardrobes" && styles.activeTabText]}>
                Wardrobes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "matchedPairs" && styles.activeTab]}
              onPress={() => setActiveTab("matchedPairs")}
            >
              <Text style={[styles.tabText, activeTab === "matchedPairs" && styles.activeTabText]}>
                Pairs ({matchedPairs.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "savedItems" && styles.activeTab]}
              onPress={() => setActiveTab("savedItems")}
            >
              <Text style={[styles.tabText, activeTab === "savedItems" && styles.activeTabText]}>
                Saved ({savedItems.length})
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "myWardrobes" && (
            <View style={styles.contentContainer}>
              <View style={styles.actionsTopRow}>
                <TouchableOpacity style={styles.addWardrobeBtn} onPress={handleAddWardrobe}>
                  <Ionicons name="add" size={18} color={theme.colors.primaryDark} style={{ marginRight: 4 }} />
                  <Text style={styles.addWardrobeText}>New Wardrobe</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.matchPairActionBtn}
                  onPress={() => router.push("/outfit/match-pair")}
                >
                  <Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.matchPairActionText}>Match Pair</Text>
                </TouchableOpacity>
              </View>

              {/* Box-shaped Wardrobes Grid */}
              <View style={styles.boxGrid}>
                {/* PREMIUM ITEMS */}
                <BoxWardrobeCard
                  title="Premium Items"
                  subtitle={`${premiumItems.length} items • ${formatPrice(premiumWorth)}`}
                  badge="Premium"
                  image={premiumImage}
                  onPress={handlePremiumWardrobePress}
                />



                {/* ALL ITEMS */}
                <BoxWardrobeCard
                  title="All Items"
                  subtitle={`${allItems.length} items • ${formatPrice(allItemsWorth)}`}
                  image={allItemsImage}
                  onPress={handleAllWardrobeItemsPress}
                />
              </View>


              {/* Regular Wardrobes List */}
              {recentWardrobes.map((wardrobe) => {
                const isSelected = selectedWardrobeIds.includes(wardrobe._id);
                return (
                  <TouchableOpacity
                    key={wardrobe._id}
                    style={[styles.wardrobeCard, isSelected && { borderWidth: 2, borderColor: theme.colors.primaryDark }]}
                    onPress={() => wardrobeSelectionMode ? toggleWardrobeSelect(wardrobe._id) : handleWardrobePress(wardrobe)}
                    onLongPress={() => {
                      if (!wardrobeSelectionMode) {
                        setSelectedWardrobeIds([wardrobe._id]);
                      }
                    }}
                  >
                    <View style={styles.imagesRow}>
                      {(() => {
                        const coverImage = wardrobe.coverImage || getWardrobeCoverImage(wardrobe._id);
                        return coverImage ? (
                          <View style={styles.imageWrapper}>
                            <Image source={{ uri: coverImage }} style={styles.wardrobeImage} resizeMode="cover" />
                            <View style={styles.imageOverlay} />
                          </View>
                        ) : (
                          <View style={[styles.wardrobeColor, { backgroundColor: wardrobe.color || theme.colors.primaryDark }]} />
                        );
                      })()}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.wardrobeName}>{wardrobe.name}</Text>
                      <Text style={styles.itemsCount}>{wardrobe.itemCount || 0} items</Text>
                    </View>
                    <View>
                      <Text style={styles.wardrobePrice}>{formatPrice(wardrobe.totalWorth || 0)}</Text>
                    </View>
                    {wardrobeSelectionMode ? (
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={22}
                        color={theme.colors.primaryDark}
                      />
                    ) : (
                      <Ionicons name="chevron-forward-outline" size={24} color={theme.colors.textPrimary} />
                    )}
                  </TouchableOpacity>
                );
              })}

              {wardrobeSelectionMode && (
                <View style={styles.selectionBar}>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    {selectedWardrobeIds.length === 1 && selectedWardrobe && (
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: "/profile/create-wardrobe",
                            params: {
                              id: selectedWardrobe._id,
                              name: selectedWardrobe.name,
                              color: selectedWardrobe.color,
                            },
                          })
                        }
                      >
                        <Ionicons name="create-outline" size={20} color={theme.colors.primaryDark} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={confirmWardrobeDelete}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={cancelWardrobeSelection}>
                    <Ionicons name="close-outline" size={22} color="#585858ff" />
                  </TouchableOpacity>
                </View>
              )}

              {wardrobes.length > 3 && (
                <TouchableOpacity style={styles.moreWardrobesContainer} onPress={handleAllWardrobesPress}>
                  <Text style={styles.moreWardrobesText}>+{wardrobes.length - 3} more wardrobes</Text>
                </TouchableOpacity>
              )}
              {wardrobes.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="folder-outline" size={48} color={theme.colors.primary} />
                  <Text style={styles.emptyStateText}>No wardrobes yet</Text>
                  <Text style={styles.emptyStateSubText}>
                    Create your first wardrobe to organize your items
                  </Text>
                </View>
              )}
            </View>
          )}

          {activeTab === "matchedPairs" && (
            <View style={styles.contentContainer}>
              {/* Studio Launch Banner (Matches User Screenshot) */}
              <TouchableOpacity
                style={styles.pairStudioBanner}
                onPress={() => router.push("/outfit/match-pair")}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={["#581C87", "#7E22CE", "#9333EA"]}
                  start={{ x: 0, y: 0.1 }}
                  end={{ x: 1, y: 0.85 }}
                  style={styles.pairStudioBannerGradient}
                >
                  {/* Decorative background subtle glow */}
                  <View style={styles.bannerWaveShape} pointerEvents="none" />

                  {/* Left 3D clothes rack illustration */}
                  <Image
                    source={require("@/assets/images/create_pair_banner.png")}
                    style={styles.bannerClothesImage}
                    resizeMode="contain"
                  />

                  {/* Middle Text info */}
                  <View style={styles.bannerTextContainer}>
                    <Text style={styles.bannerTitle}>Create New Pair</Text>
                    <Text style={styles.bannerSubtitle}>
                      Mix & match shirts, pants and accessories on the interactive canvas studio
                    </Text>
                  </View>

                  {/* Right circular arrow button */}
                  <View style={styles.bannerArrowCircle}>
                    <Ionicons name="chevron-forward" size={19} color="#7E22CE" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {matchedPairs.length === 0 ? (
                <View style={styles.emptyPairsCard}>
                  <Ionicons name="sparkles-outline" size={48} color={theme.colors.primaryDark} />
                  <Text style={styles.emptyPairsTitle}>No Matched Pairs Yet</Text>
                  <Text style={styles.emptyPairsSubtitle}>
                    Combine your shirts, pants and shoes on the interactive studio canvas!
                  </Text>
                  <TouchableOpacity
                    style={styles.startPairingBtn}
                    onPress={() => router.push("/outfit/match-pair")}
                  >
                    <Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.startPairingBtnText}>Open Match Studio</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.pairsList}>
                  {matchedPairs.map((pair) => (
                    <TouchableOpacity
                      key={pair._id}
                      style={styles.pairCard}
                      onPress={() =>
                        router.push({
                          pathname: "/outfit/match-pair",
                          params: { outfitId: pair._id },
                        })
                      }
                      activeOpacity={0.88}
                    >
                      {/* Pair Card Header */}
                      <View style={styles.pairCardHeader}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.pairCardTitle} numberOfLines={1}>
                            {pair.name || "Untitled Pair"}
                          </Text>
                          <Text style={styles.pairCardDate}>
                            {new Date(pair.createdAt).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            • {pair.items?.length || 0} items
                          </Text>
                        </View>

                        <View style={styles.pairHeaderActionsRow}>
                          {/* Edit / View in Canvas */}
                          <TouchableOpacity
                            style={styles.pairSettingsBtn}
                            onPress={() =>
                              router.push({
                                pathname: "/outfit/match-pair",
                                params: { outfitId: pair._id },
                              })
                            }
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="settings-outline" size={17} color="#6D28D9" />
                          </TouchableOpacity>

                          {/* Delete Pair */}
                          <TouchableOpacity
                            style={styles.pairDeleteBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              deleteMatchedPair(pair._id);
                            }}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="trash-outline" size={17} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Garments horizontal preview row with (+) connectors */}
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.pairGarmentsRow}
                      >
                        {pair.items?.map((itemSlot: any, idx: number) => {
                          const garment = itemSlot.item || {};
                          const imgUri =
                            garment.cutoutImage ||
                            garment.images?.[0] ||
                            garment.imageUrl ||
                            garment.image;

                          return (
                            <React.Fragment key={idx}>
                              <View style={styles.pairGarmentThumbWrapper}>
                                {imgUri ? (
                                  <Image
                                    source={{ uri: resolveImageUrl(imgUri) }}
                                    style={styles.pairGarmentThumb}
                                    resizeMode="contain"
                                  />
                                ) : (
                                  <View style={styles.pairGarmentThumbPlaceholder}>
                                    <Ionicons name="shirt-outline" size={24} color="#94A3B8" />
                                  </View>
                                )}
                              </View>

                              {idx < (pair.items?.length || 0) - 1 && (
                                <View style={styles.pairInlinePlusBadge}>
                                  <Ionicons name="add" size={13} color="#FFFFFF" />
                                </View>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </ScrollView>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {activeTab === "savedItems" && (
            <View style={styles.contentContainer}>
              <View style={styles.savedContainer}>
                <View style={styles.savedHeader}>
                  <Text style={styles.savedCount}>{savedItems.length} saved items</Text>
                  <TouchableOpacity style={styles.sortButton}>
                    <Text style={styles.sortButtonText}>Sort by</Text>
                    <Ionicons name="chevron-down" size={16} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                {savedItems.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="bookmark-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyStateText}>No saved items yet</Text>
                    <Text style={styles.emptyStateSubText}>Items you save will appear here</Text>
                  </View>
                ) : (
                  <View style={styles.savedGrid}>
                    {savedItems.map((saved) => {
                      if (!saved.item) return null;
                      const imagePath =
                        (saved.item.images?.length && saved.item.images[0]) ||
                        saved.item.cutoutImage ||
                        saved.item.imageUrl ||
                        saved.item.image;
                      const itemData = {
                        _id: saved.item._id,
                        name: saved.item.name || "Item",
                        brand: saved.item.brand || saved.item.user?.username || "Brand",
                        price: saved.item.price || 0,
                        likes: likeCounts[saved.item._id] || 0,
                        imageUrl: resolveImageUrl(imagePath) || "",
                      };
                      return (
                        <View key={saved._id} style={styles.savedGridItem}>
                          <SavedGridCard
                            item={itemData}
                            onPress={() => router.push(`/wardrobe/item/${itemData._id}`)}
                          />
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        <Modal
          animationType="slide"
          transparent={true}
          visible={settingsModalVisible}
          onRequestClose={handleCloseSettings}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleCloseSettings}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.modalItem} onPress={handleNavigateToSettings}>
                <Ionicons name="settings-outline" size={20} color="#666" />
                <Text style={styles.modalItemText}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalItem} onPress={handleNavigateToHelp}>
                <Ionicons name="help-circle-outline" size={20} color="#666" />
                <Text style={styles.modalItemText}>Help & Support</Text>
              </TouchableOpacity>
              <View style={styles.modalDivider} />
              <TouchableOpacity style={[styles.modalItem, styles.logoutItem]} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text style={[styles.modalItemText, styles.logoutText]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </AppBackground>
    </>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      paddingTop: 0
    },
    selectionBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      marginTop: 12,
      color: theme.colors.textSecondary,
      fontSize: 16,
    },
    userCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 20,
    },
    avatarContainer: {
      position: "relative",
    },
    imageWrapper: {
      width: 40,
      height: 40,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: "#1a2c50ff",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 4,
    },
    wardrobeImage: {
      width: "100%",
      height: "100%",
    },
    imageOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "#ffffff3f",
    },
    avatar: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: theme.colors.border
    },
    avatarImage: {
      width: 70,
      height: 70,
      borderRadius: 35,
      borderWidth: 2,
      borderColor: theme.colors.border
    },
    avatarText: {
      color: theme.colors.textPrimary,
      fontWeight: "700",
      fontSize: 24
    },
    addStoryBtn: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: "center",
      alignItems: "center",
    },

    actionButtonsContainer: {
      position: "absolute",
      top: 16,
      right: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    actionBtn: {
      width: 28,
      height: 28,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,

    },

    premiumBtn: {
      backgroundColor: theme.colors.primary,// or gold: "#F59E0B"
    },

    editBtn: {
      backgroundColor: theme.colors.primary,
    },

    menuBtn: {
      backgroundColor: theme.colors.primary,
    },


    name: {
      fontWeight: "700",
      fontSize: 17,
      marginBottom: 4,
      maxWidth: "60%",
    },
    handle: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      marginBottom: 8,
    },
    bio: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 20,
      marginTop: 10,
      paddingHorizontal: 10,
    },
    statBox: {
      alignItems: "center",
      flex: 1,
    },
    statValue: {
      fontWeight: "700",
      fontSize: 18,
      marginBottom: 4,
      color: theme.colors.textPrimary,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: "500",
    },
    tabRow: {
      flexDirection: "row",
      marginBottom: 20,
      marginTop: 10,
      backgroundColor: theme.colors.surface,
      borderRadius: 30,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 30,
      alignItems: "center",
    },
    activeTab: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      fontWeight: "600",
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
    activeTabText: {
      color: "#FFFFFF",
      fontWeight: "700",
    },
    contentContainer: {
      marginBottom: 20,
    },
    actionsTopRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      gap: 10,
    },
    addWardrobeBtn: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.colors.middary,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 8,
      backgroundColor: theme.colors.surface,
    },
    addWardrobeText: {
      color: theme.colors.primaryDark,
      fontWeight: "700",
      fontSize: 13,
    },
    matchPairActionBtn: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.primaryDark,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 8,
      shadowColor: theme.colors.primaryDark,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    matchPairActionText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 13,
    },
    pairStudioBanner: {
      borderRadius: 24,
      marginBottom: 16,
      overflow: "hidden",
      shadowColor: "#6B21A8",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 8,
      elevation: 4,
    },
    pairStudioBannerGradient: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 24,
      position: "relative",
      overflow: "hidden",
    },
    bannerWaveShape: {
      position: "absolute",
      right: -30,
      bottom: -45,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: "rgba(255, 255, 255, 0.08)",
    },
    bannerClothesImage: {
      width: 82,
      height: 72,
      borderRadius: 12,
    },
    bannerTextContainer: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
    },
    bannerTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#FFFFFF",
      letterSpacing: 0.2,
    },
    bannerSubtitle: {
      fontSize: 11.5,
      color: "rgba(255, 255, 255, 0.88)",
      lineHeight: 16,
      marginTop: 4,
    },
    bannerArrowCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#FFFFFF",
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 3,
    },
    emptyPairsCard: {
      alignItems: "center",
      padding: 36,
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: 6,
    },
    emptyPairsTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginTop: 14,
    },
    emptyPairsSubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: 6,
      lineHeight: 18,
      paddingHorizontal: 10,
    },
    startPairingBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.primaryDark,
      borderRadius: 24,
      paddingVertical: 12,
      paddingHorizontal: 22,
      marginTop: 18,
      shadowColor: theme.colors.primaryDark,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 3,
    },
    startPairingBtnText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 14,
    },
    pairsList: {
      gap: 16,
      marginBottom: 20,
    },
    pairCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    pairCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    pairCardTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.colors.textPrimary,
    },
    pairCardDate: {
      fontSize: 12.5,
      color: theme.colors.textSecondary,
      marginTop: 2,
      fontWeight: "500",
    },
    pairHeaderActionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    pairSettingsBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: "#EDE9FE",
      justifyContent: "center",
      alignItems: "center",
    },
    pairDeleteBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: "#FEE2E2",
      justifyContent: "center",
      alignItems: "center",
    },
    pairGarmentsRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 2,
    },
    pairGarmentThumbWrapper: {
      width: 82,
      height: 82,
      borderRadius: 18,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: "center",
      alignItems: "center",
      padding: 6,
    },
    pairGarmentThumb: {
      width: "100%",
      height: "100%",
    },
    pairGarmentThumbPlaceholder: {
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    pairInlinePlusBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "#6D28D9",
      justifyContent: "center",
      alignItems: "center",
      marginHorizontal: 8,
    },
    // Box grid for Premium and All Items
    boxGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    // Regular wardrobes
    wardrobeCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    imagesRow: {
      flexDirection: "row",
    },
    wardrobeColor: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
    },
    wardrobeName: {
      fontWeight: "700",
      fontSize: 15,
      color: theme.colors.textPrimary,
    },
    itemsCount: {
      color: theme.colors.textSecondary,
      marginTop: 4,
      fontSize: 12,
    },
    wardrobePrice: {
      fontWeight: "700",
      fontSize: 14,
      color: theme.colors.textPrimary,
      marginRight: 6,
    },
    emptyState: {
      alignItems: "center",
      padding: 40,
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 12,
      fontWeight: "600",
    },
    emptyStateSubText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 4,
      textAlign: "center",
    },
    moreWardrobesContainer: {
      alignItems: "center",
      padding: 16,
    },
    moreWardrobesText: {
      color: theme.colors.primaryDark,
      fontWeight: "600",
      fontSize: 14,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: "flex-start",
      alignItems: "flex-end",
      paddingTop: 60,
      paddingRight: 16,
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: 8,
      width: 200,
      elevation: 5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    modalItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    modalItemText: {
      marginLeft: 12,
      fontSize: 16,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    modalDivider: {
      height: 1,
      backgroundColor: "#f0f0f0",
      marginVertical: 4,
    },
    logoutItem: {
      marginTop: 4,
    },
    logoutText: {
      color: "#ef4444",
    },
    savedContainer: {
      flex: 1,
    },
    savedHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingHorizontal: 4,
    },
    savedCount: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sortButtonText: {
      fontSize: 14,
      color: theme.colors.textPrimary,
    },
    savedGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
    },
    savedGridItem: {
      width: '48%',
      marginBottom: 16,
    },
    badge: {
      position: "absolute",
      top: -4,
      right: -4,
      backgroundColor: "#EF4444",
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 4,
    },
    badgeText: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "700",
    },
    blockedMessage: {
      fontSize: 18,
      textAlign: "center",
      color: "red",
      marginTop: 20,
    },
    helpLink: {
      color: "blue",
      textAlign: "center",
      marginTop: 10,
    },
    noAccessMessage: {
      fontSize: 16,
      textAlign: "center",
      marginTop: 20,
      color: "gray",
    },
logoutButton: {
  marginTop: 20,
  paddingVertical: 12,
  paddingHorizontal: 24,
  backgroundColor: theme.colors.primary,
  borderRadius: 8,
  alignSelf: 'center',
},
logoutButtonText: {
  color: '#fff',
  fontWeight: '600',
  fontSize: 16,
},
  });