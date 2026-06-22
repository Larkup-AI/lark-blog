/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.vusercontent.net"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
