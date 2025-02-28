import { useEffect, useState } from "react";
import { HelperWidgetConfig, ReadPageToolConfig } from "@/sdk/types";

export function useReadPageTool(
  token: string | null,
  config: HelperWidgetConfig | null,
  pageHTML: string | null,
  currentURL: string | null,
) {
  const [readPageToolCall, setReadPageToolCall] = useState<ReadPageToolConfig | null>(null);

  useEffect(() => {
    const fetchReadPageTool = async () => {
      if (!token || !config?.experimental_read_page || !pageHTML) return;

      try {
        const response = await fetch(`${window.location.origin}/api/widget/read-page-tool`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pageHTML,
            currentURL,
          }),
        });

        if (!response.ok) {
          console.error("Failed to fetch read page tool");
          return;
        }

        const data = await response.json();
        if (data.readPageTool) {
          setReadPageToolCall(data.readPageTool);
        }
      } catch (error) {
        console.error("Failed to fetch read page tool:", error);
      }
    };

    void fetchReadPageTool();
  }, [token, config?.experimental_read_page, pageHTML, currentURL]);

  return { readPageToolCall };
}
