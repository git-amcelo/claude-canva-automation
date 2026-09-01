/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: import.meta.dirname,
  },
  // sharp has native (non-JS) bindings — keep it out of the serverless
  // function bundle rather than letting the bundler try to inline it. Vercel
  // installs the correct prebuilt binary for its own build/runtime platform
  // automatically at `npm install` time.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
