/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
      // Only add experimental features if you specifically need them
    },
    // If you need to configure API routes or redirects
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: 'http://www.printspo.ca/api/:path*',
        },
      ];
    },
    images: {
      domains: ['i.pinimg.com'], // Add Pinterest's image domain
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '*.pinimg.com',
        },
      ],
    },
  }
  
  module.exports = nextConfig