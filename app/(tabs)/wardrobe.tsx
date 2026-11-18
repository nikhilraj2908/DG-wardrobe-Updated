import CollectionPostCard from "@/components/CollectionPostCard";
import WardrobeHeader from "@/components/WardrobeHeader";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import api from "../../api/api";
import AppBackground from "@/components/AppBackground";
import { useTheme } from "../theme/ThemeContext";

export default function Wardrobe() {
  const router = useRouter();
  const { theme } = useTheme();                         // <-- get current theme
  const colors = theme.colors;
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [sortBy, setSortBy] = useState<
    "worth" | "alpha" | "views"
  >("worth");

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/feed/collections");
      setCollections(res.data || []);
    } catch (err) {
      console.log("Load error");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCollections();
    setRefreshing(false);
  };

  /* ================= SORTING ================= */

  const sortedCollections = [...collections].sort((a, b) => {
    if (sortBy === "worth") {
      return (b.stats?.totalWorth || 0) - (a.stats?.totalWorth || 0);
    }

    if (sortBy === "alpha") {
      return (a.user?.username || "").localeCompare(b.user?.username || "");
    }

    if (sortBy === "views") {
      return (b.views || 0) - (a.views || 0);
    }

    return 0;
  });

  return (
    <AppBackground>
      <View style={{ flex: 1, paddingTop: 5 }}>
        <WardrobeHeader
          onBack={() => router.back()}
          onSearch={() => console.log("Search")}
          onNotification={() => console.log("Notification")}
          showFilters
          activeSort={sortBy}
          onSort={setSortBy}
        />

        <FlatList
          data={sortedCollections}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <CollectionPostCard item={item} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListFooterComponent={
            loading && !refreshing ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginVertical: 20 }}
              />
            ) : null
          }
        />
      </View>
    </AppBackground>
  );
}
const createStyles = (colors: any) =>
  StyleSheet.create({

  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
});
