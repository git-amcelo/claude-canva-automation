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
  // Fonts, icons, the brand avatar and the sample photo are read at runtime
  // with paths built from process.cwd() (see lib/templates/shared/fonts.ts and
  // friends). Next traces imports to decide what ships in each serverless
  // function, and a path assembled from strings at runtime is invisible to it —
  // so without this, assets/ is missing in production and every render route
  // throws ENOENT. Locally it works regardless, because the repo is on disk.
  outputFileTracingIncludes: {
    "/api/**": ["./assets/**", "./public/apple-touch-icon.png"],
  },
};

export default nextConfig;
