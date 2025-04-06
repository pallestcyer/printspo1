/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['puppeteer-core', '@sparticuz/chromium'],
    webpack: (config, { isServer }) => {
      // Handle ESM modules
      config.resolve.extensionAlias = {
        '.js': ['.js', '.ts', '.tsx']
      };

      // Suppress punycode warning
      config.ignoreWarnings = [
        { module: /node_modules\/punycode/ },
        // Ignore Chromium download warning
        { message: /.*Chromium download may fail.*/i },
        // Ignore missing optional dependencies
        { message: /.*Can't resolve '(utf-8-validate|bufferutil)'.*/i }
      ];
      
      // Handle server-side specific modules
      if (isServer) {
        // Avoid bundling non-Node.js specific modules on the server
        config.externals.push(
          'puppeteer-core',
          '@sparticuz/chromium',
          {
            'utf-8-validate': 'commonjs utf-8-validate',
            'bufferutil': 'commonjs bufferutil',
          }
        );
      }
      
      // Fix for client-side polyfills
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          path: false,
          crypto: false,
          stream: false,
          buffer: false,
        };
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
      serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core', 'puppeteer'],
      instrumentationHook: true,
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