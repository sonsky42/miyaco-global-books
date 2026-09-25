import { InternetIdentityProvider } from "@caffeineai/core-infrastructure";
import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

// Global query defaults: cap retries to prevent infinite loading, add staleTime
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (result) => {
      if (
        result &&
        typeof result === "object" &&
        "__kind__" in result &&
        result.__kind__ === "err"
      )
        return;
      // A transaction affects inventory, customers, statements and reports together.
      return queryClient.invalidateQueries();
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 s — avoid refetching immediately on focus
      retry: 1, // only one retry on failure, then show error
      retryDelay: 2_000, // wait 2 s between retries
    },
    mutations: {
      retry: 0, // never auto-retry mutations
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <InternetIdentityProvider>
      <App />
    </InternetIdentityProvider>
  </QueryClientProvider>,
);
