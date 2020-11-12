import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  interpolate,
  runOnUI,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";

import ETH from "./components/ETH";
import { round } from "./Math";
import { SIZE } from "./Model";
import ReText from "./ReText";
import { Path } from "./types";

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  values: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  value: {
    fontWeight: "500",
    fontSize: 24,
  },
  label: {
    fontSize: 18,
  },
});

interface HeaderProps {
  data: Animated.SharedValue<{
    label: string;
    minPrice: number;
    maxPrice: number;
    percentChange: number;
    path: Path;
  }>;
  y: Animated.SharedValue<number>;
}

const Header = ({ data, y }: HeaderProps) => {
  useEffect(() => {
    const initialize = () => {
      "worklet";
    };
    runOnUI(initialize)();
  }, []);

  const price = useDerivedValue(
    () =>
      `$ ${round(
        interpolate(
          y.value,
          [SIZE, 0],
          [data.value.minPrice, data.value.maxPrice]
        ),
        2
      ).toLocaleString("en-US", {
        currency: "USD",
      })}`
  );

  const percentChange = useDerivedValue(
    () => `${round(data.value.percentChange, 3)}%`
  );
  const label = useDerivedValue(() => data.value.label);
  const style = useAnimatedStyle(() => ({
    fontWeight: "500",
    fontSize: 24,
    color: data.value.percentChange > 0 ? "green" : "red",
  }));
  return (
    <View style={styles.container}>
      <ETH />
      <View style={styles.values}>
        <View>
          <ReText style={style} text={price} />
          <Text style={styles.label}>Etherum</Text>
        </View>
        <View>
          <ReText style={style} text={percentChange} />
          <ReText style={styles.label} text={label} />
        </View>
      </View>
    </View>
  );
};

export default Header;
