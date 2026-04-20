import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  // ❌ УДАЛИТЕ этот блок — он не поддерживается:
  // experimental: {
  //   outputFileTracingIncludes: { ... }
  // },
};

export default nextConfig;
