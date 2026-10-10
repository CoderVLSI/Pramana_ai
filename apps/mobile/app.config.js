// Native builds connect directly by default. Explicit backend builds require a public HTTPS host.
module.exports = ({ config }) => {
  if (
    process.env.EXPO_PUBLIC_CONNECTION_MODE === "backend" &&
    (process.env.EAS_BUILD_PROFILE === "production" ||
      process.env.PRAMANA_RELEASE_BUILD === "true")
  ) {
    let url;
    try {
      url = new URL(process.env.EXPO_PUBLIC_API_URL || "");
    } catch {
      throw new Error(
        "Production requires EXPO_PUBLIC_API_URL pointing to the deployed HTTPS backend.",
      );
    }
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const local =
      /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::|::1$|f[cd][0-9a-f]{2}:|fe[89ab][0-9a-f]:)/.test(
        host,
      ) ||
      /\.(localhost|local|internal|invalid|test)$/.test(host) ||
      /(^|\.)example\.(com|org|net)$/.test(host) ||
      !host.includes(".");
    if (
      url.protocol !== "https:" ||
      local ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error(
        "Production API URL must use public HTTPS without credentials, query parameters or fragments.",
      );
    }
  }
  return config;
};
