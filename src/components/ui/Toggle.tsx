import { useTheme } from "../../hooks/useTheme";

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const T = useTheme();
  return (
    <div onClick={() => onChange(!on)} style={{
      width: 42, height: 24, borderRadius: 12,
      backgroundColor: on ? "#7F77DD" : T.bgSoft,
      border: `1.5px solid ${T.border}`,
      cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: "50%", backgroundColor: "#fff",
        position: "absolute", top: 2, left: on ? 20 : 2,
        transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.25)",
      }} />
    </div>
  );
}
