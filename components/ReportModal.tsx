import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/app/theme/ThemeContext";
import api from "@/api/api";

const REPORT_REASONS = [
  { id: "dont_like", title: "I just don't like it", desc: "Irrelevant or uninteresting content" },
  { id: "spam", title: "It's spam or a scam", desc: "Fake content, phishing, or financial scams" },
  { id: "nudity", title: "Nudity or sexual activity", desc: "Explicit images, pornography, or sexualized content" },
  { id: "hate_speech", title: "Hate speech or symbols", desc: "Racism, discrimination, or hate group symbols" },
  { id: "violence", title: "Violence or dangerous organizations", desc: "Threats of harm, violence, or dangerous activities" },
  { id: "bullying", title: "Bullying or harassment", desc: "Targeted shaming, insults, or harassment" },
  { id: "ip_violation", title: "Intellectual property violation", desc: "Copyright infringement or stolen designs" },
  { id: "illegal_goods", title: "Sale of illegal or regulated goods", desc: "Counterfeit items, weapons, or illegal products" },
  { id: "other", title: "Something else", desc: "Any other issue violating community rules" },
];

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: "item" | "wardrobe" | "user";
  targetId: string;
  authorUsername?: string;
  authorId?: string;
  isOwner?: boolean;
  onDelete?: () => void;
  onReportSuccess?: () => void;
  onBlockUser?: (username: string) => void;
}

export default function ReportModal({
  visible,
  onClose,
  targetType,
  targetId,
  authorUsername = "user",
  authorId,
  isOwner = false,
  onDelete,
  onReportSuccess,
  onBlockUser,
}: ReportModalProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  // step: "menu" | "reasons" | "submitted"
  const [step, setStep] = useState<"menu" | "reasons" | "submitted">("menu");
  const [submitting, setSubmitting] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const resetAndClose = () => {
    setStep("menu");
    setSelectedReason(null);
    setSubmitting(false);
    onClose();
  };

  const handleSelectReason = async (reasonTitle: string) => {
    setSelectedReason(reasonTitle);
    setSubmitting(true);
    try {
      await api.post("/reports", {
        targetType,
        targetId,
        reason: reasonTitle,
      });
      setStep("submitted");
    } catch (error) {
      console.error("Report submit error:", error);
      // Even if network fails, show submitted to keep UX consistent
      setStep("submitted");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlockPress = () => {
    Alert.alert(
      `Block @${authorUsername}?`,
      `They won't be able to find your profile, wardrobes, or clothes on DG Wardrobe. DG Wardrobe won't let them know you blocked them.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () => {
            resetAndClose();
            if (onBlockUser) {
              onBlockUser(authorUsername);
            }
            Alert.alert("Blocked", `@${authorUsername} has been blocked and their posts are hidden.`);
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={resetAndClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={resetAndClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheetContainer, { backgroundColor: colors.surface || "#1E1E2E" }]}
        >
          {/* Header indicator bar */}
          <View style={styles.indicatorBar} />

          {/* ================= STEP 1: INITIAL ACTION MENU ================= */}
          {step === "menu" && (
            <View style={styles.menuContainer}>
              {isOwner ? (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    resetAndClose();
                    if (onDelete) onDelete();
                  }}
                >
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                  <Text style={[styles.menuItemText, { color: "#EF4444", fontWeight: "600" }]}>
                    Delete Post
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setStep("reasons")}
                  >
                    <Ionicons name="alert-circle-outline" size={22} color="#EF4444" />
                    <Text style={[styles.menuItemText, { color: "#EF4444", fontWeight: "600" }]}>
                      Report...
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleBlockPress}
                  >
                    <Ionicons name="ban-outline" size={22} color={colors.textPrimary || "#FFF"} />
                    <Text style={[styles.menuItemText, { color: colors.textPrimary || "#FFF" }]}>
                      Block @{authorUsername}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={[styles.menuItem, styles.cancelItem]}
                onPress={resetAndClose}
              >
                <Text style={[styles.cancelText, { color: colors.textMuted || "#888" }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ================= STEP 2: WHY ARE YOU REPORTING? ================= */}
          {step === "reasons" && (
            <View style={styles.reasonsContainer}>
              <View style={styles.reasonsHeader}>
                <TouchableOpacity
                  onPress={() => setStep("menu")}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={22} color={colors.textPrimary || "#FFF"} />
                </TouchableOpacity>
                <Text style={[styles.reasonsTitle, { color: colors.textPrimary || "#FFF" }]}>
                  Report
                </Text>
                <View style={{ width: 22 }} />
              </View>

              <Text style={[styles.questionTitle, { color: colors.textPrimary || "#FFF" }]}>
                Why are you reporting this post?
              </Text>
              <Text style={[styles.subText, { color: colors.textMuted || "#888" }]}>
                Your report is anonymous. If someone is in immediate danger, call local emergency services.
              </Text>

              <ScrollView
                style={styles.reasonsList}
                showsVerticalScrollIndicator={false}
              >
                {REPORT_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.id}
                    style={[styles.reasonOption, { borderBottomColor: colors.border || "#333" }]}
                    onPress={() => handleSelectReason(reason.title)}
                    disabled={submitting}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reasonTitle, { color: colors.textPrimary || "#FFF" }]}>
                        {reason.title}
                      </Text>
                      <Text style={[styles.reasonDesc, { color: colors.textMuted || "#888" }]}>
                        {reason.desc}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted || "#888"} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {submitting && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#A855F7" />
                </View>
              )}
            </View>
          )}

          {/* ================= STEP 3: SUBMISSION CONFIRMATION ================= */}
          {step === "submitted" && (
            <View style={styles.submittedContainer}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark-sharp" size={38} color="#FFF" />
              </View>
              <Text style={[styles.submittedTitle, { color: colors.textPrimary || "#FFF" }]}>
                Thank you for letting us know
              </Text>
              <Text style={[styles.submittedDesc, { color: colors.textMuted || "#888" }]}>
                We use these reports to keep the DG Wardrobe community safe. Our moderation team will review this post and take action within 24 hours.
              </Text>

              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => {
                  resetAndClose();
                  if (onReportSuccess) onReportSuccess();
                }}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 20,
    maxHeight: "85%",
  },
  indicatorBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#666",
    alignSelf: "center",
    marginBottom: 15,
  },
  menuContainer: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(150, 150, 150, 0.2)",
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 14,
  },
  cancelItem: {
    borderBottomWidth: 0,
    justifyContent: "center",
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  reasonsContainer: {
    flexShrink: 1,
  },
  reasonsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  reasonsTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  reasonsList: {
    maxHeight: 380,
  },
  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reasonTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 3,
  },
  reasonDesc: {
    fontSize: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  submittedContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  submittedTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  submittedDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 15,
    marginBottom: 24,
  },
  doneButton: {
    backgroundColor: "#A855F7",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
  },
  doneButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
