import type { NextConfig } from "next";
import salon from "./salon.config";

// Cache Components are off on purpose: almost every page reads live booking data,
// so classic dynamic rendering keeps the code simpler to read and maintain.
const nextConfig: NextConfig = {
  // PGlite ships WebAssembly and data files that must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  async redirects() {
    return [{ source: "/", destination: `/${salon.defaultLocale}`, permanent: false }];
  },
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
