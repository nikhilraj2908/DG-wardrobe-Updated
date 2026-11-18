import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: "DG Wardrobe",
  slug: "YourDigiCloset",
  version: "1.0.0",
  scheme: "mydgwardrobe",
  icon: "./assets/images/DW_logo_A855F7.png",

  android: {
    ...config?.android,
    package: "com.yourdgwardrobe.app",
    usesCleartextTraffic: true,
    permissions: [
      "INTERNET",
      "VIBRATE",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
    ],
    adaptiveIcon: {
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
      backgroundColor: "#E6F4FE"
    },
    intentFilters: [
      {
        action: "VIEW",
        data: [{ scheme: "mydgwardrobe" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },

  ios: {
    ...config?.ios,
    bundleIdentifier: "com.yourdgwardrobe.app",
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
