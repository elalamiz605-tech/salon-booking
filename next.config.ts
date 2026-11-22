import type { NextConfig } from "next";

// Cache Components are off on purpose: almost every page reads live booking data,
// so classic dynamic rendering keeps the code simpler to read and maintain.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
