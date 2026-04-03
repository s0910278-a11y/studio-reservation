import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zeroemission-reserve.netlify.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api',
          '/api/',
          '/_next/',
          '/static/',
          '/cancel',
          '/display'
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
