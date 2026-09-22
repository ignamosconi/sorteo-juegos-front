import type React from 'react';

const SPORT_CATEGORY_COLORS: Record<string, string> = {
  'fútbol-masculino':  '#84CC16',
  'fútbol-femenino':   '#06B6D4',
  'básquet-masculino': '#F59E0B',
  'básquet-femenino':  '#F43F5E',
  'vóley-masculino':   '#6366F1',
  'vóley-femenino':    '#8B5CF6',
};

export function getSportCategoryStyle(
  sportName: string,
  categoryName: string
): React.CSSProperties {
  const key = `${sportName.trim().toLowerCase()}-${categoryName.trim().toLowerCase()}`;
  const hex = SPORT_CATEGORY_COLORS[key];
  if (!hex) return {};
  return {
    background:  `light-dark(${hex}22, ${hex}33)`,
    color:       `light-dark(${hex}DD, ${hex})`,
    borderColor: `light-dark(${hex}55, ${hex}44)`,
  };
}