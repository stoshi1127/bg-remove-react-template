/* // 一時的にファイル全体をコメントアウト
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function GET() {
  const staticPages = [
    '/',
    // 他に静的なページがあればここに追加 (例: '/about', '/privacy')
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages
    .map((path) => {
      return `
    <url>
      <loc>${path}</loc>
      <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>${path === '/' ? '1.0' : '0.8'}</priority>
    </url>
      `;
    })
    .join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
*/ 