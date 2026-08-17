import type { ComponentPropsWithoutRef } from 'react';

import eightStateLogoUrl from '../assets/eightstate-logo.jpg';

export type LogoProps = {
  className?: string;
  size?: 'sm' | 'md';
  animateOnHover?: boolean;
  'aria-label'?: string;
};

type LogoMarkProps = Omit<ComponentPropsWithoutRef<'span'>, 'children'>;

export function LogoWithoutText({
  className,
  'aria-label': ariaLabel = 'EightState',
  ...props
}: LogoMarkProps) {
  const isHidden = props['aria-hidden'] === true || props['aria-hidden'] === 'true';

  return (
    <span
      {...props}
      role={isHidden ? undefined : 'img'}
      aria-label={isHidden ? undefined : ariaLabel}
      className={['eightstate-logo-mark', className].filter(Boolean).join(' ')}
    >
      <img className="eightstate-logo-mark__image" src={eightStateLogoUrl} alt="" aria-hidden="true" />
    </span>
  );
}

export function Logo({ className, size = 'md', animateOnHover = false, 'aria-label': ariaLabel }: LogoProps) {
  return (
    <LogoWithoutText
      aria-label={ariaLabel}
      className={[
        'eightstate-logo',
        size === 'sm' ? 'w-6' : 'w-10',
        animateOnHover ? 'eightstate-logo--interactive' : undefined,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
