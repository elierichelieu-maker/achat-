import React from 'react';

interface WaterBottleLogoProps {
  className?: string;
  size?: number;
}

export const WaterBottleLogo: React.FC<WaterBottleLogoProps> = ({
  className = 'w-5 h-5 text-white',
  size = 20,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Dessin bouteille d'eau"
    >
      {/* Bouchon de la bouteille avec stries / Bottle Cap with ridges */}
      <rect x="9.5" y="1.2" width="5" height="2.2" rx="0.5" fill="currentColor" />
      <line x1="11" y1="1.2" x2="11" y2="3.4" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <line x1="13" y1="1.2" x2="13" y2="3.4" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />

      {/* Bague collerette / Collar safety ring */}
      <rect x="9" y="3.6" width="6" height="0.8" rx="0.3" fill="currentColor" opacity="0.9" />

      {/* Corps élégant de la bouteille d'eau minérale / Mineral Water Bottle Contour */}
      <path
        d="M10.2 4.4V6.2C10.2 6.8 9.5 7.4 8.7 8.2C7.8 9 7.4 10 7.3 11.2L7.1 18.2C7.0 19.8 8.3 21.2 9.9 21.2H14.1C15.7 21.2 17.0 19.8 16.9 18.2L16.7 11.2C16.6 10 16.2 9 15.3 8.2C14.5 7.4 13.8 6.8 13.8 6.2V4.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Vaguelette d'eau pure / Water wave line */}
      <path
        d="M7.8 12.8C8.8 12.1 10.1 13.3 11.8 12.6C13.2 12.0 14.5 13.1 16.2 12.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Goutte d'eau stylisée au centre / Water droplet */}
      <path
        d="M12 14.4C12 14.4 10.7 15.9 10.7 16.7C10.7 17.5 11.3 18.1 12 18.1C12.7 18.1 13.3 17.5 13.3 16.7C13.3 15.9 12 14.4 12 14.4Z"
        fill="currentColor"
      />

      {/* Stries de préhension ergonomiques / Bottle grip ridges */}
      <path d="M8.3 9.8H15.7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <path d="M8.4 19.8H15.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
};
