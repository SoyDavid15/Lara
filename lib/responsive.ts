import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Baseline dimensions based on iPhone X/11/12/13/14
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Scale horizontally based on screen width.
 * Useful for width, padding, margin, left, right, etc.
 */
export const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;

/**
 * Scale vertically based on screen height.
 * Useful for height, top, bottom, etc.
 */
export const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;

/**
 * Moderate scale for values that shouldn't grow too aggressively on large screens.
 * Useful for font sizes, border radius, etc.
 * @param factor 0.5 means it grows at 50% of the screen width ratio.
 */
export const ms = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

/**
 * Specifically for fonts, keeping them crisp and respecting pixel density.
 */
export const fs = (size: number) => {
  const newSize = size * (SCREEN_WIDTH / BASE_WIDTH);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };
