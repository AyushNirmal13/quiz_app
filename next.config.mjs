/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdf-parse uses fs — only on server
      config.externals = ["pdf-parse", ...(config.externals ?? [])];
    }
    return config;
  },
};

export default nextConfig;
