import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

interface CardProps {
  data: {
    key: string;
    label: string;
    image: any;
  };
  onPress?: (key: string) => void;
  size?: "tall" | "wide" | "small" | "medium" | "large" | string;
}

const Card = ({ data, onPress, size }: CardProps) => {
  const height =
    size === "tall" || size === "large"
      ? 260
      : size === "wide" || size === "medium"
      ? 200
      : 140;

  const flex = size === "wide" ? 2 : 1;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress && onPress(data.key)}
      style={{
        flex,
        height,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#eee",
      }}
    >
      <Image
        source={data.image}
        style={{ width: "100%", height: "100%" }}
        resizeMode="cover"
      />

      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          paddingVertical: 8,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontWeight: "600",
            fontSize: 14,
          }}
        >
          {data.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default Card;
