import { useAuth } from "../../context/AuthContext";
import AdminPanel from "./AdminPanel.tsx";
import ClientPanel from "./ClientPanel.tsx";

/**
 * Smart router — renders AdminPanel or ClientPanel
 * based on logged-in user's role.
 */
export default function AdminDashboard() {
  const { user } = useAuth();
  const role = (user?.userRole ?? "").toUpperCase();

  if (role === "ADMIN") return <AdminPanel />;
  if (role === "CLIENT") return <ClientPanel />;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg-base)",
      color: "rgba(var(--fg-rgb),0.4)", fontSize: 16,
    }}>
      Access denied. Your account may be pending approval.
    </div>
  );
}