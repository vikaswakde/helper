import { useAuth } from "@clerk/clerk-expo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import superjson from "superjson";
import { API } from "@/types/api";
import { getBaseUrl } from "./baseUrl";

/**
 * A set of typesafe hooks for consuming your API.
 */
export const api = createTRPCReact<API>();

export type RouterOutputs = inferRouterOutputs<API>;

/**
 * A wrapper for your app that provides the TRPC context.
 * Use only in _app.tsx
 */
export function TRPCProvider(props: { children: React.ReactNode }) {
  const { getToken, signOut } = useAuth();
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" || (opts.direction === "down" && opts.result instanceof Error),
          colorMode: "ansi",
        }),
        httpLink({
          transformer: superjson,
          url: `${getBaseUrl()}/api/trpc/lambda`,
          async headers() {
            const headers = new Map<string, string>();
            headers.set("x-trpc-source", "expo-react");

            const token = await getToken();
            if (token) headers.set("Authorization", `Bearer ${token}`);

            return Object.fromEntries(headers);
          },
          fetch(url, options) {
            return fetch(url, options).then(async (response) => {
              if (response.status === 401) {
                await signOut();
              }
              return response;
            });
          },
        }),
      ],
    }),
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
    </api.Provider>
  );
}
