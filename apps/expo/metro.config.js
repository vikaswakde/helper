// Learn more https://docs.expo.io/guides/customizing-metro
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: "./src/styles.css" });
