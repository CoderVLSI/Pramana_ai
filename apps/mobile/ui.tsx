import React from "react";
import * as Native from "react-native";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";
import { useDevicePreferences } from "./DevicePreferences";
import { colors, themeColor } from "./theme";
export function useDarkMode() {
  const { state } = useDevicePreferences();
  const system = Native.useColorScheme();
  return (
    state.reading.appearance === "dark" ||
    (state.reading.appearance === "system" && system === "dark")
  );
}
export function useThemeColor(color: string) {
  return themeColor(color, "text", useDarkMode()) || color;
}
const slots: Record<string, "text" | "fill" | "line"> = {
  color: "text",
  backgroundColor: "fill",
  borderColor: "line",
  borderTopColor: "line",
  borderBottomColor: "line",
  borderLeftColor: "line",
  borderRightColor: "line",
};
function styleFor(
  style: any,
  dark: boolean,
  kind: "surface" | "text" = "surface",
) {
  const flat = Native.StyleSheet.flatten(style) || {};
  const result: any = { ...flat };
  for (const key of Object.keys(slots))
    if (typeof result[key] === "string")
      result[key] = themeColor(result[key], slots[key], dark);
  if (kind === "text" && !result.color) result.color = colors(dark).ink;
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
      placeholderTextColor={colors(dark).placeholder}
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
