/** @type {import('next').NextConfig} */
const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const isVercel = process.env.VERCEL === "1";

const nextConfig = {
  // standalone mode for Docker builds; Vercel uses its own output mode
  ...(isVercel ? {} : { output: "standalone" }),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
