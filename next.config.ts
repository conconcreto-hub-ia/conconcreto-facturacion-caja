import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las cargas de Excel (proyección y SAP) suben por una acción de servidor: hasta 5 MB.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};

export default nextConfig;
