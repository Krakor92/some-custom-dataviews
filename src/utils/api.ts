export const whichQueryAPI = <T extends Record<string, unknown>>(
  result: T[] | T
): string =>
  Array.isArray(result) ? _whichQueryAPI(result[0]) : _whichQueryAPI(result);

/**
 * @param result
 * @returns the name of the query API that was used to retrieve the result
 */
const _whichQueryAPI = (result: Record<string, unknown>): string => {
  if (result.vault) return "native";
  if (result.file) return "dataview";
  if (result.$file) return "datacore";

  return "unknown";
};
