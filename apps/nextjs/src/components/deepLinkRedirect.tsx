"use client";

import { useState } from "react";
import LoadingSpinner from "@/components/loadingSpinner";
import { Button } from "@/components/ui/button";
import { getTauriPlatform } from "@/components/useNativePlatform";
import { useRunOnce } from "@/components/useRunOnce";
import { env } from "@/env";

export function DeepLinkRedirect() {
  const [showOverlay, setShowOverlay] = useState(false);

  useRunOnce(() => {
    const tryOpenDesktopApp = async () => {
      try {
        const deepLink = `antiwork-helper://${window.location.pathname}${window.location.search}`;

        const result = await new Promise((resolve) => {
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          document.body.appendChild(iframe);

          const timeoutId = setTimeout(() => {
            resolve(false);
            document.body.removeChild(iframe);
          }, 1000);

          window.addEventListener(
            "blur",
            () => {
              // The window being blurred just after opening the deep link indicates the app was opened
              clearTimeout(timeoutId);
              resolve(true);
              document.body.removeChild(iframe);
            },
            { once: true },
          );

          iframe.src = deepLink;
        });

        if (result) {
          setShowOverlay(true);
        }
      } catch (error) {
        console.error("Failed to open desktop app:", error);
      }
    };

    if (
      env.NODE_ENV === "production" &&
      !getTauriPlatform() &&
      !new URLSearchParams(window.location.search).has("skipAppPrompt")
    )
      void tryOpenDesktopApp();
  });

  if (!showOverlay) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <LoadingSpinner size="lg" />
      <p className="text-lg font-medium my-6">Opening in the Helper app...</p>
      <Button variant="subtle" onClick={() => setShowOverlay(false)}>
        Use Helper in your browser
      </Button>
    </div>
  );
}
