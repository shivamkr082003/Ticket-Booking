import "./UserAvatar.css";

interface UserAvatarProps {
  name:  string;
  size?: "sm" | "md" | "lg";
}

export default function UserAvatar({ name, size = "md" }: UserAvatarProps) {
  return (
    <div className={`ua ua--${size}`}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}