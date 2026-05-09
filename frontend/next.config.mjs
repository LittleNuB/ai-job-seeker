/** @type {import('next').NextConfig} */
const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
// standalone only for Docker VPS builds; Vercel and Railway use default output
const useStandalone = process.env.BUILD_STANDALONE === "1";

const nextConfig = {
  ...(useStandalone ? { output: "standalone" } : {}),
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
