const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'next-app',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  images: {
    unoptimized: true,
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (!isServer) {
      config.target = 'electron-renderer';
    }
    
    // Handle node modules that might be problematic in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
    };

    // Add alias for components
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname),
      '@/components': path.join(__dirname, 'components'),
      '@/lib': path.join(__dirname, 'lib'),
      '@/stores': path.join(__dirname, 'stores'),
      '@/styles': path.join(__dirname, 'styles'),
      '@/providers': path.join(__dirname, 'providers'),
    };

    // Exclude main process files from Next.js compilation
    config.externals = [...(config.externals || []), {
      'electron': 'commonjs electron',
      'auto-launch': 'commonjs auto-launch',
      'electron-updater': 'commonjs electron-updater',
      'electron-log': 'commonjs electron-log',
      'electron-store': 'commonjs electron-store',
      'systeminformation': 'commonjs systeminformation',
      'machine-uuid': 'commonjs machine-uuid',
      'node-machine-id': 'commonjs node-machine-id',
      'crypto-js': 'commonjs crypto-js',
      'ws': 'commonjs ws',
    }];

    return config;
  },
  experimental: {
    esmExternals: false,
  },
};

module.exports = nextConfig;