import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactCompiler: true,
  allowedDevOrigins: ["**.*"],
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
