import React from "react";
import * as Native from "react-native";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";
import { useDevicePreferences } from "./DevicePreferences";
const darkColors: Record<string, string> = {
  "#263d35": "#e5eee7",
  "#778179": "#b3c0b7",
  "#526459": "#b3c0b7",
  "#959c92": "#aab8ae",
  "#315444": "#89c9a5",
  "#f6f4ee": "#151e1a",
  "#e4e5db": "#34483d",
  "#b27e42": "#e1b875",
  "#f0f1e9": "#1a2821",
  "#fffefa": "#202f26",
  "#ffffff": "#202f26",
  white: "#f7faf8",
  "#faf9f4": "#202f26",
  "#e0e6d8": "#314f3d",
  "#e3e8dc": "#314f3d",
  "#edf0e5": "#243b2d",
  "#e5eddf": "#314f3d",
  "#d8ddd2": "#52675a",
  "#bdc6bc": "#52675a",
  "#dcded2": "#52675a",
  "#dce2d5": "#52675a",
  "#914626": "#f4bc91",
  "#a02f2f": "#ffb6a8",
  "#eeefe6": "#243b2d",
  "#e4ebdd": "#314f3d",
  "#f7e9de": "#473023",
  "#fffdf1": "#202f26",
  "#f5f1e7": "#202f26",
  "#174c3c": "#a0d6b7",
  "#185837": "#a0d6b7",
  "#4a5b51": "#b3c0b7",
  "#52634f": "#b3c0b7",
  "#52645b": "#b3c0b7",
  "#67816c": "#b3c0b7",
  "#755019": "#e1b875",
  "#838b80": "#b3c0b7",
  "#f3f0e6": "#202f26",
  "#d4d8cb": "#52675a",
  "#143d29": "#253f30",
  "#fff": "#202f26",
  "#000": "#e5eee7",
};
export function useDarkMode() {
  const { state } = useDevicePreferences();
  const system = Native.useColorScheme();
  return (
    state.reading.appearance === "dark" ||
    (state.reading.appearance === "system" && system === "dark")
  );
}
export function useThemeColor(color: string) {
  return useDarkMode() ? darkColors[color.toLowerCase()] || color : color;
}
function styleFor(
  style: any,
  dark: boolean,
  kind: "surface" | "text" = "surface",
) {
  if (!dark) return style;
  const flat = Native.StyleSheet.flatten(style) || {};
  const result = { ...flat };
  for (const key of [
    "color",
    "backgroundColor",
    "borderColor",
    "borderTopColor",
    "borderBottomColor",
  ]) {
    const color =
      typeof result[key] === "string" ? result[key].toLowerCase() : "";
    if (color === "white" || color === "#ffffff" || color === "#fff")
      result[key] = key === "color" ? "#f7faf8" : "#202f26";
    else if (color === "#143d29" && key === "color") result[key] = "#a0d6b7";
    else if (color === "#315444" && key === "backgroundColor")
      result[key] = "#376d4e";
    else if (darkColors[color]) result[key] = darkColors[color];
  }
  if (kind === "text" && !result.color) result.color = "#e5eee7";
  return result;
}
export const Text = React.forwardRef<Native.Text, Native.TextProps>(
  (props, ref) => {
    const dark = useDarkMode();
    return (
      <Native.Text
        {...props}
        ref={ref}
        style={styleFor(props.style, dark, "text")}
      />
    );
  },
);
export function ReadingText(props: Native.TextProps) {
  const { state } = useDevicePreferences();
  return (
    <Text
      {...props}
      style={[
        props.style,
        {
          fontSize: state.reading.fontSize,
          lineHeight: Math.round(
            state.reading.fontSize * state.reading.lineSpacing,
          ),
        },
      ]}
    />
  );
}
export const View = React.forwardRef<Native.View, Native.ViewProps>(
  (props, ref) => {
    const dark = useDarkMode();
    return (
      <Native.View {...props} ref={ref} style={styleFor(props.style, dark)} />
    );
  },
);
export const ScrollView = React.forwardRef<
  Native.ScrollView,
  Native.ScrollViewProps
>((props, ref) => {
  const dark = useDarkMode();
  return (
    <Native.ScrollView
      {...props}
      ref={ref}
      style={styleFor(props.style, dark)}
      contentContainerStyle={styleFor(props.contentContainerStyle, dark)}
    />
  );
});
export const TextInput = React.forwardRef<
  Native.TextInput,
  Native.TextInputProps
>((props, ref) => {
  const dark = useDarkMode();
  return (
    <Native.TextInput
      {...props}
      ref={ref}
      placeholderTextColor={
        dark ? "#aab8ae" : props.placeholderTextColor || "#778179"
      }
      style={styleFor(props.style, dark, "text")}
    />
  );
});
export const Pressable = React.forwardRef<Native.View, Native.PressableProps>(
  (props, ref) => {
    const dark = useDarkMode(),
      style = props.style;
    return (
      <Native.Pressable
        {...props}
        accessibilityRole={props.accessibilityRole || "button"}
        ref={ref}
        style={
          typeof style === "function"
            ? (state) => styleFor(style(state), dark)
            : styleFor(style, dark)
        }
      />
    );
  },
);
export function SafeAreaView(
  props: React.ComponentProps<typeof NativeSafeAreaView>,
) {
  const dark = useDarkMode();
  return <NativeSafeAreaView {...props} style={styleFor(props.style, dark)} />;
}
