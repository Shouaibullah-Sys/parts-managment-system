import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Pin the workspace root to this project so Next.js doesn't infer
  // /home/<user> (stray package-lock.json outside the repo) as the root
  turbopack: {
    root: __dirname,
  },

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
