import { Image } from 'expo-image';

import { ASSETS, LOGO_ASPECT_RATIO } from '../assets';

type LogoProps = {
  variant?: 'color' | 'white';
  width?: number;
};

export function Logo({ variant = 'color', width = 220 }: LogoProps) {
  return (
    <Image
      source={variant === 'color' ? ASSETS.logoColor : ASSETS.logoWhite}
      style={{ width, aspectRatio: LOGO_ASPECT_RATIO }}
      contentFit="contain"
      role="img"
      aria-label="Ransa 360"
    />
  );
}
