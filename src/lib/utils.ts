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
