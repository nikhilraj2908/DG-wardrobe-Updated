import React from "react";
import {
  ScrollView,
} from "react-native";
import Row from "./Row";
import Card from "./Card";

const LAYOUT_PATTERN = [
  { columns: 2, sizes: ["medium", "medium"] },
  { columns: 1, sizes: ["large"] },
  { columns: 3, sizes: ["small", "small", "small"] },
];

// Demo data
const CATEGORIES = Array.from({ length: 30 }).map((_, i) => ({
  key: `Category-${i}|womens`,
  label: `Category ${i + 1}`,
  image: require("../assets/images/icon.png"),
}));

interface CuratedExploreProps {
  onSelectCategory?: (category: any) => void;
}

export default function CuratedExploreLayout({ onSelectCategory }: CuratedExploreProps) {
  let index = 0;
  let patternIndex = 0;
  const rows: React.ReactNode[] = [];

  while (index < CATEGORIES.length) {
    const pattern = LAYOUT_PATTERN[patternIndex % LAYOUT_PATTERN.length];
    const rowItems = CATEGORIES.slice(index, index + pattern.columns);

    rows.push(
      <Row key={`row-${index}`}>
        {rowItems.map((item, i) => (
          <Card
            key={item.key}
            data={item}
            size={pattern.sizes[i]}
            onPress={onSelectCategory}
          />
        ))}
      </Row>
    );

    index += pattern.columns;
    patternIndex++;
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
    >
      {rows}
    </ScrollView>
  );
}
