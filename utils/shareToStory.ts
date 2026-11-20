import api from "@/api/api";
import { Alert } from "react-native";
import { storage } from "@/utils/storage";

export interface ShareToStoryOptions {
  type: "post" | "combo";
  media: string;
  itemId?: string;
  outfitId?: string;
  caption?: string;
  title?: string;
}

/**
 * Directly shares a post or outfit combo to the current user's story.
 */
export const shareToStory = async (options: ShareToStoryOptions): Promise<boolean> => {
  const token = await storage.getItem("token");
  if (!token) {
    Alert.alert("Login Required", "Please log in to share to your story.");
    return false;
  }

  if (!options.media) {
    Alert.alert("Unable to Share", "No media found to share to your story.");
    return false;
  }

  try {
    await api.post("/api/story", {
      media: options.media,
      storyType: options.type,
      itemId: options.itemId,
      outfitId: options.outfitId,
      caption: options.caption || options.title || "",
      duration: 7,
    });

    const label = options.type === "combo" ? "Combo" : "Post";
    Alert.alert(
      "Shared to Story! 🎉",
      `Your ${label} "${options.title || "item"}" has been added to your story for 24 hours.`
    );
    return true;
  } catch (error: any) {
    console.error("Error sharing to story:", error);
    const msg = error.response?.data?.message || "Failed to share to story. Please try again.";
    Alert.alert("Share Failed", msg);
    return false;
  }
};

/**
 * Prompts the user with a confirmation dialog before sharing to story.
 */
export const promptShareToStory = (options: ShareToStoryOptions, onShared?: () => void) => {
  const itemTypeLabel = options.type === "combo" ? "combo" : "post";
  const displayName = options.title ? `"${options.title}"` : `this ${itemTypeLabel}`;

  Alert.alert(
    "Share to Story",
    `Would you like to share ${displayName} to your story?`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Share",
        onPress: async () => {
          const success = await shareToStory(options);
          if (success && onShared) onShared();
        },
      },
    ]
  );
};

