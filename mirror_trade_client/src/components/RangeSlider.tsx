import React, { useMemo } from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  View,
  Pressable,
} from "react-native";
import { colors } from "../theme/colors";

type Props = {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  trackColor?: string;
  thumbColor?: string;
};

export default function RangeSlider({
  value,
  min,
  max,
  onChange,
  trackColor = colors.primary,
  thumbColor = colors.primary,
}: Props) {
  const [width, setWidth] = React.useState(0);
  const pct = useMemo(() => {
    const t = (value - min) / (max - min || 1);
    return Math.min(1, Math.max(0, t));
  }, [value, min, max]);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const handlePress = (x: number) => {
    if (!width) return;
    const ratio = Math.min(1, Math.max(0, x / width));
    const raw = min + ratio * (max - min);
    onChange(Math.round(raw));
  };

  return (
    <Pressable
      onLayout={onLayout}
      onPress={(e) => handlePress(e.nativeEvent.locationX)}
      style={styles.hit}
    >
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct * 100}%`, backgroundColor: trackColor },
          ]}
        />
        <View
          style={[
            styles.thumb,
            {
              left: `${pct * 100}%`,
              backgroundColor: thumbColor,
              borderColor: thumbColor,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    height: 28,
    justifyContent: "center",
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    position: "relative",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  thumb: {
    position: "absolute",
    top: -7,
    marginLeft: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    backgroundColor: colors.bg,
  },
});
