import type { NextConfig } from "next";

const ContentSecurityPolicy = [
  "default-src 'self';",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.youtube.com;",
  "child-src *.youtube.com;",
  "style-src 'self' 'unsafe-inline';",
  "img-src * blob: data:;",
  "media-src 'none';",
  "connect-src *;",
  "font-src 'self';",
].join(' ');

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
