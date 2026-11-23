import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: config.name || "DigiWardrobe",
  slug: config.slug || "digiwardrobe",
  version: config.version || "1.0.0",
  scheme: config.scheme || "digiwardrobe",
  icon: config.icon || "./assets/images/icon.png",

  android: {
    ...config?.android,
    package: config.android?.package || "com.nikhil.digiwardrobe",
    usesCleartextTraffic: true,
    permissions: [
      "CAMERA",
      "INTERNET",
      "VIBRATE",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
    ],
    adaptiveIcon: {
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
      backgroundColor: "#7C3AED"
    },
    intentFilters: [
      {
        action: "VIEW",
        data: [{ scheme: config.scheme || "digiwardrobe" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },

  ios: {
    ...config?.ios,
    bundleIdentifier: config.android?.package || "com.nikhil.digiwardrobe",
  },

  extra: {
    apiBaseUrl: process.env.API_BASE_URL || "http://13.127.122.25:5001",
    imageBaseUrl: "https://digiwardrobe.s3.ap-south-1.amazonaws.com",
    AUTH0_DOMAIN: "dev-yhb3xssuawesxfyk.us.auth0.com",
    AUTH0_CLIENT_ID: "b6BEiuZ5bJ29sar6FfCfrr35QqnKS4YA",
    eas: {
      projectId: "4d2059e7-e779-4f9d-979b-b64d170fb65f",
    },
  },
});
