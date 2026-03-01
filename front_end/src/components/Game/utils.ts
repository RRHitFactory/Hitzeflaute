// Utility functions for market results components

export const parseDataFrame = (dfData: any): { columns: any[], index: any[], data: any[][] } => {
  if (!dfData || !dfData.columns || !dfData.index || !dfData.values) {
    return { columns: [], index: [], data: []};
  }
  
  return {
    columns: dfData.columns,
    index: dfData.index,
    data: dfData.values
  };
};

export const formatNumber = (value: any, decimals: number = 1): string => {
  if (typeof value === 'number') {
    return value.toFixed(decimals);
  }
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? value : num.toFixed(decimals);
  }
  return String(value);
};