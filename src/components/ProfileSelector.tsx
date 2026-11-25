import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2, LogOut } from "lucide-react";
import { motion } from "motion/react";
import Card3D from "@/components/3d/Card3D";
import { useViewerProfile, AVATAR_COLORS } from "@/hooks/useViewerProfile";
import { useAuth } from "@/hooks/useAuth";
import type { ViewerProfile } from "@/lib/supabase";
import { AVATAR_ICONS, getAvatarIcon, type AvatarIconId } from "@/data/avatarIcons";
import type { Category } from "@/data/catalog";
import ExitAppModal from "@/components/ExitAppModal";
import { getAccountStartingName } from "@/lib/accountName";

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
  const { signOut, user, firebaseUser, userSpace } = useAuth();
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
  const [showExitModal, setShowExitModal] = useState(false);
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

  const googleDefaultName = getAccountStartingName(firebaseUser || user, userSpace);
  const effectiveNewName = (newName.trim() || googleDefaultName).slice(0, 32);

  const canAdd = profiles.length < 5;
  const mustCreateFirstProfile = !loading && profiles.length === 0;
  const isCreateView = addingNew || mustCreateFirstProfile;

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
    const resolvedName = (newName.trim() || googleDefaultName).slice(0, 32);
    if (!resolvedName) return;
    if (newPin && !/^\d{4}$/.test(newPin)) {
      setError("Le PIN doit contenir exactement 4 chiffres.");
      return;
    }
    const wasFirstProfile = profiles.length === 0;
    setBusy(true);
    setError(null);
    const { error, profile: createdProfile } = await createProfile(
      resolvedName,
      newColor,
      newIsKid,
      newPin || undefined,
      newAvatarIcon,
      newCategories
    );
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    cancelAdd();
    if (wasFirstProfile && createdProfile) {
      selectProfile(createdProfile);
      onSelect();
      return;
    }
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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12 sm:py-16">
      <h1 className="text-white text-2xl sm:text-5xl font-black mb-2 tracking-tight text-center">
        {isCreateView
          ? mustCreateFirstProfile
            ? "Créez votre profil personnalisé"
            : "Nouveau profil personnalisé"
          : manageMode
          ? "Gérer les profils"
          : "Qui regarde ?"}
      </h1>
      <p className="text-zinc-400 text-sm sm:text-base mb-8 sm:mb-10 text-center max-w-lg">
        {isCreateView
          ? mustCreateFirstProfile
            ? "Personnalisez votre nom, votre avatar et vos thèmes favoris pour démarrer votre expérience."
            : "Ajoutez un nouveau profil personnalisé à ce compte."
          : manageMode
          ? "Modifiez ou supprimez vos profils spectateurs"
          : "Choisissez le profil auquel vous connecter ou créez-en un nouveau"}
      </p>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm max-w-md">
          {error}
        </div>
      )}

      {isCreateView ? (
        <div className="w-full max-w-md bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 sm:p-7 flex flex-col items-center gap-4 shadow-2xl mb-8">
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-xl"
            style={{ backgroundColor: newColor }}
          >
            {(() => {
              const Icon = getAvatarIcon(newAvatarIcon);
              return Icon ? <Icon size={48} strokeWidth={1.5} /> : effectiveNewName.charAt(0).toUpperCase() || "?";
            })()}
          </div>

          <div className="w-full space-y-1">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between gap-2">
              <span>Nom du profil</span>
              {googleDefaultName && (
                <span className="text-[11px] font-normal text-emerald-400 truncate max-w-[14rem]">
                  Par défaut : {googleDefaultName}
                </span>
              )}
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && effectiveNewName && !busy) {
                  void saveAdd();
                }
              }}
              maxLength={32}
              className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-emerald-500"
              placeholder={
                googleDefaultName
                  ? `Laissez vide pour « ${googleDefaultName} » ou écrivez un nom`
                  : "Entrez votre prénom ou pseudo"
              }
              autoFocus
            />
          </div>

          <div className="w-full space-y-2">
            <p className="text-xs font-semibold text-zinc-300">Couleur &amp; icône</p>
            <div className="flex flex-wrap justify-center gap-2">
              {colorPalette.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    newColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="pt-1 flex justify-center">
              <AvatarIconPicker value={newAvatarIcon} onChange={setNewAvatarIcon} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-zinc-300 text-xs self-start cursor-pointer">
            <input
              type="checkbox"
              checked={newIsKid}
              onChange={(e) => {
                setNewIsKid(e.target.checked);
                if (e.target.checked) setNewColor(KID_COLORS[0]);
              }}
              className="accent-emerald-500"
            />
            Profil enfant (contenu adapté)
          </label>

          <div className="w-full space-y-1.5">
            <p className="text-zinc-300 text-xs font-semibold">
              Vos thèmes favoris (3 max)
            </p>
            <div className="flex flex-wrap gap-1.5">
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
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
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

          <div className="w-full space-y-1">
            <label className="text-xs font-semibold text-zinc-300 block">
              Code PIN optionnel (4 chiffres)
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Ex: 1234 (facultatif)"
              className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full pt-2">
            {!mustCreateFirstProfile && (
              <button
                type="button"
                onClick={cancelAdd}
                disabled={busy}
                className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors"
              >
                Retour
              </button>
            )}
            <button
              type="button"
              onClick={saveAdd}
              disabled={busy || !effectiveNewName}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold text-xs transition-colors"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              <span>{mustCreateFirstProfile ? "Créer et continuer" : "Créer le profil"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-wrap justify-center gap-6 sm:gap-8 max-w-3xl mb-10"
          style={{ perspective: "1000px" }}
        >
          {profiles.map((p, idx) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 35, scale: 0.85, rotateX: 15 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              transition={{
                duration: 0.45,
                delay: idx * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex flex-col items-center gap-3 group"
              style={{ transformStyle: "preserve-3d" }}
            >
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
                  <Card3D
                    maxTilt={9.5}
                    depth={20}
                    glareColor="gold"
                    onClick={() => (manageMode ? startEdit(p) : handleSelect(p))}
                    className="cursor-pointer"
                  >
                    <ProfileAvatar profile={p} editing={manageMode} />
                  </Card3D>
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
                  <p
                    className="text-zinc-400 group-hover:text-white text-sm font-medium transition-colors text-center max-w-[8rem] truncate"
                    style={{ transform: "translateZ(8px)" }}
                  >
                    {p.name}
                  </p>
                  {p.is_kid && (
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">
                      Enfant
                    </span>
                  )}
                </>
              )}
            </motion.div>
          ))}

          {/* Add new profile */}
          {canAdd && (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={startAdd}
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-emerald-400/70 flex items-center justify-center text-zinc-500 hover:text-emerald-300 transition-colors group"
              >
                <Plus size={48} className="group-hover:scale-110 transition-transform" />
              </button>
              <p className="text-zinc-400 group-hover:text-white text-sm font-medium transition-colors text-center">
                Créer un profil
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {!isCreateView && canAdd && (
          <button
            onClick={startAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg text-sm font-bold transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Créer un nouveau profil</span>
          </button>
        )}

        {!mustCreateFirstProfile && !isCreateView && (
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
        )}

        <button
          onClick={() => setShowExitModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 border border-red-500/30 text-red-400 hover:text-red-300 hover:border-red-500/60 rounded-lg text-sm font-semibold transition-colors bg-red-950/20 cursor-pointer"
          title="Quitter l'application"
        >
          <LogOut size={15} />
          <span>Quitter l'application</span>
        </button>
      </div>

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

      {/* Confirmation pour quitter l'application */}
      <ExitAppModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirmExit={() => signOut()}
      />
    </div>
  );
}
