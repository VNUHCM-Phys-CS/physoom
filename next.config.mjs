/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      esmExternals: "loose",
      serverComponentsExternalPackages: ["mongoose", "googleapis"],
    },
    // Other Next.js config options...
  };
  

export default nextConfig;
