/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      staleTimes: {
        dynamic: 30,
        static: 180,
      },
    },
    serverExternalPackages: ["mongoose"],
    // Other Next.js config options...
  };
  

export default nextConfig;
