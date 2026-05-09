/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Headers de sécurité par défaut
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },

  // Configuration images (avatars, logos tenant, etc.)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.terp.cm" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.b2.backblazeb2.com" },
    ],
  },

  // Compression & optimisations
  compress: true,
  poweredByHeader: false,

  // Variables d'environnement publiques
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version,
  },
};

module.exports = nextConfig;
