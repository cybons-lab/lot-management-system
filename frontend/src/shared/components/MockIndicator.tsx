import { useEffect, useState } from "react";

import { MOCK_STATUS_EVENT } from "@/shared/api/http-client";

/**
 * Mock Data Indicator
 *
 * Appears when the backend returns data with X-Mock-Status: true header.
 * Helps developers and users distinguish between real and mock data.
 */
export const MockIndicator = () => {
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    const handleMockStatus = (event: Event) => {
      const customEvent = event as CustomEvent<{ isMock: boolean }>;
      if (customEvent.detail.isMock) {
        setIsMock(true);

        // Auto-hide after 5 seconds to avoid annoyance?
        // Or keep it? Plan says "distinct indicator".
        // Let's keep it visible but allow dismissing or auto-hide.
        // For now, persistent if detected in session or recently.
        // Actually, let's make it show for 3 seconds whenever mock data is received?
        // Or stick boolean state?
        // If we want "this page has mock data", it should probably persist until navigation?
        // But navigation is client-side.
        // Simple approach: Show for 5 seconds.
        setTimeout(() => setIsMock(false), 5000);
      }
    };

    window.addEventListener(MOCK_STATUS_EVENT, handleMockStatus);
    return () => {
      window.removeEventListener(MOCK_STATUS_EVENT, handleMockStatus);
    };
  }, []);

  if (!isMock) return null;

  return (
    <div
      className="animate-fade-in-up fixed right-4 bottom-4 z-50 rounded border-l-4 border-yellow-500 bg-yellow-100 p-4 text-yellow-700 shadow-lg"
      role="alert"
    >
      <div className="flex items-center">
        <div className="py-1">
          <svg
            className="mr-4 h-6 w-6 text-yellow-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <p className="font-bold">Mock Data Detected</p>
          <p className="text-sm">Response contains mock data.</p>
        </div>
      </div>
    </div>
  );
};
