// Utility functions for market results components

export const parseDataFrame = (
  dfData: any,
): { columns: any[]; index: any[]; data: any[][] } => {
  if (!dfData || !dfData.columns || !dfData.index || !dfData.values) {
    return { columns: [], index: [], data: [] };
  }

  return {
    columns: dfData.columns,
    index: dfData.index,
    data: dfData.values,
  };
};

export const parseDataFrameToDict = (dfData: any): { [key: string]: any } => {
  console.log("parseDataFrameToDict input:", dfData);

  if (!dfData || !dfData.columns || !dfData.index || !dfData.values) {
    console.log("Missing required properties in dfData");
    return {};
  }

  // Create dictionary from index and data
  const dict: { [key: string]: any } = {};

  console.log("Index:", dfData.index);
  console.log("Values:", dfData.values);

  // Handle different data structures
  if (Array.isArray(dfData.index) && Array.isArray(dfData.values)) {
    // Case 1: Standard structure with separate index and values arrays
    dfData.index.forEach((key: string, i: number) => {
      if (dfData.values[i] !== undefined) {
        dict[key] = dfData.values[i];
      }
    });
  } else if (typeof dfData === "object" && dfData.index && dfData.values) {
    // Case 2: Try to match index with values[0] array
    const valuesArray = Array.isArray(dfData.values)
      ? dfData.values
      : [dfData.values];
    const indexArray = Array.isArray(dfData.index)
      ? dfData.index
      : [dfData.index];

    if (valuesArray.length > 0 && Array.isArray(valuesArray[0])) {
      const firstRow = valuesArray[0];
      indexArray.forEach((key: string, i: number) => {
        if (i < firstRow.length) {
          dict[key] = firstRow[i];
        }
      });
    }
  }

  console.log("parseDataFrameToDict output:", dict);
  return dict;
};

export const formatNumber = (value: any, decimals: number = 1): string => {
  if (typeof value === "number") {
    return value.toFixed(decimals);
  }
  if (typeof value === "string") {
    const num = parseFloat(value);
    return isNaN(num) ? value : num.toFixed(decimals);
  }
  return String(value);
};
