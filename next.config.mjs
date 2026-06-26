/** @type {import('next').NextConfig} */
const nextConfig = {
  // 允许从 public 目录提供 .mjs 文件正确的 MIME 类型
  async headers() {
    return [
      {
        source: '/pdf.worker.min.mjs',
        headers: [
          { key: 'Content-Type', value: 'application/javascript' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
