import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { Component, type ReactNode } from "react";
import DashboardLayout from "./components/DashboardLayout";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import ProfileSetupModal from "./components/ProfileSetupModal";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserProfile, useGetUserBooks } from "./hooks/useQueries";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";

// ─── Error Boundary ──────────────────────────────────────────────────────────
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex h-screen items-center justify-center p-6">
            <div className="text-center max-w-md">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-destructive text-2xl">!</span>
              </div>
              <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
              <p className="text-muted-foreground text-sm mb-4">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
          <Toaster />
        </ThemeProvider>
      );
    }
    return this.props.children;
  }
}

// ─── App Shell ───────────────────────────────────────────────────────────────
function AppShell() {
  const { identity, isInitializing } = useInternetIdentity();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
    isError: profileError,
  } = useGetCallerUserProfile();
  const { isError: booksError } = useGetUserBooks();

  const isAuthenticated = !!identity;

  // Show loading state while Internet Identity initialises
  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <PWAInstallPrompt />
      </>
    );
  }

  // If user profile query failed/errored or books query errored, still proceed
  // to DashboardLayout (it handles the error states internally)
  const profileFinished = !profileLoading || profileError;

  // Show loading while profile is being fetched for the first time
  if (!isFetched && !profileError && profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Setting up your workspace…</p>
        </div>
      </div>
    );
  }

  // Show profile setup modal if user is authenticated but has no profile yet
  const showProfileSetup =
    isAuthenticated &&
    profileFinished &&
    isFetched &&
    userProfile === null &&
    !profileError;

  return (
    <>
      {showProfileSetup ? (
        <>
          <HomePage />
          <ProfileSetupModal open={showProfileSetup} />
        </>
      ) : (
        <DashboardLayout booksError={booksError} />
      )}
      <PWAInstallPrompt />
    </>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppErrorBoundary>
        <AppShell />
      </AppErrorBoundary>
      <Toaster />
    </ThemeProvider>
  );
}
