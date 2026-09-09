import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, User, Loader2 } from "lucide-react";
import { useViewerProfile, AVATAR_COLORS } from "@/hooks/useViewerProfile";
import type { ViewerProfile } from "@/lib/supabase";
import { AVATAR_ICONS, getAvatarIcon, type AvatarIconId } from "@/data/avatarIcons";
import type { Category } from "@/data/catalog";

type ProfileSelectorProps = {
  onSelect: () => void;
};

const KID_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#14b8a6"];
const PROFILE_CATEGORIES: Category[] = [
  "Prophètes",
  "Compagnons",
  "Anges & Djinns",
  "Eschatologie",
  "Miracles du Coran",
  "Héros & Personnages",
  "Histoire & Mystère",
];

function ProfileAvatar({
  profile,
  size = "lg",
  editing = false,
}: {
  profile: ViewerProfile;
  size?: "lg" | "md";
  editing?: boolean;
}) {
  const dim = size === "lg" ? "w-28 h-28 sm:w-36 sm:h-36" : "w-12 h-12";
  const textSize = size === "lg" ? "text-4xl sm:text-5xl" : "text-lg";
  return (
    <div
      className={`${dim} rounded-2xl flex items-center justify-center ${textSize} font-bold text-white relative overflow-hidden shadow-xl`}
      style={{ backgroundColor: profile.avatar_color }}
    >
      {(() => {
        const Icon = getAvatarIcon(profile.avatar_icon);
        return Icon ? <Icon size={size === "lg" ? 52 : 22} strokeWidth={1.5} /> : profile.name.charAt(0).toUpperCase();
      })()}
      {editing && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Pencil size={size === "lg" ? 28 : 16} className="text-white" />
        </div>
      )}
    </div>
  );
}

function AvatarIconPicker({
  value,
  onChange,
}: {
  value?: AvatarIconId;
  onChange: (value: AvatarIconId) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {AVATAR_ICONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          title={label}
          aria-label={label}
          onClick={() => onChange(id)}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
            value === id
              ? "bg-emerald-600 text-white ring-1 ring-emerald-300"
              : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
          }`}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}

export default function ProfileSelector({ onSelect }: ProfileSelectorProps) {
  const {
    profiles,
    loading,
    createProfile,
    updateProfile,
    deleteProfile,
    selectProfile,
    verifyProfilePin,
    refresh,
  } = useViewerProfile();

  const [manageMode, setManageMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editIsKid, setEditIsKid] = useState(false);
  const [editPin, setEditPin] = useState("");
  const [removeEditPin, setRemoveEditPin] = useState(false);
  const [editAvatarIcon, setEditAvatarIcon] = useState<AvatarIconId | undefined>();
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(AVATAR_COLORS[0]);
  const [newIsKid, setNewIsKid] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [newAvatarIcon, setNewAvatarIcon] = useState<AvatarIconId>("moon");
  const [newCategories, setNewCategories] = useState<Category[]>([]);
  const [pinProfile, setPinProfile] = useState<ViewerProfile | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdd = profiles.length < 4;

  const handleSelect = (profile: ViewerProfile) => {
    if (manageMode) return;
    if (profile.pin_code) {
      setPinProfile(profile);
      setPinInput("");
      setError(null);
      return;
    }
    selectProfile(profile);
    onSelect();
  };

  const startEdit = (p: ViewerProfile) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditColor(p.avatar_color);
    setEditIsKid(p.is_kid);
    setEditPin("");
    setRemoveEditPin(false);
    setEditAvatarIcon((p.avatar_icon as AvatarIconId | null) ?? undefined);
    setAddingNew(false);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
    setEditIsKid(false);
    setEditPin("");
    setRemoveEditPin(false);
    setEditAvatarIcon(undefined);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    if (editPin && !/^\d{4}$/.test(editPin)) {
      setError("Le PIN doit contenir exactement 4 chiffres.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await updateProfile(id, {
      name: editName.trim(),
      color: editColor,
      isKid: editIsKid,
      ...(editAvatarIcon ? { avatarIcon: editAvatarIcon } : {}),
      ...(removeEditPin ? { pinCode: "" } : editPin ? { pinCode: editPin } : {}),
    });
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    cancelEdit();
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    setError(null);
    const { error } = await deleteProfile(id);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    await refresh();
  };

  const startAdd = () => {
    setAddingNew(true);
    setNewName("");
    setNewColor(AVATAR_COLORS[profiles.length % AVATAR_COLORS.length]);
    setNewIsKid(false);
    setNewPin("");
    setNewAvatarIcon("moon");
    setNewCategories([]);
    setEditingId(null);
    setError(null);
  };

  const cancelAdd = () => {
    setAddingNew(false);
    setNewName("");
    setNewIsKid(false);
    setNewPin("");
    setNewAvatarIcon("moon");
    setNewCategories([]);
  };

  const saveAdd = async () => {
    if (!newName.trim()) return;
    if (newPin && !/^\d{4}$/.test(newPin)) {
      setError("Le PIN doit contenir exactement 4 chiffres.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await createProfile(newName.trim(), newColor, newIsKid, newPin || undefined, newAvatarIcon, newCategories);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    cancelAdd();
    await refresh();
  };

  const colorPalette = newIsKid ? KID_COLORS : AVATAR_COLORS;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 size={40} className="text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-16">
      <h1 className="text-white text-3xl sm:text-5xl font-black mb-2 tracking-tight">
        {manageMode ? "Gérer les profils" : "Qui regarde ?"}
      </h1>
      <p className="text-zinc-500 text-sm sm:text-base mb-10">
        {manageMode
          ? "Modifiez ou supprimez vos profils spectateurs"
          : "Sélectionnez votre profil pour continuer"}
      </p>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm max-w-md">
          {error}
        </div>
      )}

      {/* Profile grid */}
      <div className="flex flex-wrap justify-center gap-6 sm:gap-8 max-w-3xl mb-10">
        {profiles.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-3 group">
            {editingId === p.id ? (
              <div className="w-28 sm:w-36 flex flex-col items-center gap-3">
                <div
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl font-bold text-white shadow-xl"
                  style={{ backgroundColor: editColor }}
                >
                  {(() => {
                    const Icon = getAvatarIcon(editAvatarIcon);
                    return Icon ? <Icon size={52} strokeWidth={1.5} /> : editName.charAt(0).toUpperCase() || "?";
                  })()}
                </div>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={20}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm text-center outline-none focus:border-emerald-500"
                  placeholder="Nom du profil"
                  autoFocus
                />
                <div className="flex flex-wrap justify-center gap-1.5">
                  {(editIsKid ? KID_COLORS : AVATAR_COLORS).map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        editColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-110" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <AvatarIconPicker value={editAvatarIcon} onChange={setEditAvatarIcon} />
                <label className="flex items-center gap-2 text-zinc-400 text-xs">
                  <input
                    type="checkbox"
                    checked={editIsKid}
                    onChange={(e) => setEditIsKid(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  Profil enfant
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="Nouveau PIN (4 chiffres)"
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-2 py-1.5 text-white text-xs text-center outline-none focus:border-emerald-500"
                />
                <label className="flex items-center gap-2 text-zinc-500 text-[11px]">
                  <input
                    type="checkbox"
                    checked={removeEditPin}
                    onChange={(e) => setRemoveEditPin(e.target.checked)}
                    className="accent-red-500"
                  />
                  Supprimer le PIN
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(p.id)}
                    disabled={busy || !editName.trim()}
                    className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 flex items-center justify-center text-white transition-colors"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="w-9 h-9 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => (manageMode ? startEdit(p) : handleSelect(p))}
                  className="relative transition-transform hover:scale-105 active:scale-95"
                >
                  <ProfileAvatar profile={p} editing={manageMode} />
                </button>
                {manageMode && (
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={busy}
                    className="text-zinc-500 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={12} />
                    Supprimer
                  </button>
                )}
                <p className="text-zinc-400 group-hover:text-white text-sm font-medium transition-colors text-center max-w-[8rem] truncate">
                  {p.name}
                </p>
                {p.is_kid && (
                  <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">
                    Enfant
                  </span>
                )}
              </>
            )}
          </div>
        ))}

        {/* Add new profile */}
        {canAdd && !addingNew && (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={startAdd}
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors group"
            >
              <Plus size={48} className="group-hover:scale-110 transition-transform" />
            </button>
            <p className="text-zinc-500 group-hover:text-zinc-300 text-sm font-medium transition-colors">
              Ajouter un profil
            </p>
          </div>
        )}

        {/* New profile form */}
        {addingNew && (
          <div className="w-28 sm:w-36 flex flex-col items-center gap-3">
            <div
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl font-bold text-white shadow-xl"
              style={{ backgroundColor: newColor }}
            >
              {(() => {
                const Icon = getAvatarIcon(newAvatarIcon);
                return Icon ? <Icon size={52} strokeWidth={1.5} /> : newName.charAt(0).toUpperCase() || "?";
              })()}
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={20}
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm text-center outline-none focus:border-emerald-500"
              placeholder="Nom du profil"
              autoFocus
            />
            <div className="flex flex-wrap justify-center gap-1.5">
              {colorPalette.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    newColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-110" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <AvatarIconPicker value={newAvatarIcon} onChange={setNewAvatarIcon} />
            <label className="flex items-center gap-2 text-zinc-400 text-xs">
              <input
                type="checkbox"
                checked={newIsKid}
                onChange={(e) => {
                  setNewIsKid(e.target.checked);
                  setNewColor(KID_COLORS[0]);
                }}
                className="accent-emerald-500"
              />
              Profil enfant
            </label>
            <div className="w-full">
              <p className="text-zinc-500 text-[11px] text-center mb-1.5">
                Vos thèmes favoris (3 max)
              </p>
              <div className="flex flex-wrap justify-center gap-1">
                {PROFILE_CATEGORIES.map((category) => {
                  const selected = newCategories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setNewCategories((current) =>
                          selected
                            ? current.filter((item) => item !== category)
                            : current.length < 3
                              ? [...current, category]
                              : current
                        );
                      }}
                      className={`rounded px-1.5 py-1 text-[10px] transition-colors ${
                        selected
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
            <input
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="PIN optionnel (4 chiffres)"
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-2 py-1.5 text-white text-xs text-center outline-none focus:border-emerald-500"
            />
            <div className="flex gap-2">
              <button
                onClick={saveAdd}
                disabled={busy || !newName.trim()}
                className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 flex items-center justify-center text-white transition-colors"
              >
                <Check size={16} />
              </button>
              <button
                onClick={cancelAdd}
                className="w-9 h-9 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      {profiles.length === 0 && !addingNew && (
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-24 h-24 rounded-2xl bg-zinc-800 flex items-center justify-center">
            <User size={40} className="text-zinc-600" />
          </div>
          <p className="text-zinc-400 text-center max-w-sm">
            Vous n'avez pas encore de profil. Créez votre premier profil spectateur pour commencer à regarder.
          </p>
        </div>
      )}

      <button
        onClick={() => {
          setManageMode((m) => !m);
          cancelEdit();
          cancelAdd();
        }}
        className="px-6 py-2.5 border border-zinc-600 text-zinc-300 hover:text-white hover:border-white rounded-lg text-sm font-semibold tracking-wider uppercase transition-colors"
      >
        {manageMode ? "Terminer" : "Gérer les profils"}
      </button>

      {pinProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-center shadow-2xl">
            <h2 className="text-white text-xl font-bold mb-2">PIN requis</h2>
            <p className="text-zinc-400 text-sm mb-5">Entrez le code PIN de {pinProfile.name}</p>
            <div className="relative mb-5">
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="w-12 h-14 rounded-lg border border-zinc-600 bg-zinc-800 flex items-center justify-center text-white text-2xl font-bold"
                  >
                    {pinInput[index] ? "•" : ""}
                  </div>
                ))}
              </div>
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="absolute inset-0 h-full w-full cursor-text opacity-0"
                aria-label="PIN du profil"
              />
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setPinProfile(null);
                  setPinInput("");
                }}
                className="px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                disabled={pinInput.length !== 4 || busy}
                onClick={async () => {
                  if (!pinProfile) return;
                  setBusy(true);
                  const result = await verifyProfilePin(pinProfile.id, pinInput);
                  setBusy(false);
                  if (result.error || !result.valid) {
                    setError("PIN incorrect.");
                    setPinInput("");
                    return;
                  }
                  selectProfile(pinProfile);
                  setPinProfile(null);
                  setPinInput("");
                  onSelect();
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors font-medium"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
