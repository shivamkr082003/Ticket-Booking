import "./StatCard.css";

interface StatCardProps {
  label:   string;
  value:   string | number;
  icon:    string;
  color:   string;
  onClick?: () => void;
}

export default function StatCard({ label, value, icon, color, onClick }: StatCardProps) {
  return (
    <div className="sc-card" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <div className="sc-icon" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div>
        <p className="sc-value">{value}</p>
        <p className="sc-label">{label}</p>
      </div>
    </div>
  );
}