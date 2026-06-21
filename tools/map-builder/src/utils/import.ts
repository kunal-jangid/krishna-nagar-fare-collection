/**
 * Extremely basic parser to extract a 2D array from a string matching the format:
 * export const LANE_MAP = [
 *   [0, 1, ...],
 *   ...
 * ];
 */
export function parseLaneMap(content: string): number[][] | null {
  try {
    // 1. Find the content between the first [ and the matching last ] for the outer array
    // We look for LANE_MAP = [ and find everything until the last ];
    const startIdx = content.indexOf('LANE_MAP = [');
    if (startIdx === -1) return null;

    const arrayStart = content.indexOf('[', startIdx);
    const arrayEnd = content.lastIndexOf(']');

    if (arrayStart === -1 || arrayEnd === -1) return null;

    const arrayString = content.substring(arrayStart, arrayEnd + 1);

    // 2. We can try to use JSON.parse if we clean it up,
    // but the file might have trailing commas which JSON doesn't like.
    // A safer way is to split by rows and parse manually.

    // Extract everything between [[ and ]]
    const rowsMatch = arrayString.match(/\[\s*([\d\s,]+)\s*\]/g);
    if (!rowsMatch) return null;

    const grid: number[][] = rowsMatch.map(rowStr => {
      // rowStr looks like "[0, 0, 1, ...]"
      const cleanStr = rowStr.replace(/[\[\]\s]/g, '');
      return cleanStr.split(',').filter(s => s !== '').map(Number);
    });

    return grid.length > 0 ? grid : null;
  } catch (e) {
    console.error('Failed to parse laneMap content:', e);
    return null;
  }
}
