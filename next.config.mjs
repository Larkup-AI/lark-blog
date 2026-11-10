/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.vusercontent.net"],
  // Produces a self-contained server bundle for the Docker image.
  output: "standalone",
  typescript: {
    // TODO(distribution): the inherited codebase has loose `any` usage. Keeping
    // this on unblocks the first release; tighten types and remove this before
    // declaring the OSS build "strict". Tracked in DECISIONS.md.
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
