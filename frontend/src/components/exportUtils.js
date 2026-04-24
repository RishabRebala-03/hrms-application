export const downloadFileFromResponse = async (url, filenameFallback) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Export failed");
  }

  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filenameFallback;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
};
