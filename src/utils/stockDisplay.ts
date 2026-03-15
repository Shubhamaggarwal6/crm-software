import { Product } from '@/types';

/**
 * Format stock display with carton + loose breakdown
 * Stock is always stored in loose units internally
 */
export function formatStockDisplay(
  stockInLoose: number,
  piecesPerCarton: number,
  unit: string = 'Pcs',
  cartonUnitName: string = 'Carton'
): string {
  if (piecesPerCarton <= 1) return `${stockInLoose} ${unit}`;
  
  const fullCartons = Math.floor(stockInLoose / piecesPerCarton);
  const remaining = stockInLoose % piecesPerCarton;
  
  if (remaining === 0 && fullCartons > 0) {
    return `${stockInLoose} ${unit} (${fullCartons} ${cartonUnitName}${fullCartons > 1 ? 's' : ''})`;
  }
  if (fullCartons === 0) {
    return `${stockInLoose} ${unit} (0 ${cartonUnitName}s + ${remaining} Loose ${unit})`;
  }
  return `${stockInLoose} ${unit} (${fullCartons} ${cartonUnitName}${fullCartons > 1 ? 's' : ''} + ${remaining} Loose ${unit})`;
}

/**
 * Get stock display for a product based on its selling_unit_type
 */
export function getProductStockDisplay(product: Product): string {
  if (product.sellingUnitType === 'loose') {
    return `${product.stock} ${product.unit}`;
  }
  return formatStockDisplay(
    product.stock,
    product.piecesPerCarton || 1,
    product.unit,
    product.cartonUnitName || 'Carton'
  );
}

/**
 * Format min stock display with carton breakdown
 */
export function formatMinStockDisplay(
  minStock: number,
  piecesPerCarton: number,
  unit: string = 'Pcs',
  cartonUnitName: string = 'Carton'
): string {
  if (piecesPerCarton <= 1) return `${minStock} ${unit}`;
  const fullCartons = Math.floor(minStock / piecesPerCarton);
  const remaining = minStock % piecesPerCarton;
  if (remaining === 0 && fullCartons > 0) {
    return `${minStock} ${unit} (${fullCartons} ${cartonUnitName}${fullCartons > 1 ? 's' : ''})`;
  }
  if (fullCartons === 0) return `${minStock} ${unit}`;
  return `${minStock} ${unit} (${fullCartons} ${cartonUnitName}${fullCartons > 1 ? 's' : ''} + ${remaining} ${unit})`;
}

/**
 * Get unit type badge info
 */
export function getUnitTypeBadge(product: Product): { label: string; className: string } {
  switch (product.sellingUnitType) {
    case 'carton':
      return { label: product.cartonUnitName || 'Carton', className: 'bg-blue-100 text-blue-700' };
    case 'both':
      return { label: `${product.unit} / ${product.cartonUnitName || 'Carton'}`, className: 'bg-purple-100 text-purple-700' };
    default:
      return { label: product.unit, className: 'bg-muted text-muted-foreground' };
  }
}
