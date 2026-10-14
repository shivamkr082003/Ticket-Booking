interface RoleBadgeProps { role: string; }

export default function RoleBadge({ role }: RoleBadgeProps) {
  const r = String(role).toUpperCase();
  const cls = r === "ADMIN" ? "red" : r === "CLIENT" ? "purple" : "blue";
  return <span className={`badge badge-${cls}`}>{role}</span>;
}