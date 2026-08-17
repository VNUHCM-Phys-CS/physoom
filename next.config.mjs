/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      esmExternals: "loose",
      serverComponentsExternalPackages: ["mongoose", "googleapis"],
      // Run post-response work (Google Calendar sync) to completion on Vercel
      // serverless — bare fire-and-forget gets killed when the handler returns.
      after: true,
    },
    // Other Next.js config options...
  };
  

export default nextConfig;
