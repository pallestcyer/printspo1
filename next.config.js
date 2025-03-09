/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['puppeteer-core'],
    webpack: (config, { isServer }) => {
      // Handle ESM modules
      config.resolve.extensionAlias = {
        '.js': ['.js', '.ts', '.tsx']
      };

      // Suppress punycode warning
      config.ignoreWarnings = [
        { module: /node_modules\/punycode/ }
      ];

      if (isServer) {
        // Ignore source maps
        config.module.rules.push({
          test: /\.map$/,
          use: ['ignore-loader']
        });
      }

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
      serverComponentsExternalPackages: ['@sparticuz/chromium'],
      webpackBuildWorker: true
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
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    }
};

module.exports = nextConfig;