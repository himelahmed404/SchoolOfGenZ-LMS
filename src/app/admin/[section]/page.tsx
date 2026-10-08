'use client';

import { notFound, useParams } from 'next/navigation';
import { ConsoleMain, isSection } from '@/components/admin/Console';

/** Every console section other than the two queues. */
export default function AdminSectionPage() {
  const { section } = useParams<{ section: string }>();
  if (!isSection(section) || section === 'overview') notFound();
  return <ConsoleMain />;
}
