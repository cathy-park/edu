'use client';

import React, { useState } from 'react';
import { Star, StarHalf } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ 
  value, 
  onChange, 
  readonly = false,
  size = 20 
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue !== null ? hoverValue : value;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    if (readonly || !onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    setHoverValue(index + (isHalf ? 0.5 : 1));
  };

  const handleClick = (index: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (readonly || !onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    onChange(index + (isHalf ? 0.5 : 1));
  };

  return (
    <div 
      className="star-rating-container" 
      style={{ display: 'inline-flex', gap: 2 }}
      onMouseLeave={() => setHoverValue(null)}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const full = displayValue >= index + 1;
        const half = displayValue >= index + 0.5 && displayValue < index + 1;

        return (
          <div
            key={index}
            style={{ cursor: readonly ? 'default' : 'pointer', position: 'relative' }}
            onMouseMove={(e) => handleMouseMove(e, index)}
            onClick={(e) => handleClick(index, e)}
          >
            {half ? (
              <div style={{ position: 'relative' }}>
                <Star size={size} color="var(--border)" fill="transparent" />
                <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', overflow: 'hidden' }}>
                  <Star size={size} color="var(--yellow)" fill="var(--yellow)" />
                </div>
              </div>
            ) : (
              <Star 
                size={size} 
                color={full ? "var(--yellow)" : "var(--border)"} 
                fill={full ? "var(--yellow)" : "transparent"} 
              />
            )}
          </div>
        );
      })}
      {!readonly && (
        <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 700, minWidth: 24, color: 'var(--text-secondary)' }}>
          {displayValue.toFixed(1)}
        </span>
      )}
    </div>
  );
};
