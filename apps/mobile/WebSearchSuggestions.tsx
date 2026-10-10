import { View } from "./ui";
import React, { Suspense } from "react";
import { Linking, Platform } from "react-native";
const NativeWebView = React.lazy(() =>
  import("react-native-webview").then((module) => ({
    default: module.WebView,
  })),
);
export default function WebSearchSuggestions({ html }: { html?: string }) {
  if (!html || html.length > 30000) return null;
  return (
    <View style={{ height: 140, marginTop: 12 }}>
      {Platform.OS === "web" ? (
        React.createElement("iframe", {
          title: "Google Search suggestions",
          srcDoc: html,
          sandbox: "",
          style: { width: "100%", height: "100%", border: 0 },
        })
      ) : (
        <Suspense fallback={null}>
          <NativeWebView
            source={{ html }}
            javaScriptEnabled={false}
            domStorageEnabled={false}
            originWhitelist={["about:blank"]}
            onShouldStartLoadWithRequest={(request) => {
              if (request.url === "about:blank") return true;
              try {
                const url = new URL(request.url);
                if (url.protocol === "https:" && !url.username && !url.password)
                  void Linking.openURL(url.href).catch(() => {});
              } catch {
                /* ignore invalid links */
              }
              return false;
            }}
          />
        </Suspense>
      )}
    </View>
  );
}
