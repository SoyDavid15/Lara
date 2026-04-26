/**
 * responsive.ts
 *
 * Utilidades de escalado para hacer la UI responsiva en distintos tamaños de pantalla.
 *
 * El problema:
 *   Si escribes `fontSize: 16`, ese 16 se ve bien en un iPhone 12, pero puede
 *   verse muy pequeño en una tablet o muy grande en un teléfono pequeño.
 *
 * La solución:
 *   Calcular el tamaño relativo al ancho/alto real del dispositivo,
 *   usando como referencia un dispositivo base (iPhone X/11/12/13/14 → 375×812 px).
 *
 * Cómo usar:
 *   import { scale, verticalScale, ms, fs } from '@/lib/responsive';
 *
 *   fontSize: fs(16)           → fuente de 16 escalada
 *   paddingHorizontal: scale(20) → padding horizontal escalado
 *   borderRadius: ms(12)       → radio escalado moderadamente
 */

import { Dimensions, PixelRatio } from 'react-native';

// Tamaño real de la pantalla del dispositivo actual
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dimensiones base de referencia (iPhone X/11/12/13/14)
const BASE_WIDTH  = 375;
const BASE_HEIGHT = 812;

/**
 * scale(size) — Escala horizontal
 *
 * Escala un valor proporcionalmente al ANCHO de la pantalla.
 * Úsalo para: paddingHorizontal, marginHorizontal, width fijos, left, right.
 *
 * Ejemplo: scale(20) en iPhone 12 (375px) → 20
 *          scale(20) en tablet   (768px) → 40.96
 */
export const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;

/**
 * verticalScale(size) — Escala vertical
 *
 * Escala un valor proporcionalmente al ALTO de la pantalla.
 * Úsalo para: paddingVertical, marginVertical, height fijos, top, bottom.
 *
 * Ejemplo: verticalScale(50) en iPhone 12 (812px) → 50
 *          verticalScale(50) en iPhone SE  (667px) → 41
 */
export const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;

/**
 * ms(size, factor?) — Escala moderada (Moderate Scale)
 *
 * Escala a un ritmo moderado controlado por el factor.
 * - factor = 0 → no escala (tamaño fijo)
 * - factor = 0.5 → crece a la mitad del ratio (por defecto)
 * - factor = 1 → igual que scale()
 *
 * Úsalo para: borderRadius, padding, iconos, componentes que no deben crecer demasiado.
 */
export const ms = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

/**
 * fs(size) — Escala de fuente (Font Scale)
 *
 * Escala el tamaño de fuente proporcionalmente al ancho de pantalla,
 * y lo redondea al pixel más cercano para que el texto sea nítido.
 *
 * Siempre úsalo para `fontSize` en lugar de un número fijo.
 *
 * Ejemplo: fs(16) en iPhone 12 → 16
 *          fs(16) en tablet   → ~32 (redondeado al pixel)
 */
export const fs = (size: number) => {
  const newSize = size * (SCREEN_WIDTH / BASE_WIDTH);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Exportar dimensiones por si algún componente las necesita directamente
export { SCREEN_WIDTH, SCREEN_HEIGHT };
