import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import Rainbow from "./Rainbow";

export default function App() {
  return (
    <SafeAreaProvider>
      <Rainbow />
    </SafeAreaProvider>
  );
}
