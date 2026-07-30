import React from "react";
import { Text, StyleSheet } from "react-native";
import Animated, {
  FadeInUp,
} from "react-native-reanimated";

export default function AnimatedMessage({
  text,
  sender,
}: any) {
  return (
    <Animated.View
      entering={FadeInUp.duration(600)}
      style={[
        styles.message,
        sender === "user"
          ? styles.user
          : styles.bot,
      ]}
    >
      <Text style={styles.text}>
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  message: {
    maxWidth: "85%",
    padding: 18,
    marginVertical: 8,
    borderRadius: 24,
  },

  user: {
    alignSelf: "flex-end",
    backgroundColor: "#e0e6ef46",
  },

  bot: {
    alignSelf: "flex-start",
    backgroundColor: "#1A1A1A",
  },

  text: {
    color: "white",
    fontSize: 16,
    lineHeight: 24,
  },
});