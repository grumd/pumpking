export const labelToTypeLevel = (label: string) => {
  const [type, level] = label?.match(/(\D+)|(\d+)/g) ?? [];
  return [type ?? '', level];
};
