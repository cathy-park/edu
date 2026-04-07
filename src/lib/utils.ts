/**
 * Returns a dynamic pastel badge color class based on the stage's index in the project's stages array.
 * @param stageName The name of the stage
 * @param stagesArray The array of all stages for the project
 * @returns A CSS class name (e.g., 'badge-p1', 'badge-p2')
 */
export function getStageColorClass(stageName: string, stagesArray: string[]): string {
  if (!stagesArray || !Array.isArray(stagesArray) || stagesArray.length === 0) {
    return '';
  }
  
  const index = stagesArray.indexOf(stageName);
  if (index === -1) return '';
  
  // Return badge-p1 to badge-p8 based on index
  return `badge-p${(index % 8) + 1}`;
}

/**
 * Robust date formatter for YYYY-MM-DD HH:mm
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    // 2026-04-08T00:00:00+00:00 -> 2026-04-08 20:01
    const base = dateStr.replace('T', ' ').split('.')[0];
    const clean = base.replace(/(\+\d{2}:\d{2}|Z)$/, '').trim();
    const datePart = clean.split(' ')[0];
    const timePart = clean.split(' ')[1]?.slice(0, 5) || '00:00';
    return `${datePart} ${timePart}`;
  } catch {
    return dateStr.slice(0, 16).replace('T', ' ');
  }
}
