import { useTheme } from "@/app/theme/ThemeContext";
import AppBackground from "@/components/AppBackground";
import ItemPostCard from "@/components/ItemPostCard";
import SearchModal from "@/components/SearchModal";
import { onHomeTabPress } from "@/utils/homeScroll";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { storage } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../../api/api";


/* ================= TYPES ================= */
interface StoryGroup {
  user: {
    _id: string;
    username: string;
    photo?: string;
  };
  stories: any[];
}

interface FeedUser {
  _id?: string;
  username: string;
  photo?: string;
}

interface CollectionStats {
  totalWorth: number;
  totalWardrobes: number;
  totalItems: number;
}

interface FeedItem {
  _id: string;
  type: "item" | "wardrobe" | "collection";
  images?: string[];
  imageUrl?: string;
  image?: string;
  user?: FeedUser;
  stats?: CollectionStats;
}

/* ================= HELPERS ================= */
function injectCollections(posts: FeedItem[], collections: FeedItem[]) {
  if (!collections.length) return posts;

  const existingIds = new Set(posts.map(p => p._id));
  const result = [...posts];

  let insertIndex = 2;

  collections.forEach((collection) => {
    if (!existingIds.has(collection._id)) {
      if (insertIndex < result.length) {
        result.splice(insertIndex, 0, collection);
        insertIndex += 4;
      }
    }
  });

  return result;
}

/* ================= COMPONENT ================= */
export default function HomeScreen() {
  const { theme } = useTheme();                         // <-- get current theme
  const colors = theme.colors;
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const isFetchingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const onEndReachedCalledDuringMomentum = useRef(true);
  const rateLimitCooldownUntil = useRef(0);
  const collectionsCache = useRef<FeedItem[]>([]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const LIMIT = 6;

  /* ================= DATA FETCHING ================= */
  const loadStories = async () => {
    try {
      const token = await storage.getItem("token");
      if (!token) return;

      const res = await api.get("/api/story", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("📱 Stories loaded:", JSON.stringify(res.data, null, 2));
      setStories(res.data);
    } catch (err) {
      console.error("Story load error:", err);
    }
  };

  const loadMe = async () => {
    try {
      const token = await storage.getItem("token");
      if (!token) return;

      const res = await api.get("/api/user/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCurrentUserId(res.data._id);
      setCurrentUser(res.data);
    } catch (err) {
      console.error("User me error:", err);
    }
  };

  const loadNotificationsCount = async () => {
    try {
      const token = await storage.getItem("token");
      if (!token) return;

      const res = await api.get("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error("Notification count error:", err);
    }
  };

  /* ================= LOAD FEED ================= */
  const loadFeed = async (reset = false) => {
    // 1. Guard against 429 rate limit cooldown
    if (Date.now() < rateLimitCooldownUntil.current) {
      console.log("⏳ Rate-limit cooldown active. Skipping feed request.");
      return;
    }

    // 2. Synchronous in-flight lock to prevent duplicate parallel fetches
    if (isFetchingRef.current) return;
    if (!reset && !hasMoreRef.current) return;

    isFetchingRef.current = true;
    if (reset) {
      pageRef.current = 1;
      hasMoreRef.current = true;
    }

    const targetPage = reset ? 1 : pageRef.current;

    try {
      setLoading(true);

      const requests: Promise<any>[] = [
        api.get(`/api/feed/public?page=${targetPage}&limit=${LIMIT}`),
      ];

      // Only fetch collections on initial load/reset, not on every page pagination
      if (reset || collectionsCache.current.length === 0) {
        requests.push(api.get(`/api/feed/collections`).catch(() => ({ data: [] })));
      }

      const [publicRes, collectionRes] = await Promise.all(requests);

      const publicItems: FeedItem[] = publicRes.data?.items || [];
      if (collectionRes && Array.isArray(collectionRes.data)) {
        collectionsCache.current = collectionRes.data;
      }
      const collections: FeedItem[] = collectionsCache.current;

      // Filter out posts from blocked users
      let blockedIds = new Set<string>();
      try {
        const rawBlocked = await storage.getItem("blocked_users_list");
        if (rawBlocked) {
          const list = JSON.parse(rawBlocked);
          if (Array.isArray(list)) {
            list.forEach((u: any) => {
              if (u.id) blockedIds.add(String(u.id));
              if (u.username) blockedIds.add(String(u.username).toLowerCase());
            });
          }
        }
      } catch (_) {}

      const filteredPublic = publicItems.filter((item) => {
        const authorId = item.user?._id || (item as any).userId;
        const authorName = item.user?.username ? String(item.user.username).toLowerCase() : "";
        if (authorId && blockedIds.has(String(authorId))) return false;
        if (authorName && blockedIds.has(authorName)) return false;
        return true;
      });

      const processedPublic = filteredPublic.map((item) => ({
        ...item,
        images: item.images && item.images.length
          ? item.images
          : item.imageUrl
            ? [item.imageUrl]
            : item.image
              ? [item.image]
              : [],
      }));

      const merged = injectCollections(processedPublic, collections);
      setFeed(prev => {
        const combined = reset ? merged : [...prev, ...merged];

        const map = new Map();
        combined.forEach(item => {
          map.set(item._id, item);
        });

        return Array.from(map.values());
      });

      const hasMoreItems = publicItems.length === LIMIT;
      hasMoreRef.current = hasMoreItems;
      setHasMore(hasMoreItems);

      if (hasMoreItems) {
        pageRef.current = targetPage + 1;
        setPage(targetPage + 1);
      }
    } catch (err: any) {
      console.error("Feed load error:", err);
      if (err?.response?.status === 429) {
        // Enforce 6s cooldown on 429
        rateLimitCooldownUntil.current = Date.now() + 6000;
        console.warn("⚠️ HTTP 429 detected. 6s cooldown active.");
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  /* ================= REFRESH ================= */
  const handleRefresh = async () => {
    setRefreshing(true);
    setHasMore(true);
    await Promise.allSettled([
      loadFeed(true),
      loadStories(),
      loadNotificationsCount(),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    const unsubscribe = onHomeTabPress(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      handleRefresh();
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    loadFeed(true);
    loadStories();
    loadMe();
    loadNotificationsCount();
  }, []);

  /* ================= RENDER POST ================= */
  const renderPost = ({ item }: { item: FeedItem }) => {
    if (item.type === "item") {
      return (
        <ItemPostCard
          item={item}
          currentUserId={currentUserId || undefined}
          currentUser={currentUser}
          key={`item-${item._id}`}
          onDelete={(deletedId: string) => {
            setFeed(prev => prev.filter(i => i._id !== deletedId));
          }}
        />
      );
    }
    return null;
  };

  /* ================= STORY UTILITIES ================= */
  const getStoryCoverImage = (storyGroup: StoryGroup) => {
    if (storyGroup.stories && storyGroup.stories.length > 0) {
      return resolveImageUrl(storyGroup.stories[0].media);
    }
    return null;
  };

  const getUserPhotoUrl = (photoPath?: string) => {
    return photoPath ? resolveImageUrl(photoPath) : null;
  };


  /* ================= HEADER ================= */
  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.logoText}>
          <Text style={styles.logoHighlight}>D</Text>
          <Text style={styles.logoHighlight2}>W</Text>
        </Text>

        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => setShowSearch(true)}>
            <Image
              source={require("../../assets/icons/search.png")}
              style={styles.headerIcon}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginLeft: 16 }}
            onPress={() => router.push("/notifications")}
          >
            <Image
              source={require("../../assets/icons/bell.png")}
              style={styles.headerIcon}
            />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Stories Section */}
      <View style={styles.storiesContainer}>
        {/* Add Story Button - SAME SIZE AS USER STORIES */}
        <TouchableOpacity
          style={styles.storyCard}
          onPress={() => router.push("/story/add")}
        >
          <View style={styles.addStoryWrapper}>
            <View style={styles.addStoryInner}>
              <Ionicons name="add" size={26} color={colors.primaryDark} />
            </View>
          </View>
          <Text style={styles.storyName}>Add Story</Text>
        </TouchableOpacity>

        {/* User Stories */}
        {stories.map((group, index) => {
          const coverImage = getStoryCoverImage(group);
          const userPhotoUrl = getUserPhotoUrl(group.user.photo);

          return (
            <TouchableOpacity
              key={`${group.user._id}-${index}`}
              style={styles.storyCard}
              onPress={() =>
                router.push({
                  pathname: "/story/view",
                  params: { index },
                })
              }
            >
              <View style={styles.userStoryWrapper}>
                {/* Story Image Container */}
                <View style={styles.storyImageContainer}>
                  {coverImage ? (
                    <Image
                      source={{ uri: coverImage }}
                      style={styles.storyImage}
                    />
                  ) : userPhotoUrl ? (
                    <Image
                      source={{ uri: userPhotoUrl }}
                      style={styles.storyImage}
                    />
                  ) : (
                    <View style={styles.storyFallback}>
                      <Text style={styles.storyInitial}>
                        {group.user.username[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.storyName} numberOfLines={1}>
                {group.user.username}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  return (
    <AppBackground>
      <FlatList
        ref={flatListRef}
        data={feed}
      keyExtractor={(item) => item._id} 
        renderItem={renderPost}
        ListHeaderComponent={renderHeader}
        onEndReached={() => {
          if (!onEndReachedCalledDuringMomentum.current) {
            loadFeed();
            onEndReachedCalledDuringMomentum.current = true;
          }
        }}
        onEndReachedThreshold={0.2}
        onMomentumScrollBegin={() => {
          onEndReachedCalledDuringMomentum.current = false;
        }}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator
              size="small"
              color="#A855F7"
              style={{ marginVertical: 20 }}
            />
          ) : null
        }
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      />
      <SearchModal
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onSearch={(query) => {
          setShowSearch(false);
          router.push({ pathname: "/explore", params: { q: query } });
        }}
      />
    </AppBackground>
  );
}

/* ================= STYLES ================= */
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
    },
    headerIcon: {
      width: 24,
      height: 24,
      resizeMode: "contain",
      tintColor: colors.textDark, // icons are PNGs, but if they are vector-like we can tint
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    logoText: {
      fontSize: 22,
    },
    logoHighlight: {
      fontSize: 35,
      color: colors.primary,
      fontFamily: "Cookie",
    },
    logoHighlight2: {
      fontFamily: "Cookie",
      fontSize: 35,
      color: colors.textDark, // second part of logo uses text color
    },
    headerIcons: {
      flexDirection: "row",
    },
    storiesContainer: {
      marginTop: 5,
      flexDirection: "row",
      paddingVertical: 8,
    },
    storyCard: {
      alignItems: "center",
      marginRight: 12,
      width: 72,
    },
    // Add Story Styles - Square
    addStoryWrapper: {
      width: 64,
      height: 84,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    addStoryInner: {
      width: 56,
      height: 78,
      borderRadius: 12,
      backgroundColor: colors.card, // slightly different from surface for depth
      justifyContent: "center",
      alignItems: "center",
    },
    // User Story Styles - Square
    userStoryWrapper: {
      width: 64,
      height: 84,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    storyImageContainer: {
      width: "100%",
      height: "100%",
      borderRadius: 12,
      overflow: "hidden",
    },
    storyImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    storyFallback: {
      width: "100%",
      height: "100%",
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    storyInitial: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.primaryDark, // dark text on primary background for contrast
    },
    storyName: {
      marginTop: 6,
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: "center",
      width: 64,
    },
    badge: {
      position: "absolute",
      top: -6,
      right: -6,
      backgroundColor: colors.primary,
      width: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.surface,
    },
    badgeText: {
      color: "#FFFFFF",
      fontSize: 9,
      fontWeight: "700",
    },
  });