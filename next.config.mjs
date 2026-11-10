/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.vusercontent.net"],
  // Produces a self-contained server bundle for the Docker image.
  output: "standalone",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
