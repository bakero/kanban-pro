import { AdminConsolePage } from "../../admin/AdminConsolePage";
import type { User } from "../../types";

interface SuperAdminPageProps {
  currentUser: User;
  onBack: () => void;
}

export function SuperAdminPage({ currentUser, onBack }: SuperAdminPageProps) {
  return <AdminConsolePage currentUser={currentUser} onBack={onBack} />;
}
