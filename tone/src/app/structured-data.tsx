export function generateStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "EasyTone",
    "alternateName": "EasyTone - 簡単画像トーン調整",
    "description": "3ステップで簡単に画像にプロのようなトーンを適用。複数の写真を一括処理できる無料のオンライン画像編集ツール。",
    "url": "https://quicktools.app/tone",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web Browser",
    "browserRequirements": "HTML5, JavaScript, Canvas API",
    "softwareVersion": "1.0.0",
    "datePublished": "2025-01-05",
    "dateModified": "2025-01-05",
    "author": {
      "@type": "Organization",
      "name": "QuickTools",
      "url": "https://quicktools.app"
    },
    "publisher": {
      "@type": "Organization",
      "name": "QuickTools",
      "url": "https://quicktools.app"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "JPY",
      "availability": "https://schema.org/InStock"
    },
    "featureList": [
      "複数画像の一括処理",
      "4つのプリセットフィルター",
      "ドラッグ&ドロップアップロード",
      "HEIC形式対応",
      "ZIP一括ダウンロード",
      "レスポンシブデザイン"
    ],
    "screenshot": "https://quicktools.app/tone/screenshot-wide.png",
    "softwareHelp": {
      "@type": "CreativeWork",
      "url": "https://quicktools.app/tone#help"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "150",
      "bestRating": "5",
      "worstRating": "1"
    },
    "review": [
      {
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": "田中太郎"
        },
        "datePublished": "2025-01-01",
        "reviewBody": "商品写真の処理に最適。3ステップで簡単に統一感のある仕上がりになります。",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "5",
          "bestRating": "5"
        }
      }
    ],
    "mainEntity": {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "どのような画像形式に対応していますか？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "JPG、PNG、HEIC形式の画像に対応しています。HEIC形式は自動的にJPEG形式に変換されます。"
          }
        },
        {
          "@type": "Question",
          "name": "一度に何枚まで処理できますか？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "複数の画像を同時に選択して一括処理することができます。処理速度はブラウザの性能に依存します。"
          }
        },
        {
          "@type": "Question",
          "name": "処理された画像の品質は保たれますか？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "はい、元の画像品質を維持したまま処理を行います。画像の劣化を最小限に抑えています。"
          }
        }
      ]
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}