import React from "react";
import { View } from "react-native";

interface RowProps {
  children: React.ReactNode;
}

const Row = ({ children }: RowProps) => (
  <View
    style={{
      flexDirection: "row",
      gap: 10,
      marginBottom: 12,
    }}
  >
    {children}
  </View>
);

export default Row;
