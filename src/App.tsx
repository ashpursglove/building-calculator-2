import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PlannerShell } from "@/components/PlannerShell";

export default function App() {
  return (
    <ErrorBoundary>
      <div className="h-full min-h-0 overflow-hidden">
        <PlannerShell />
      </div>
    </ErrorBoundary>
  );
}
