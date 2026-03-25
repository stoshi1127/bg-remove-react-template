import { ImageResponse } from 'next/og';

import { OgArtwork } from './brand-artwork';

export const size = {
  width: 1200,
  height: 630,
};

export const alt = 'EasyCut by QuickTools';
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(<OgArtwork />, size);
}
