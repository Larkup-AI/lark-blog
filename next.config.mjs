/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.vusercontent.net"],
  transpilePackages: ["@larkup/blog-sdk"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
