module.exports = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.ignoreWarnings = [
        (warning) =>
          warning.message.includes("source map") ||
          warning.message.includes("unreachable code"),
      ];
    }
    return config;
  },
  productionBrowserSourceMaps: true,
};
