import Image from 'next/image';

import { cn } from '@/lib/utils';

interface PostItLogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
}

export function PostItLogo({
  size = 40,
  className,
  priority = false,
  decorative = true,
}: PostItLogoProps) {
  return (
    <Image
      src="/logo/logo-postit.png"
      alt={decorative ? '' : 'PostIt AI'}
      aria-hidden={decorative ? true : undefined}
      width={size}
      height={size}
      priority={priority}
      className={cn('object-contain', className)}
    />
  );
}