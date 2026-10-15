import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Portable self-contained build for the Docker kit (MacBook offline mode).
  // Harmless on Vercel — it uses its own bundling regardless.
  output: "standalone",
  // Pin the workspace root to this project so Next.js doesn't infer
  // /home/<user> (stray package-lock.json outside the repo) as the root
  turbopack: {
    root: __dirname,
  },

  // Allow the dev server to be opened through the public hostname / LAN IP
  // (used to test the remote read-only mode). Dev-only; no effect in prod.
  allowedDevOrigins: [
    "diplmasiltd.net",
    "www.diplmasiltd.net",
    "127.0.0.1",
    "localhost",
  ],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude Node.js modules that might try to access stdout/stderr in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        child_process: false,
        tls: false,
        "process/browser": false,
      };

      // Ignore node modules that might cause stdout issues
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        {
          module: /drizzle-kit/,
          message: /stdout/,
        },
      ];
    }

    return config;
  },
  // Disable development features that might access stdout
  experimental: {
    webpackBuildWorker: true,
  },
};

export default nextConfig;
