import { FONT } from "../../constants";
import type { User } from "../../types";

export function Avatar({ user, size = 28 }: { user: User; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: user.color + "22", border: `2px solid ${user.color}55`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 700, color: user.color,
      flexShrink: 0, fontFamily: FONT,
    }}>
      {user.initials}
    </div>
  );
}
