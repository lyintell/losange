import path from 'path';
import { fileURLToPath } from 'url';

const appRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Évite que Next/Turbopack prenne la racine du monorepo Expo (lockfile parent).
  outputFileTracingRoot: appRoot,
  turbopack: {
    root: appRoot,
  },
};

export default nextConfig;
