import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PlannerShell } from "@/components/PlannerShell";

export default function App() {
  return (
    <ErrorBoundary>
      <PlannerShell />
    </ErrorBoundary>
  );
}
