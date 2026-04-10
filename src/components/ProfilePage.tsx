import { useMemo, useRef, useState } from "react";
import type { User } from "../types";
import { useTheme } from "../hooks/useTheme";
import type { ThemeMode } from "../hooks/useTheme";
import { Avatar } from "./ui/Avatar";
import { getUserFirstName, getUserLastName, nameInitials } from "../lib/utils";
import { updateUserProfile, uploadAvatar } from "../lib/db";
import { useLang } from "../i18n";
import type { Lang } from "../i18n";
import { Btn } from "./ui/Btn";
import { FONT } from "../constants";

interface ProfilePageProps {
  user: User;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onSaved: (user: User) => void;
  onBack: () => void;
}

export function ProfilePage({ user, themeMode, onThemeChange, onSaved, onBack }: ProfilePageProps) {
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
      setError(t("profile.fileType"));
      return;
    }
    setFile(next);
    setError(null);
  }

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    fontSize: 13,
    borderRadius: 10,
    border: `1px solid ${T.border}`,
    padding: "9px 10px",
    backgroundColor: T.bgElevated,
    color: T.text,
  };

  return (
    <div style={{ padding: 24, fontFamily: FONT, color: T.text, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button onClick={onBack} style={{ border: "none", background: "transparent", color: T.textSoft, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
          {t("common.back")}
        </button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{t("menu.openProfile")}</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 20 }}>
        <div style={{ background: T.bgSidebar, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: T.textSoft }}>{t("profile.photo")}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {previewUrl ? <img src={previewUrl} alt={user.name} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} /> : <Avatar user={{ ...user, avatar_url: avatarUrl }} size={64} />}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Btn onClick={() => fileRef.current?.click()}>{t("profile.changePhoto")}</Btn>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={e => handleFileChange(e.target.files?.[0] || null)}
              />
              {avatarUrl && (
                <button
                  onClick={() => { setAvatarUrl(null); setFile(null); }}
                  style={{ border: "none", background: "transparent", color: T.textSoft, cursor: "pointer", fontSize: 11 }}
                >
                  {t("profile.removePhoto")}
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ background: T.bgSidebar, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: T.textSoft }}>{t("profile.info")}</p>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: T.textSoft }}>{t("profile.firstName")}</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.textSoft }}>{t("profile.lastName")}</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.textSoft }}>{t("profile.email")}</label>
              <input value={user.email} readOnly style={{ ...fieldStyle, opacity: 0.7 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.textSoft }}>{t("profile.language")}</label>
              <select value={lang} onChange={e => setLang(e.target.value as Lang)} style={fieldStyle}>
                <option value="es">Espanol</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.textSoft }}>{t("theme.title")}</label>
              <select value={themeMode} onChange={e => onThemeChange(e.target.value as ThemeMode)} style={fieldStyle}>
                <option value="system">{t("theme.system")}</option>
                <option value="light">{t("theme.light")}</option>
                <option value="dark">{t("theme.dark")}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && <p style={{ marginTop: 12, color: T.danger, fontSize: 12 }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <Btn onClick={handleSave} disabled={saving}>{saving ? t("profile.saving") : t("profile.save")}</Btn>
      </div>
    </div>
  );
}
