import React from "react";
import { View, StyleSheet } from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { getYForX, Path } from "./types";

const CURSOR = 50;
const styles = StyleSheet.create({
  cursor: {
    width: CURSOR,
    height: CURSOR,
    borderRadius: CURSOR / 2,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cursorBody: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: "black",
  },
});

interface CursorProps {
  data: Animated.SharedValue<{ path: Path }>;
  y: Animated.SharedValue<number>;
}

const Cursor = ({ data, y }: CursorProps) => {
  const active = useSharedValue(false);
  const x = useSharedValue(0);
  const onGestureEvent = useAnimatedGestureHandler({
    onStart: () => {
      active.value = true;
    },
    onActive: (e) => {
      x.value = e.x;
      y.value = getYForX(data.value.path, x.value);
    },
    onEnd: () => {
      active.value = false;
    },
  });
  const style = useAnimatedStyle(() => {
    const translateX = x.value - CURSOR / 2;
    const translateY = y.value - CURSOR / 2;
    return {
      transform: [{ translateX }, { translateY }],
      opacity: withTiming(active.value ? 1 : 0),
    };
  });
  return (
    <PanGestureHandler
      {...{
        onGestureEvent,
      }}>
      <Animated.View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.cursor, style]}>
          <View style={styles.cursorBody} />
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  );
};

export default Cursor;
