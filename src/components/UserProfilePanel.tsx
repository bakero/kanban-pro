import { useMemo, useRef, useState } from "react";
import type { User } from "../types";
import { useTheme } from "../hooks/useTheme";
import { Avatar } from "./ui/Avatar";
import { getUserFirstName, getUserLastName, getUserFullName, nameInitials } from "../lib/utils";
import { updateUserProfile, uploadAvatar } from "../lib/db";
import { useLang } from "../i18n";
import type { Lang } from "../i18n";
import { Btn } from "./ui/Btn";

interface UserProfilePanelProps {
  user: User;
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
  onSaved: (user: User) => void;
}

export function UserProfilePanel({ user, isOpen, isMobile, onClose, onSaved }: UserProfilePanelProps) {
  const T = useTheme();
  const { t } = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(getUserFirstName(user));
  const [lastName, setLastName] = useState(getUserLastName(user));
  const [lang, setLang] = useState<Lang>(((user as { lang?: Lang }).lang || "es") as Lang);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar_url || null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  if (!isOpen) return null;

  const wrapperStyle: React.CSSProperties = isMobile
    ? { position: "fixed", inset: 0, zIndex: 600, background: T.overlay, display: "flex", alignItems: "stretch" }
    : { position: "fixed", inset: 0, zIndex: 600, background: T.overlay, display: "flex", justifyContent: "flex-end" };

  const panelStyle: React.CSSProperties = isMobile
    ? { width: "100%", background: T.bgSidebar, padding: 24, overflowY: "auto" }
    : { width: 360, background: T.bgSidebar, padding: 22, borderLeft: `1px solid ${T.border}`, overflowY: "auto" };

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      let nextAvatarUrl = avatarUrl;
      if (file) {
        nextAvatarUrl = await uploadAvatar(user.auth_user_id || user.id, file);
      }
      await updateUserProfile(user.id, { first_name: firstName, last_name: lastName, avatar_url: nextAvatarUrl || null, lang });
      const fullName = `${firstName} ${lastName}`.trim();
      const updated: User = {
        ...user,
        first_name: firstName,
        last_name: lastName,
        name: fullName || user.name,
        initials: nameInitials(fullName || user.name),
        avatar_url: nextAvatarUrl,
        lang,
      };
      onSaved(updated);
    } catch (err) {
      console.error(err);
      setError(t("profile.updateError"));
    } finally {
      setSaving(false);
    }
  }

  function handleFileChange(next?: File | null) {
    if (!next) return;
    const maxSize = 512 * 1024;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (next.size > maxSize) {
      setError(t("profile.fileTooLarge"));
      return;
    }
    if (!allowed.includes(next.type)) {
      setError(t("profile.fileTypeError"));
      return;
    }
    setError(null);
    setFile(next);
  }

  return (
    <div style={wrapperStyle} onClick={onClose}>
      <div style={panelStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: T.text }}>{t("profile.title")}</h2>
          <button onClick={onClose} style={{ border: "none", background: "transparent", color: T.textSoft, cursor: "pointer", fontSize: 18 }}>×</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <Avatar user={{ ...user, avatar_url: previewUrl || avatarUrl }} size={54} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: T.textSoft }}>{t("profile.avatar")}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="outline" onClick={() => fileRef.current?.click()}>{t("profile.upload")}</Btn>
              {avatarUrl && (
                <Btn variant="ghost" onClick={() => { setAvatarUrl(null); setFile(null); }}>
                  {t("profile.remove")}
                </Btn>
              )}
            </div>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={e => handleFileChange(e.target.files?.[0] || null)} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: T.textSoft }}>{t("profile.firstName")}</span>
            <input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              style={{ borderRadius: 10, border: `1px solid ${T.border}`, padding: "9px 10px", background: T.bgElevated, color: T.text }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: T.textSoft }}>{t("profile.lastName")}</span>
            <input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              style={{ borderRadius: 10, border: `1px solid ${T.border}`, padding: "9px 10px", background: T.bgElevated, color: T.text }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: T.textSoft }}>{t("profile.email")}</span>
            <input
              value={user.email}
              readOnly
              style={{ borderRadius: 10, border: `1px solid ${T.border}`, padding: "9px 10px", background: T.bg, color: T.textSoft }}
            />
            <span style={{ fontSize: 11, color: T.textSoft }}>{t("profile.emailLocked")}</span>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: T.textSoft }}>{t("profile.language")}</span>
            <select
              value={lang}
              onChange={e => setLang(e.target.value as Lang)}
              style={{ borderRadius: 10, border: `1px solid ${T.border}`, padding: "9px 10px", background: T.bgElevated, color: T.text }}
            >
              <option value="es">{t("profile.languageEs")}</option>
              <option value="en">{t("profile.languageEn")}</option>
            </select>
          </label>
        </div>

        {error && <p style={{ marginTop: 14, fontSize: 12, color: T.danger }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <Btn variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? t("app.loading") : t("profile.save")}
          </Btn>
          <Btn variant="outline" onClick={onClose}>{t("profile.cancel")}</Btn>
        </div>
      </div>
    </div>
  );
}
