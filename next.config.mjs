/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Transpile the privacycash package
  transpilePackages: ['privacycash'],
  webpack: (config, { isServer }) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    
    // Externalize problematic WASM-loading modules on server
    if (isServer) {
      config.externals = [
        ...config.externals,
        '@lightprotocol/hasher.rs',
        'privacycash',
      ];
    }
    
    // Fallback for node modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    return config;
  },
};

export default nextConfig;