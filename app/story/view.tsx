import AsyncStorage from "@react-native-async-storage/async-storage";
import { storage } from "@/utils/storage";
import { useVideoPlayer, VideoView } from "expo-video";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../../api/api";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const { width, height: screenHeight } = Dimensions.get("window");
const COMBO_CANVAS_HEIGHT = Math.min(screenHeight * 0.54, 460);

function StoryVideo({ uri, paused, style }: { uri: string; paused: boolean; style: any }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    if (paused) {
      player.pause();
    } else {
      player.play();
    }
  }, [paused, player]);

  return (
    <VideoView
      style={style}
      player={player}
      nativeControls={false}
      contentFit="contain"
    />
  );
}

export default function StoryView() {
  const router = useRouter();
  const { index } = useLocalSearchParams();

  // State
  const [groups, setGroups] = useState<any[]>([]);
  const [userIndex, setUserIndex] = useState(Number(index) || 0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [viewersModalVisible, setViewersModalVisible] = useState(false);
  const [viewersList, setViewersList] = useState<any[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  // Load stories and current user ID
useEffect(() => {
  const load = async () => {
    // Decode token to get user ID
    const token = await storage.getItem("token");
    if (token) {
      try {
        // Split the token and decode the payload
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        console.log("📦 Decoded token payload:", payload);
        setCurrentUserId(payload.id); // the payload contains "id"
      } catch (e) {
        console.error("❌ Failed to decode token", e);
      }
    } else {
      console.log("❌ No token found in AsyncStorage");
    }

    // Fetch stories
    const res = await api.get("/api/story");
    console.log("📦 Loaded story groups:", res.data);
    setGroups(res.data);
    setLoading(false);
  };
  load();
}, []);
  // Derived data
  const group = groups[userIndex];
  const story = group?.stories?.[storyIndex];
  const mediaUrl = resolveImageUrl(story?.media);

  const rawComboItems: any[] =
    story?.comboItems && story.comboItems.length > 0
      ? story.comboItems
      : story?.outfit?.items && story.outfit.items.length > 0
        ? story.outfit.items.map((slot: any) => {
            const itm = slot.item || {};
            const img =
              itm.cutoutImage ||
              (Array.isArray(itm.images) ? itm.images[0] : "") ||
              itm.imageUrl ||
              itm.image ||
              "";
            return {
              item: itm,
              image: img,
              x: slot.x,
              y: slot.y,
              scale: slot.scale,
              width: slot.width,
              height: slot.height,
              zIndex: slot.zIndex,
            };
          })
        : [];

  const isComboStory = story?.storyType === "combo" && rawComboItems.length > 0;
  // With this:
  const getOwnerId = (user: any): string | null => {
    if (!user) return null;
    // If user is a plain string (just the ID)
    if (typeof user === 'string') return user;
    // If user is an object, try _id or id
    return user._id || user.id || null;
  };

  const ownerId = getOwnerId(group?.user);
  const isOwner = !!(currentUserId && ownerId && String(currentUserId) === String(ownerId));

  // Enhanced debug
  console.log("🧑 currentUserId:", currentUserId, "type:", typeof currentUserId);
  console.log("👤 group.user:", group?.user, "type:", typeof group?.user);
  console.log("👑 ownerId:", ownerId, "type:", typeof ownerId);
  console.log("🔍 isOwner:", isOwner);
  console.log("📖 story viewers array:", story?.viewers);
  // Mark story as viewed
  useEffect(() => {
    if (story?._id) {
      api.post(`/api/story/${story._id}/view`).catch(() => { });
    }
  }, [story?._id]);

  // Auto advance
  useEffect(() => {
    if (!story || paused) return;
    const timer = setTimeout(goNext, story.duration * 1000);
    return () => clearTimeout(timer);
  }, [storyIndex, userIndex, paused]);

  // Navigation
  const goNext = () => {
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else if (userIndex < groups.length - 1) {
      setUserIndex((u) => u + 1);
      setStoryIndex(0);
    } else {
      router.back();
    }
  };

  const goPrev = () => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (userIndex > 0) {
      const prev = groups[userIndex - 1];
      setUserIndex((u) => u - 1);
      setStoryIndex(prev.stories.length - 1);
    }
  };

  // ----- DELETE (owner only, within 24h) -----
  const confirmDelete = () => {
    const timeDiff = Date.now() - new Date(story.createdAt).getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    if (timeDiff > oneDay) {
      Alert.alert("Cannot delete", "Stories older than 24 hours cannot be deleted.");
      return;
    }

    Alert.alert(
      "Delete Story",
      "This story will be permanently removed.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", onPress: deleteStory, style: "destructive" },
      ]
    );
  };

  const deleteStory = async () => {
    try {
      await api.delete(`/api/story/${story._id}`);
      // Update local state
      const updated = [...groups];
      updated[userIndex].stories.splice(storyIndex, 1);
      if (updated[userIndex].stories.length === 0) {
        updated.splice(userIndex, 1);
      }
      setGroups(updated);
      setStoryIndex(0);
      if (!updated.length) router.back();
    } catch (err) {
      Alert.alert("Error", "Could not delete story.");
    }
  };

  // ----- FETCH VIEWERS (owner only) -----
  const fetchViewers = async () => {
    if (!isOwner || !story?._id) {
      Alert.alert("Only the owner can see viewers");
      return;
    }
    try {
      setLoadingViewers(true);
      console.log("📡 Fetching viewers for story:", story._id);
      const res = await api.get(`/api/story/${story._id}/viewers`);
      console.log("👥 Viewers data:", res.data);
      setViewersList(res.data);
      setViewersModalVisible(true);
    } catch (err: any) {
      console.error("❌ Fetch viewers error:", err.response?.data || err.message);
      Alert.alert("Error", "Could not load viewers.");
    } finally {
      setLoadingViewers(false);
    }
  };

  // ----- SWIPE DOWN TO CLOSE -----
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 20,
    onPanResponderRelease: (_, g) => {
      if (g.dy > 80) router.back();
    },
  });

  // Loading state
  if (loading || !group || !story) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <View style={styles.container} {...panResponder.panHandlers}>
        {/* Progress bar */}
        <View style={styles.progressRow}>
          {group.stories.map((_: any, i: number) => (
            <View
              key={i}
              style={[
                styles.progress,
                i <= storyIndex && styles.progressActive,
              ]}
            />
          ))}
        </View>

        {/* Header: username + 3-dots delete (owner only) */}
        <View style={styles.header}>
          <Text style={styles.username}>{group.user.username}</Text>
          {isOwner && (
            <Pressable onPress={confirmDelete} hitSlop={10}>
              <Ionicons name="ellipsis-horizontal" size={24} color="white" />
            </Pressable>
          )}
        </View>

        {/* Media with tap navigation */}
        <Pressable
          style={styles.touch}
          onPress={(e) =>
            e.nativeEvent.locationX < width / 2 ? goPrev() : goNext()
          }
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
        >
          {isComboStory ? (
            <View style={[styles.comboCanvasContainer, { height: COMBO_CANVAS_HEIGHT }]}>
              {/* Studio Silhouette Guide Watermark */}
              <View style={styles.comboSilhouetteWrapper} pointerEvents="none">
                <Ionicons name="body-outline" size={170} color="#FFFFFF" style={{ opacity: 0.1 }} />
              </View>

              {/* RENDER ALL GARMENTS IN THE COMBO */}
              {rawComboItems.map((slot: any, idx: number) => {
                const rawImg =
                  slot.image ||
                  slot.item?.cutoutImage ||
                  (Array.isArray(slot.item?.images) ? slot.item.images[0] : "") ||
                  slot.item?.imageUrl ||
                  slot.item?.image ||
                  "";
                const imgUri = resolveImageUrl(rawImg);
                if (!imgUri) return null;

                const hasCoordinates = rawComboItems.some(
                  (s: any, i: number) =>
                    (typeof s.y === "number" && s.y > 15) ||
                    (typeof s.x === "number" && s.x > 15 && i > 0)
                );

                const itemScale = slot.scale || 1;
                const baseW = slot.width || 170;
                const baseH = slot.height || 170;
                const w = Math.min(baseW * itemScale, width - 20);
                const h = Math.min(baseH * itemScale, COMBO_CANVAS_HEIGHT - 30);

                let left = 0;
                let top = 0;

                if (hasCoordinates && typeof slot.x === "number" && typeof slot.y === "number") {
                  left = Math.max(10, Math.min(slot.x, width - w - 10));
                  top = Math.max(15, Math.min(slot.y, COMBO_CANVAS_HEIGHT - h - 15));
                } else {
                  left = (width - w) / 2;
                  if (rawComboItems.length === 2) {
                    top = idx === 0 ? 30 : 210;
                  } else if (rawComboItems.length === 3) {
                    top = idx === 0 ? 15 : idx === 1 ? 145 : 275;
                  } else {
                    top = Math.min(idx * 110 + 20, COMBO_CANVAS_HEIGHT - h - 10);
                  }
                }

                const z = slot.zIndex || idx + 1;

                return (
                  <View
                    key={idx}
                    style={{
                      position: "absolute",
                      left,
                      top,
                      width: w,
                      height: h,
                      zIndex: z,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Image
                      source={{ uri: imgUri }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="contain"
                    />
                  </View>
                );
              })}
            </View>
          ) : story.mediaType === "image" ? (
            <Image
              source={{ uri: mediaUrl }}
              style={styles.media}
              resizeMode="contain"
            />
          ) : (
            <StoryVideo uri={mediaUrl || ""} paused={paused} style={styles.media} />
          )}
        </Pressable>

        {/* Post or Combo interactive banner */}
        {story.storyType === "post" && (
          <TouchableOpacity
            style={styles.storySticker}
            onPress={() => {
              const targetId = story.item?._id || story.item;
              if (targetId) {
                router.push(`/wardrobe/item/${targetId}`);
              }
            }}
            activeOpacity={0.85}
          >
            <View style={styles.storyStickerIconWrapper}>
              <Ionicons name="shirt-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.storyStickerTitle} numberOfLines={1}>
                {story.item?.name || story.caption || "View Post"}
              </Text>
              {story.item?.price !== undefined && (
                <Text style={styles.storyStickerSubtitle}>₹{story.item.price}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {story.storyType === "combo" && (
          <TouchableOpacity
            style={styles.storySticker}
            onPress={() => {
              const targetOutfitId = story.outfit?._id || story.outfit;
              if (targetOutfitId) {
                router.push({
                  pathname: "/outfit/match-pair",
                  params: { outfitId: targetOutfitId },
                });
              }
            }}
            activeOpacity={0.85}
          >
            <View style={[styles.storyStickerIconWrapper, { backgroundColor: "#7C3AED" }]}>
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.storyStickerTitle} numberOfLines={1}>
                {story.outfit?.name || story.caption || "View Matched Combo"}
              </Text>
              <Text style={styles.storyStickerSubtitle}>
                {rawComboItems.length > 0 ? `${rawComboItems.length} items in combo • Tap to explore` : "Tap to explore outfit"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Views - clickable only for owner */}
        <TouchableOpacity
          style={styles.viewsContainer}
          onPress={fetchViewers}
          disabled={!isOwner || loadingViewers}
        >
          <Text style={styles.views}>
            👁 {story.viewers?.length || 0} views
            {isOwner && "  •  tap to see who"}
          </Text>
          {loadingViewers && (
            <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 8 }} />
          )}
        </TouchableOpacity>
      </View>

      {/* Viewers Modal */}
      <Modal
        visible={viewersModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setViewersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Story Views</Text>
              <Pressable onPress={() => setViewersModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>

            <FlatList
              data={viewersList}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={styles.viewerItem}>
                  <Image
                    source={{ uri: resolveImageUrl(item.photo) }}
                    style={styles.viewerAvatar}
                  />
                  <Text style={styles.viewerName}>{item.username}</Text>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  No one has viewed this story yet.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  progressRow: {
    flexDirection: "row",
    padding: 6,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  progress: {
    flex: 1,
    height: 3,
    backgroundColor: "#444",
    marginHorizontal: 2,
    borderRadius: 2,
  },
  progressActive: { backgroundColor: "#fff" },
  header: {
    position: "absolute",
    top: 40,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  username: { color: "#fff", fontWeight: "600", fontSize: 16 },
  touch: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  media: { width: "100%", height: "100%", resizeMode: "contain" },
  comboCanvasContainer: {
    width: "100%",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  comboSilhouetteWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  viewsContainer: {
    position: "absolute",
    bottom: 40,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  views: { color: "#fff", fontSize: 14 },
  storySticker: {
    position: "absolute",
    bottom: 84,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    gap: 12,
    zIndex: 10,
  },
  storyStickerIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#A855F7",
    justifyContent: "center",
    alignItems: "center",
  },
  storyStickerTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  storyStickerSubtitle: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
  viewerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  viewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#ddd",
  },
  viewerName: { fontSize: 16, color: "#333", fontWeight: "500" },
  emptyText: { textAlign: "center", padding: 30, color: "#999", fontSize: 16 },
});