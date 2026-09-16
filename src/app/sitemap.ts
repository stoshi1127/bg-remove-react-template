import type { MetadataRoute } from 'next';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bg.quicktools.jp').replace(/\/$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date('2026-09-16'),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/tone`,
      lastModified: new Date('2026-03-25'),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/trim`,
      lastModified: new Date('2026-03-25'),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date('2026-03-25'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/legal/tokushoho`,
      lastModified: new Date('2026-03-25'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/privacy-policy`,
      lastModified: new Date('2026-03-25'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
