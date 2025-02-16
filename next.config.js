/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['puppeteer-core'],
    webpack: (config, { isServer }) => {
      if (isServer) {
        config.module.rules.push({
          test: /\.map$/,
          use: ['ignore-loader']
        });
      }
      // Handle ESM modules
      config.resolve.extensionAlias = {
        '.js': ['.js', '.ts', '.tsx']
      };
      // Suppress punycode warning
      config.ignoreWarnings = [
        { module: /node_modules\/punycode/ }
      ];
      return config;
    },
    async headers() {
      return [
        {
          // Allow CORS for API routes in development
          source: '/api/:path*',
          headers: [
            { key: 'Access-Control-Allow-Origin', value: '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
            { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          ],
        },
      ];
    },
    experimental: {
      serverComponentsExternalPackages: ['@sparticuz/chromium']
    },
    reactStrictMode: true,
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '**.pinimg.com',
        },
      ],
    },
    env: {
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    }
}

module.exports = nextConfig