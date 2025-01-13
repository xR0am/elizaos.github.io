/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: process.env.GITHUB_ACTIONS ? "/elizaos.github.io" : "",
  images: {
    unoptimized: true, // Required for static export
  },
};

module.exports = nextConfig;
