import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "./ThemeContext";

export default function ThemeSelector() {
  const { setThemeById } = useTheme();

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>Choose Theme</Text>

      <TouchableOpacity onPress={() => setThemeById("purple")}>
        <Text>Purple Theme</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setThemeById("dark")}>
        <Text>Dark Theme</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setThemeById("blue")}>
        <Text>Yellow Theme</Text>
      </TouchableOpacity>
    </View>
  );
}
