import AppProviders from "./app/providers/AppProviders";
import AppRouter from "./app/routes/AppRouter";
import ErrorBoundary from "./app/providers/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </ErrorBoundary>
  );
}
