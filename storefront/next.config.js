const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    staticGenerationRetryCount: 3,
    staticGenerationMaxConcurrency: 1,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "fashion-starter-demo.s3.eu-central-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "caf2520911d2089f7451d31c9bd5ec6d.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "pub-83fd178471ff4d348d1bd53628b254bb.r2.dev",
      },
    ],
  },
}

module.exports = nextConfig
