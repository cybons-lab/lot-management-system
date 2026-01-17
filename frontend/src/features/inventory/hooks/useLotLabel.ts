import { useState } from "react";

import { downloadLotLabels } from "../api";

export function useLotLabel() {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadLabels = async (lotIds: number[]) => {
    if (lotIds.length === 0) return;

    try {
      setIsDownloading(true);
      const blob = await downloadLotLabels(lotIds);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lot_labels_${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download labels:", error);
      // You might want to show a toast here
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    downloadLabels,
    isDownloading,
  };
}
