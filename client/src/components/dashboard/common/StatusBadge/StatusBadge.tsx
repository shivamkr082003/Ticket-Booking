interface StatusBadgeProps { status: string; }

const STYLES: Record<string, { cls: string; label: string; icon: string }> = {
  SUCCESSFUL: { cls: "green",  label: "Confirmed",   icon: "✓" },
  APPROVED:   { cls: "green",  label: "Approved",    icon: "✓" },
  IN_PROCESS: { cls: "yellow", label: "In progress", icon: "⏳" },
  PENDING:    { cls: "yellow", label: "Pending",     icon: "⏳" },
  CANCELLED:  { cls: "red",    label: "Cancelled",   icon: "✕" },
  REJECTED:   { cls: "red",    label: "Rejected",    icon: "✕" },
  EXPIRED:    { cls: "gray",   label: "Expired",     icon: "⌛" },
};

// Status always ships with an icon + label, never colour alone
export default function StatusBadge({ status }: StatusBadgeProps) {
  const s = STYLES[String(status).toUpperCase()] ?? { cls: "gray", label: status, icon: "•" };
  return <span className={`badge badge-${s.cls}`}><span aria-hidden="true">{s.icon}</span>{s.label}</span>;
}
