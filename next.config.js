/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
      if (isServer) {
        config.module.rules.push({
          test: /\.map$/,
          use: ['ignore-loader']
        });
      }
      // Suppress punycode warning
      config.ignoreWarnings = [
        { module: /node_modules\/punycode/ }
      ];
      return config;
    },
    experimental: {
      serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
    },
    reactStrictMode: true,
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'i.pinimg.com',
          pathname: '/**',
        },
      ],
    },
    env: {
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    }
}

module.exports = nextConfig