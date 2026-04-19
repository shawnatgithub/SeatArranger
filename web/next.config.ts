import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.agent-sandbox-my-b1-gw.trae.ai", "*.trae.ai", "*.remote-agent.svc.cluster.local"],
};

export default nextConfig;
