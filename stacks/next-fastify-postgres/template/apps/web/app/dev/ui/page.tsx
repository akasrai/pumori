import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { UiGallery } from '@/components/dev/ui-gallery';

export const metadata: Metadata = { title: 'UI gallery' };

/**
 * Dev-only component gallery: every components/ui component and the app shell, with their variants
 * and states. Designers build mockups from it; developers copy from it. A 404 in production.
 */
const UiGalleryPage = () => {
  if (process.env.NODE_ENV === 'production') notFound();

  return <UiGallery />;
};

export default UiGalleryPage;
