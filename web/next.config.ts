import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.agent-sandbox-my-b1-gw.trae.ai",
    "*.agent-sandbox-my-c1-gw.trae.ai",
    "*.remote-agent.svc.cluster.local",
    "*.trae.ai",
  ],
};

export default nextConfig;
