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
import { promptShareToStory } from "@/utils/shareToStory";
import AppBackground from "@/components/AppBackground";
import ImagePicker from "react-native-image-crop-picker";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CANVAS_HEIGHT = Math.min(SCREEN_HEIGHT * 0.52, 450);

interface WardrobeItem {
  _id: string;
  images?: string[];
  imageUrl?: string;
  image?: string;
  cutoutImage?: string;
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
  onUpdateScale: (instanceId: string, scale: number) => void;
  onRemove: (instanceId: string) => void;
  primaryColor: string;
}

const DraggableGarment: React.FC<DraggableGarmentProps> = ({
  garment,
  isSelected,
  onSelect,
  onUpdatePosition,
  onUpdateScale,
  onRemove,
  primaryColor,
}) => {
  const pan = useRef(new Animated.ValueXY({ x: garment.x, y: garment.y })).current;
  const scaleAnim = useRef(new Animated.Value(garment.scale)).current;

  // Gesture tracking refs
  const currentScaleRef = useRef(garment.scale);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef(garment.scale);
  const isPinchingRef = useRef(false);

  // Sync pan when x or y prop changes
  useEffect(() => {
    pan.setValue({ x: garment.x, y: garment.y });
  }, [garment.x, garment.y]);

  // Sync scale when garment.scale changes externally (via stepper buttons)
  useEffect(() => {
    scaleAnim.setValue(garment.scale);
    currentScaleRef.current = garment.scale;
  }, [garment.scale]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 1 ||
          Math.abs(gestureState.dy) > 1 ||
          gestureState.numberActiveTouches > 1
        );
      },
      onPanResponderGrant: (evt) => {
        onSelect(garment.instanceId);
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) {
          isPinchingRef.current = true;
          const dist = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY
          );
          initialPinchDistRef.current = dist > 0 ? dist : 1;
          initialScaleRef.current = currentScaleRef.current;
        } else {
          isPinchingRef.current = false;
          initialPinchDistRef.current = null;
          pan.setOffset({
            x: (pan.x as any)._value,
            y: (pan.y as any)._value,
          });
          pan.setValue({ x: 0, y: 0 });
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) {
          // 2-FINGER PINCH-TO-RESIZE
          const currentDist = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY
          );
          if (!isPinchingRef.current || !initialPinchDistRef.current) {
            isPinchingRef.current = true;
            initialPinchDistRef.current = currentDist > 0 ? currentDist : 1;
            initialScaleRef.current = currentScaleRef.current;
          } else if (initialPinchDistRef.current > 0) {
            const factor = currentDist / initialPinchDistRef.current;
            const newScale = Math.min(Math.max(0.4, initialScaleRef.current * factor), 2.5);
            currentScaleRef.current = Number(newScale.toFixed(2));
            scaleAnim.setValue(newScale);
          }
        } else if (touches && touches.length === 1) {
          if (isPinchingRef.current) {
            // User released one finger after pinching: lock in scale and resume dragging
            isPinchingRef.current = false;
            initialPinchDistRef.current = null;
            onUpdateScale(garment.instanceId, currentScaleRef.current);
            pan.setOffset({
              x: (pan.x as any)._value,
              y: (pan.y as any)._value,
            });
            pan.setValue({ x: 0, y: 0 });
          } else {
            // Standard 1-finger drag
            pan.setValue({ x: gestureState.dx, y: gestureState.dy });
          }
        }
      },
      onPanResponderRelease: () => {
        if (isPinchingRef.current) {
          isPinchingRef.current = false;
          initialPinchDistRef.current = null;
          onUpdateScale(garment.instanceId, currentScaleRef.current);
        } else {
          pan.flattenOffset();
          const currentX = (pan.x as any)._value;
          const currentY = (pan.y as any)._value;
          onUpdatePosition(garment.instanceId, currentX, currentY);
        }
      },
      onPanResponderTerminate: () => {
        if (isPinchingRef.current) {
          isPinchingRef.current = false;
          initialPinchDistRef.current = null;
          onUpdateScale(garment.instanceId, currentScaleRef.current);
        } else {
          pan.flattenOffset();
          const currentX = (pan.x as any)._value;
          const currentY = (pan.y as any)._value;
          onUpdatePosition(garment.instanceId, currentX, currentY);
        }
      },
    })
  ).current;

  const rawImg =
    garment.item.cutoutImage ||
    (Array.isArray(garment.item.images) && garment.item.images[0]) ||
    garment.item.imageUrl ||
    garment.item.image ||
    "";
  const imageUri = resolveImageUrl(rawImg);

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.draggableItemContainer,
        {
          transform: [
            ...pan.getTranslateTransform(),
            { scale: scaleAnim },
          ],
          zIndex: garment.zIndex,
          width: garment.width,
          height: garment.height,
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

  // Existing outfit id when editing an existing pair from profile
  const [existingOutfitId, setExistingOutfitId] = useState<string | null>(params?.outfitId || null);

  // User's catalog of uploaded clothes
  const [allItems, setAllItems] = useState<WardrobeItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("All");

  // Save outfit modal state
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [outfitName, setOutfitName] = useState("");
  const [savingOutfit, setSavingOutfit] = useState(false);

  // Magic Outfit Deconstruct & Auto-Pair state
  const [magicModalVisible, setMagicModalVisible] = useState(false);
  const [deconstructing, setDeconstructing] = useState(false);
  const [deconstructImageUri, setDeconstructImageUri] = useState<string | null>(null);
  const [deconstructStep, setDeconstructStep] = useState<string>("Analyzing your outfit with AI...");
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // Animate scanning laser up and down
  useEffect(() => {
    if (deconstructing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnim.setValue(0);
    }
  }, [deconstructing]);

  const handlePickMagicImage = async (useCamera: boolean) => {
    try {
      setMagicModalVisible(false);
      const img = useCamera
        ? await ImagePicker.openCamera({
            width: 1200,
            height: 1600,
            cropping: false,
            compressImageQuality: 0.8,
          })
        : await ImagePicker.openPicker({
            width: 1200,
            height: 1600,
            cropping: false,
            compressImageQuality: 0.8,
          });

      if (!img || !img.path) return;

      setDeconstructImageUri(img.path);
      setDeconstructing(true);
      setDeconstructStep("🔍 Scanning full look with AI...");

      const t1 = setTimeout(() => {
        setDeconstructStep("🤖 Detecting top, bottom & accessories...");
      }, 2500);
      const t2 = setTimeout(() => {
        setDeconstructStep("✂️ Extracting transparent cutouts...");
      }, 5500);
      const t3 = setTimeout(() => {
        setDeconstructStep("🎨 Arranging matched pair on canvas...");
      }, 9000);

      const token = await storage.getItem("token");
      if (!token) {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        setDeconstructing(false);
        Alert.alert("Authentication", "Please login to use Magic Snap.");
        return;
      }

      const formData = new FormData();
      formData.append("image", {
        uri: img.path,
        name: img.filename || `look_${Date.now()}.jpg`,
        type: img.mime || "image/jpeg",
      } as any);

      const res = await api.post("/api/outfits/deconstruct", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        timeout: 120000,
      });

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      if (res.data?.success && Array.isArray(res.data.canvasGarments) && res.data.canvasGarments.length > 0) {
        setCanvasGarments(res.data.canvasGarments);
        setSelectedInstanceId(res.data.canvasGarments[0].instanceId);

        if (Array.isArray(res.data.items) && res.data.items.length > 0) {
          setAllItems((prev) => [...res.data.items, ...prev]);
        }

        setDeconstructing(false);
        setDeconstructImageUri(null);

        Alert.alert(
          "✨ Wow! Outfit Extracted & Paired",
          `Extracted ${res.data.totalExtracted || res.data.canvasGarments.length} items from your photo and arranged them as a pair on your canvas! You can resize, drag, or swap any items.`
        );
      } else {
        setDeconstructing(false);
        setDeconstructImageUri(null);
        Alert.alert("No Clothes Found", "Could not detect distinct clothing items in this photo. Please try a clearer full-body photo.");
      }
    } catch (err: any) {
      setDeconstructing(false);
      setDeconstructImageUri(null);
      if (err.code !== "E_PICKER_CANCELLED") {
        console.error("Magic Deconstruct error:", err);
        Alert.alert("Extraction Failed", err.response?.data?.message || err.message || "Failed to extract outfit. Please try again.");
      }
    }
  };

  // Fetch all user wardrobe items
  useEffect(() => {
    fetchMyClothes();
  }, []);

  // Load existing outfit if restyling from profile
  useEffect(() => {
    if (params?.outfitId) {
      setExistingOutfitId(params.outfitId);
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

      setExistingOutfitId(target._id);
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

  // Synchronize canvas garments with allItems to ensure any cutout updates are reflected
  useEffect(() => {
    if (allItems.length > 0 && canvasGarments.length > 0) {
      setCanvasGarments((prev) =>
        prev.map((g) => {
          const fresh = allItems.find((it) => it._id === (g.item?._id || (g.item as any)));
          if (fresh?.cutoutImage && g.item?.cutoutImage !== fresh.cutoutImage) {
            return {
              ...g,
              item: {
                ...g.item,
                cutoutImage: fresh.cutoutImage,
              },
            };
          }
          return g;
        })
      );
    }
  }, [allItems]);

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

  const handleUpdateScale = (instanceId: string, scale: number) => {
    setCanvasGarments((prev) =>
      prev.map((g) => (g.instanceId === instanceId ? { ...g, scale } : g))
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
          setExistingOutfitId(null);
          setOutfitName("");
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
     REMOVE BACKGROUND & GENERATE TRANSPARENT CUTOUT PNG
  ========================================================= */
  const [generatingCutout, setGeneratingCutout] = useState(false);

  const handleGenerateCutoutForGarment = async (garment: CanvasGarment) => {
    if (!garment || !garment.item?._id) return;
    try {
      setGeneratingCutout(true);
      const token = await storage.getItem("token");
      if (!token) {
        Alert.alert("Authentication", "Please login again.");
        return;
      }

      const res = await api.post(
        `/api/wardrobe/item/${garment.item._id}/cutout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.cutoutImage) {
        const newCutout = res.data.cutoutImage;
        // Update canvas garments with the new cutout
        setCanvasGarments((prev) =>
          prev.map((g) =>
            g.instanceId === garment.instanceId || g.item._id === garment.item._id
              ? { ...g, item: { ...g.item, cutoutImage: newCutout } }
              : g
          )
        );
        // Also update allItems shelf cache
        setAllItems((prev) =>
          prev.map((it) =>
            it._id === garment.item._id ? { ...it, cutoutImage: newCutout } : it
          )
        );
        Alert.alert("Success! ✨", "Background removed! Enjoy your transparent garment cutout.");
      }
    } catch (err: any) {
      console.error("Error generating cutout:", err);
      Alert.alert(
        "Notice",
        err.response?.data?.message || "Could not generate transparent cutout."
      );
    } finally {
      setGeneratingCutout(false);
    }
  };

  const handleGenerateCutoutForSelected = () => {
    if (activeGarment) {
      handleGenerateCutoutForGarment(activeGarment);
    }
  };

  const handleTopRightNoBgPress = () => {
    if (activeGarment) {
      handleGenerateCutoutForGarment(activeGarment);
      return;
    }
    // If no active garment selected, choose the first canvas garment without cutout, or the last one
    const target =
      canvasGarments.find((g) => !g.item.cutoutImage) || canvasGarments[canvasGarments.length - 1];
    if (target) {
      setSelectedInstanceId(target.instanceId);
      handleGenerateCutoutForGarment(target);
    }
  };

  /* =========================================================
     SAVE OUTFIT / MATCHED PAIR
  ========================================================= */
  const handleSaveOutfit = async () => {
    if (canvasGarments.length === 0) {
      Alert.alert("Empty Pair", "Please select at least one garment on the canvas to match a pair.");
      return;
    }

    // Keep existing outfit name if already set, or provide a default
    if (!outfitName || !outfitName.trim()) {
      setOutfitName(`Pair ${new Date().toLocaleDateString()}`);
    }
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
        name: outfitName.trim() || (existingOutfitId ? "My Matched Pair" : `Pair ${new Date().toLocaleDateString()}`),
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

      let res;
      const isUpdating = Boolean(existingOutfitId);

      if (existingOutfitId) {
        // Update existing matched pair in-place!
        res = await api.put(`/api/outfits/${existingOutfitId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create new matched pair
        res = await api.post("/api/outfits", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.outfit?._id) {
          setExistingOutfitId(res.data.outfit._id);
        }
      }

      setSaveModalVisible(false);
      const savedOutfitId = res.data?.outfit?._id || existingOutfitId;
      const outfitTitle = res.data?.outfit?.name || outfitName.trim() || "Matched Pair";

      Alert.alert(
        isUpdating ? "Pair Updated! 🎉" : "Pair Saved! 🎉",
        `"${outfitTitle}" has been ${isUpdating ? "updated" : "saved"} in your wardrobe profile.`,
        [
          {
            text: "Share to Story",
            onPress: () => {
              handleShareCurrentComboToStory(savedOutfitId, outfitTitle);
            },
          },
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

  const handleShareCurrentComboToStory = async (outfitId?: string, title?: string) => {
    if (canvasGarments.length === 0) {
      Alert.alert("Unable to Share", "No garment image found on the canvas to share.");
      return;
    }

    let targetOutfitId = outfitId || existingOutfitId;

    // Collect all garments on canvas with positions and sizes
    const comboItems = canvasGarments.map((g) => {
      const itm = g.item || {};
      const img = itm.cutoutImage || itm.images?.[0] || itm.imageUrl || itm.image || "";
      return {
        itemId: itm._id,
        image: img,
        x: g.x,
        y: g.y,
        width: g.width,
        height: g.height,
        scale: g.scale,
        zIndex: g.zIndex,
      };
    });

    const primaryMedia = comboItems.find((c) => c.image)?.image || "";

    if (!primaryMedia) {
      Alert.alert("Unable to Share", "No garment image found on the canvas to share.");
      return;
    }

    // Auto-save outfit if not yet saved so that outfitId is always valid
    if (!targetOutfitId) {
      try {
        const token = await storage.getItem("token");
        if (token) {
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
          if (res.data?.outfit?._id) {
            targetOutfitId = res.data.outfit._id;
            setExistingOutfitId(targetOutfitId);
          }
        }
      } catch (err) {
        console.log("Auto-save for story sharing:", err);
      }
    }

    promptShareToStory({
      type: "combo",
      media: primaryMedia,
      comboItems,
      outfitId: targetOutfitId || undefined,
      title: title || outfitName.trim() || "Matched Pair",
      caption: title || (outfitName ? outfitName.trim() : "Check out my new outfit combo!"),
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <AppBackground>
        <View style={styles.container}>
          {/* ================= HEADER ================= */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                onPress={() => router.back()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back-outline" size={24} color={colors.textPrimary} />
              </TouchableOpacity>

              <View>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                  {existingOutfitId ? "Edit Matched Pair" : "Match Pair Studio"}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {canvasGarments.length === 0
                    ? "Select items to build a pair"
                    : `${canvasGarments.length} items on canvas`}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TouchableOpacity
                style={[styles.magicSnapBtn, { backgroundColor: "#8B5CF6" }]}
                onPress={() => setMagicModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                <Text style={styles.magicSnapBtnText}>Magic</Text>
              </TouchableOpacity>

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
                <Text
                  style={[
                    styles.saveBtnText,
                    { color: canvasGarments.length > 0 ? "#FFFFFF" : colors.textMuted },
                  ]}
                >
                  {existingOutfitId ? "Update" : "Save Pair"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ================= CANVASS (FITTING ROOM) ================= */}
          <View style={[styles.canvasContainer, { backgroundColor: colors.surface }]}>
            {/* Background tap to deselect */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setSelectedInstanceId(null)}
              style={StyleSheet.absoluteFill}
            />

            {/* Studio Guide Silhouette / Grid Hint */}
            <View style={styles.canvasBackgroundGuide}>
              <Ionicons name="body-outline" size={130} color={colors.border} style={{ opacity: 0.15 }} />
            </View>

            {canvasGarments.length === 0 ? (
              <View style={styles.emptyCanvasNotice} pointerEvents="box-none">
                <Ionicons name="shirt-outline" size={42} color={colors.primary} style={{ opacity: 0.6 }} />
                <Text style={[styles.emptyCanvasTitle, { color: colors.textPrimary }]}>
                  Your Canvas is Empty
                </Text>
                <Text style={[styles.emptyCanvasSub, { color: colors.textMuted }]}>
                  Tap any clothes below, or use Magic Snap to auto-extract an outfit from a photo!
                </Text>
                <TouchableOpacity
                  style={[styles.emptyCanvasMagicBtn, { backgroundColor: "#8B5CF6" }]}
                  onPress={() => setMagicModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                  <Text style={styles.emptyCanvasMagicText}>✨ Auto-Extract Outfit Photo</Text>
                </TouchableOpacity>
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
                onUpdateScale={handleUpdateScale}
                onRemove={handleRemoveGarment}
                primaryColor={colors.primary}
              />
            ))}

            {/* Top-Right "No BG" Floating Action Button on Canvas */}
            <View style={styles.canvasTopRightContainer} pointerEvents="box-none">
              {canvasGarments.length === 0 ? (
                <TouchableOpacity
                  style={[styles.canvasRemoveBgBtnDisabled, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => Alert.alert("No BG", "Add an item onto the canvas first to remove its background.")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="cut-outline" size={13} color={colors.textMuted || "#888"} />
                  <Text style={[styles.canvasRemoveBgTextDisabled, { color: colors.textMuted || "#888" }]}>No BG</Text>
                </TouchableOpacity>
              ) : activeGarment ? (
                activeGarment.item.cutoutImage ? (
                  <View style={styles.canvasCutoutActiveBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.canvasCutoutActiveText}>No BG (PNG)</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.canvasRemoveBgBtn, { backgroundColor: colors.primary || "#4F46E5" }]}
                    onPress={handleGenerateCutoutForSelected}
                    disabled={generatingCutout}
                    activeOpacity={0.8}
                  >
                    {generatingCutout ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.canvasRemoveBgText}>Removing BG...</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Ionicons name="cut" size={13} color="#FFFFFF" />
                        <Text style={styles.canvasRemoveBgText}>No BG</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity
                  style={[styles.canvasRemoveBgBtn, { backgroundColor: colors.primary || "#4F46E5" }]}
                  onPress={handleTopRightNoBgPress}
                  disabled={generatingCutout}
                  activeOpacity={0.8}
                >
                  {generatingCutout ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.canvasRemoveBgText}>Removing BG...</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Ionicons name="cut" size={13} color="#FFFFFF" />
                      <Text style={styles.canvasRemoveBgText}>No BG</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ================= ACTIVE GARMENT ADJUSTMENT BAR ================= */}
          {activeGarment ? (
            <View style={[styles.adjustmentToolbar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.toolTitleRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.toolActiveName, { color: colors.textPrimary }]} numberOfLines={1}>
                    Adjusting: {typeof activeGarment.item.category === "object" ? activeGarment.item.category?.name : activeGarment.item.category || "Item"}
                  </Text>
                  <Text style={[styles.toolGestureHint, { color: colors.textMuted }]}>
                    🤏 Pinch with 2 fingers to resize, or use buttons below
                  </Text>
                </View>
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
                    item.cutoutImage ||
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
                      {item.cutoutImage ? (
                        <View style={styles.cutoutPillShelf}>
                          <Text style={styles.cutoutPillShelfText}>PNG</Text>
                        </View>
                      ) : null}
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
                    {existingOutfitId ? "Update Matched Pair" : "Name Your Matched Pair"}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                    {existingOutfitId
                      ? "Save changes to this pair in your wardrobe profile."
                      : "Save this combination to your wardrobe profile for quick access."}
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
                      <Text style={styles.modalConfirmText}>
                        {existingOutfitId ? "Update Pair" : "Save Pair"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* ================= MAGIC SNAP OPTION MODAL ================= */}
          <Modal
            visible={magicModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setMagicModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.magicModalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.magicModalHeader}>
                  <View style={[styles.magicIconBadge, { backgroundColor: "#8B5CF620" }]}>
                    <Ionicons name="sparkles" size={26} color="#8B5CF6" />
                  </View>
                  <Text style={[styles.magicModalTitle, { color: colors.textPrimary }]}>
                    ✨ Magic Outfit Deconstruct
                  </Text>
                  <Text style={[styles.magicModalSubtitle, { color: colors.textMuted }]}>
                    Snap or upload a full-body picture. Our AI will automatically separate your shirt, pants, shoes & accessories and arrange them on this canvas!
                  </Text>
                </View>

                <View style={styles.magicOptionCardsRow}>
                  {/* Camera Option */}
                  <TouchableOpacity
                    style={[styles.magicOptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handlePickMagicImage(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={30} color="#8B5CF6" />
                    <Text style={[styles.magicOptionCardTitle, { color: colors.textPrimary }]}>Camera</Text>
                    <Text style={[styles.magicOptionCardDesc, { color: colors.textMuted }]}>Take full-body photo</Text>
                  </TouchableOpacity>

                  {/* Gallery Option */}
                  <TouchableOpacity
                    style={[styles.magicOptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handlePickMagicImage(false)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images" size={30} color="#EC4899" />
                    <Text style={[styles.magicOptionCardTitle, { color: colors.textPrimary }]}>Gallery</Text>
                    <Text style={[styles.magicOptionCardDesc, { color: colors.textMuted }]}>Choose from photos</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.magicCloseBtn, { borderColor: colors.border }]}
                  onPress={() => setMagicModalVisible(false)}
                >
                  <Text style={[styles.magicCloseText, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* ================= SCANNING & DECONSTRUCTING PROGRESS MODAL ================= */}
          <Modal
            visible={deconstructing}
            transparent
            animationType="fade"
            onRequestClose={() => {}}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.scanModalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {deconstructImageUri ? (
                  <View style={styles.scanImageContainer}>
                    <Image source={{ uri: deconstructImageUri }} style={styles.scanImagePreview} />
                    {/* Animated laser line */}
                    <Animated.View
                      style={[
                        styles.scanLaser,
                        {
                          transform: [
                            {
                              translateY: scanLineAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 240],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  </View>
                ) : (
                  <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 30 }} />
                )}

                <Text style={[styles.scanStatusTitle, { color: colors.textPrimary }]}>
                  {deconstructStep}
                </Text>
                <Text style={[styles.scanStatusSubtitle, { color: colors.textMuted }]}>
                  Please wait a few seconds while our AI extracts and pairs your outfit...
                </Text>

                <ActivityIndicator size="small" color="#8B5CF6" style={{ marginTop: 16 }} />
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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

  /* Top-Right Canvas Action Button */
  canvasTopRightContainer: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 9999,
    elevation: 8,
  },
  canvasRemoveBgBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  canvasRemoveBgText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  canvasRemoveBgBtnDisabled: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    opacity: 0.8,
  },
  canvasRemoveBgTextDisabled: {
    fontSize: 11,
    fontWeight: "600",
  },
  canvasCutoutActiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.95)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  canvasCutoutActiveText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
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
  },
  toolGestureHint: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: "500",
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
  cutoutPillShelf: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "#10B981",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    zIndex: 10,
  },
  cutoutPillShelfText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#FFFFFF",
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

  /* Magic Snap Button */
  magicSnapBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  magicSnapBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCanvasMagicBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 14,
    gap: 8,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  emptyCanvasMagicText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Magic Option Modal */
  magicModalContent: {
    width: "88%",
    maxWidth: 380,
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  magicModalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  magicIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  magicModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  magicModalSubtitle: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  magicOptionCardsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginBottom: 16,
  },
  magicOptionCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  magicOptionCardTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  magicOptionCardDesc: {
    fontSize: 10,
    textAlign: "center",
  },
  magicCloseBtn: {
    width: "100%",
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
  },
  magicCloseText: {
    fontSize: 13,
    fontWeight: "600",
  },

  /* Scanning / Deconstruct Laser Modal */
  scanModalContent: {
    width: "88%",
    maxWidth: 380,
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  scanImageContainer: {
    width: 200,
    height: 250,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    marginBottom: 18,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  scanImagePreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  scanLaser: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#A855F7",
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  scanStatusTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  scanStatusSubtitle: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});

