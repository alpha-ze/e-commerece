import { Helmet } from 'react-helmet-async';
import storeConfig from '../config/store';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product';
  /** Product-specific structured data */
  product?: {
    name: string;
    price: number;
    currency: string;
    image?: string;
    description?: string;
    sku?: string;
    availability: 'InStock' | 'OutOfStock';
  };
}

const SITE_URL = 'https://www.illumizellighting.in';

export default function SEO({
  title,
  description,
  image,
  url,
  type = 'website',
  product,
}: SEOProps) {
  const fullTitle = title
    ? `${title} | ${storeConfig.name}`
    : `${storeConfig.name} — ${storeConfig.tagline}`;

  const metaDesc =
    description ??
    `Shop at ${storeConfig.name}. ${storeConfig.tagline}. Secure checkout, fast delivery.`;

  const metaImage = image ?? `${SITE_URL}/og-image.png`;
  const metaUrl = url ? `${SITE_URL}${url}` : SITE_URL;

  // JSON-LD structured data for products (helps Google show rich results)
  const productSchema = product
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        sku: product.sku,
        image: product.image,
        offers: {
          '@type': 'Offer',
          price: product.price.toFixed(2),
          priceCurrency: product.currency,
          availability: `https://schema.org/${product.availability}`,
          seller: { '@type': 'Organization', name: storeConfig.name },
        },
      })
    : null;

  // Organization schema for the homepage
  const orgSchema =
    type === 'website'
      ? JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: storeConfig.name,
          url: SITE_URL,
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: storeConfig.supportPhone,
            contactType: 'customer service',
            email: storeConfig.supportEmail,
          },
        })
      : null;

  return (
    <Helmet>
      {/* Basic */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      <link rel="canonical" href={metaUrl} />

      {/* Open Graph (Facebook, WhatsApp, LinkedIn previews) */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:site_name" content={storeConfig.name} />

      {/* Twitter card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image" content={metaImage} />

      {/* Product structured data */}
      {productSchema && (
        <script type="application/ld+json">{productSchema}</script>
      )}
      {/* Org structured data */}
      {orgSchema && (
        <script type="application/ld+json">{orgSchema}</script>
      )}
    </Helmet>
  );
}
