import { ProtectedRoute } from "@/src/miracoli/components/ProtectedRoute";
import { BatchReviewDashboard } from "@/src/miracoli/pantry/BatchReviewDashboard";

export const dynamic = "force-dynamic";

export default function AdminIngestionPage() {
  return (
    <ProtectedRoute
      title="Ingestion Vault"
      description="This route is reserved for the Miracoli master ingestion workflow."
      bootstrapMasterAdminSession
    >
      <BatchReviewDashboard />
    </ProtectedRoute>
  );
}
