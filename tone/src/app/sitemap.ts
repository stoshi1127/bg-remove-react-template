import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://quicktools.app'
  const lastModified = new Date()

  return [
    {
      url: `${baseUrl}/tone`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/tone/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ]
}