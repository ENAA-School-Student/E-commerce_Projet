import { useEffect, useState } from 'react';
import clsx from 'clsx';
import Icon from './Icon';

interface SmartImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
  monogram?: string;
}

export default function SmartImage({ src, alt, className, imgClassName, eager, monogram }: SmartImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(src ? 'loading' : 'error');

  useEffect(() => {
    setStatus(src ? 'loading' : 'error');
  }, [src]);

  const letters = (monogram ?? alt)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <div className={clsx('relative overflow-hidden bg-surface-container', className)}>
      {status === 'error' ? (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-space-2xs bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-low text-outline"
          title={`${alt} — image indisponible`}
        >
          <span className="font-display text-3xl tracking-widest text-on-surface-variant/60">{letters}</span>
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest">
            <Icon name="image_not_supported" className="text-sm" />
            photo à remplacer
          </span>
        </div>
      ) : (
        <>
          <img
            src={src ?? undefined}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
            className={clsx(
              'h-full w-full object-cover transition-opacity duration-500',
              status === 'loaded' ? 'opacity-100' : 'opacity-0',
              imgClassName,
            )}
          />
          {status === 'loading' && <div className="absolute inset-0 animate-shimmer bg-shimmer" />}
        </>
      )}
    </div>
  );
}
