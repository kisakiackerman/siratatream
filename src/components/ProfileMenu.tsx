import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import {
  Bookmark,
  Clock,
  RefreshCw,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
  DownloadCloud,
  Layers,
  BarChart3,
  Moon,
  Sun,
  Monitor,
  User,
  ShieldCheck,
  Wand2,
  Radio,
  CalendarDays,
  Compass,
  Bell,
} from "lucide-react";
import { useViewerProfile } from "@/hooks/useViewerProfile";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { getAvatarIcon } from "@/data/avatarIcons";
import { gregorianToHijri } from "@/lib/hijri";
import type { SettingsTab } from "@/components/AccountSettingsModal";

type ProfileMenuProps = {
  onOpenCreatorStudio?: () => void;
  onOpenCreatorAlerts?: () => void;
  onOpenPersonalSpace?: () => void;
  onOpenMyList: () => void;
  onOpenWatchHistory: () => void;
  onOpenAccountSettings: (tab?: SettingsTab) => void;
  onSwitchProfile: () => void;
  onOpenIslamicHub: () => void;
  onOpenOffline: () => void;
  onOpenStats?: () => void;
  onOpenSuggestions?: () => void;
};

export default function ProfileMenu({
  onOpenCreatorStudio,
  onOpenCreatorAlerts,
  onOpenPersonalSpace,
  onOpenMyList,
  onOpenWatchHistory,
  onOpenAccountSettings,
  onSwitchProfile,
  onOpenIslamicHub,
  onOpenOffline,
  onOpenStats,
  onOpenSuggestions,
}: ProfileMenuProps) {
  const { activeProfile } = useViewerProfile();
  const { firebaseUser, userSpace, isCreator, signOut, signInWithGoogle, signInWithApple } = useAuth();
  const { theme, resolvedTheme, systemTheme, toggleTheme } = useTheme();
  const hijriToday = useMemo(() => gregorianToHijri(), []);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleAction = (fn?: () => void) => {
    setOpen(false);
    fn?.();
  };

  if (!activeProfile) return null;

  return (
    <div className="relative group/avatar" ref={wrapRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/60 transition-all"
        aria-label={`Menu du profil (${activeProfile.name})`}
      >
        {firebaseUser?.photoURL ? (
          <img
            src={firebaseUser.photoURL}
            alt={firebaseUser.displayName || activeProfile.name}
            className="w-8 h-8 rounded-lg object-cover border border-emerald-500/50 shadow-md transition-transform group-hover/avatar:scale-105"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold transition-transform group-hover/avatar:scale-105 shadow-md"
            style={{ backgroundColor: activeProfile.avatar_color }}
          >
            {(() => {
              const Icon = getAvatarIcon(activeProfile.avatar_icon);
              return Icon ? (
                <Icon size={16} strokeWidth={1.5} />
              ) : (
                activeProfile.name.charAt(0).toUpperCase()
              );
            })()}
          </div>
        )}
        <ChevronDown
          size={14}
          className={`text-zinc-400 group-hover/avatar:text-white transition-all hidden sm:block ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Tooltip Infobulle au survol quand le menu est fermé (uniquement desktop) */}
      {!open && (
        <div
          role="tooltip"
          className="hidden sm:block absolute top-full mt-2 right-0 pointer-events-none z-50 whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-all duration-200 ease-out transform -translate-y-1 group-hover/avatar:translate-y-0"
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/95 border border-zinc-700/80 text-zinc-100 text-[11px] font-medium shadow-2xl backdrop-blur-md">
            <span className="font-semibold text-emerald-300">{activeProfile.name}</span>
            <span className="text-zinc-400 text-[10px]">· Profil & Options</span>
          </div>
        </div>
      )}

      {open && (
        <div className="absolute top-full right-0 mt-2.5 w-72 max-w-[calc(100vw-1.5rem)] bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50 divide-y divide-zinc-800/70">
          {/* Active Profile & Account Info */}
          <div className="px-4 py-3 bg-zinc-900/60">
            <div className="flex items-center justify-between">
              <p className="text-zinc-400 text-[11px] uppercase tracking-wider font-semibold">
                Profil actif
              </p>
              {firebaseUser ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold flex items-center gap-1">
                  <ShieldCheck size={10} />
                  Google
                </span>
              ) : userSpace?.provider === "apple" ? (
                <span className="px-2 py-0.5 rounded-full liquid-glass text-white border border-white/20 text-[9px] font-bold flex items-center gap-1">
                  <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.68-7.83-11.97-14.35-6.19-9.35-11.04-19.98-14.56-31.9-3.52-11.92-5.28-23.32-5.28-34.2 0-14.35 3.65-26.2 10.96-35.54 7.3-9.35 16.5-14.12 27.59-14.33 4.9 0 10.37 1.25 16.42 3.75 6.04 2.5 10.14 3.79 12.3 3.87 1.63 0 5.92-1.4 12.87-4.22 6.96-2.82 12.92-4.04 17.89-3.66 13.39.87 23.95 5.56 31.67 14.07-11.75 7.18-17.51 16.97-17.29 29.38.22 9.79 4.02 18.06 11.4 24.81 7.39 6.74 16.14 10.45 26.27 11.1-2.28 7.07-5.1 13.92-8.45 20.54zm-28.76-105.7c0 7.39-2.72 14.46-8.15 21.22-5.44 6.75-12.18 10.77-20.24 12.04-.22-1.09-.33-2.18-.33-3.26 0-7.18 2.94-14.36 8.81-21.54 5.87-7.18 12.78-11.2 20.73-12.06.11 1.2.18 2.4.18 3.6z" />
                  </svg>
                  Apple
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[9px] font-medium">
                  Invité
                </span>
              )}
            </div>
            <p className="text-white font-bold text-sm truncate mt-0.5">
              {firebaseUser?.displayName || (userSpace?.provider === "apple" ? userSpace?.displayName : null) || activeProfile.name}
            </p>
            {(firebaseUser?.email || userSpace?.email) && (
              <p className="text-zinc-400 text-xs truncate mt-0.5">
                {firebaseUser?.email || userSpace?.email}
              </p>
            )}
          </div>

          {/* Hijri Date Display */}
          <div className="p-2 bg-zinc-900/30">
            <button
              onClick={() => handleAction(onOpenIslamicHub)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs text-zinc-300 bg-zinc-900/70 hover:bg-zinc-800/90 rounded-xl border border-zinc-800 transition-colors"
              title="Ouvrir l'Espace Pratique"
            >
              <div className="flex items-center gap-2">
                <CalendarDays size={15} className="text-emerald-400" />
                <span className="font-medium text-zinc-300">Date Hijri</span>
              </div>
              <span className="font-bold text-emerald-300 text-[11px]">
                {hijriToday.day} {hijriToday.monthName.split(" ")[0]} {hijriToday.year}H
              </span>
            </button>
          </div>

          {/* Espace Créateur / IA Studio Highlight - Strictly for Creator accounts */}
          {isCreator && (
            <div className="p-1.5 bg-emerald-950/20 space-y-1">
              {onOpenCreatorStudio && (
                <button
                  onClick={() => handleAction(onOpenCreatorStudio)}
                  className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl transition-all text-left shadow-sm group"
                >
                  <div className="flex items-center gap-2">
                    <Wand2 size={16} className="text-emerald-400 group-hover:rotate-12 transition-transform" />
                    <span>Studio Créateur (IA)</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 text-[9px] uppercase tracking-wider font-extrabold">
                    ADMIN
                  </span>
                </button>
              )}

              {onOpenCreatorAlerts && (
                <button
                  onClick={() => handleAction(onOpenCreatorAlerts)}
                  className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-bold text-red-200 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 rounded-xl transition-all text-left shadow-sm group"
                >
                  <div className="flex items-center gap-2">
                    <Radio size={15} className="text-red-400 animate-pulse" />
                    <span>Alertes & Flash Info</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 text-[9px] uppercase tracking-wider font-extrabold">
                    LIVE
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Espace Personnel Google / Apple */}
          {onOpenPersonalSpace && (
            <div className="p-1 space-y-1">
              <MenuItem
                icon={<User size={16} className="text-emerald-400" />}
                label="Mon Espace Personnel"
                onClick={() => handleAction(onOpenPersonalSpace)}
              />
              {!firebaseUser && userSpace?.provider !== "apple" && (
                <div className="pt-1 grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleAction(signInWithGoogle)}
                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/15"
                    title="Connexion Google"
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Google</span>
                  </button>
                  <button
                    onClick={() => handleAction(() => signInWithApple())}
                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-white liquid-glass hover:bg-white/15 rounded-xl transition-colors border border-white/20"
                    title="Synchronisation Apple (iCloud)"
                  >
                    <svg className="w-3.5 h-3.5 fill-current flex-shrink-0" viewBox="0 0 170 170">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.68-7.83-11.97-14.35-6.19-9.35-11.04-19.98-14.56-31.9-3.52-11.92-5.28-23.32-5.28-34.2 0-14.35 3.65-26.2 10.96-35.54 7.3-9.35 16.5-14.12 27.59-14.33 4.9 0 10.37 1.25 16.42 3.75 6.04 2.5 10.14 3.79 12.3 3.87 1.63 0 5.92-1.4 12.87-4.22 6.96-2.82 12.92-4.04 17.89-3.66 13.39.87 23.95 5.56 31.67 14.07-11.75 7.18-17.51 16.97-17.29 29.38.22 9.79 4.02 18.06 11.4 24.81 7.39 6.74 16.14 10.45 26.27 11.1-2.28 7.07-5.1 13.92-8.45 20.54zm-28.76-105.7c0 7.39-2.72 14.46-8.15 21.22-5.44 6.75-12.18 10.77-20.24 12.04-.22-1.09-.33-2.18-.33-3.26 0-7.18 2.94-14.36 8.81-21.54 5.87-7.18 12.78-11.2 20.73-12.06.11 1.2.18 2.4.18 3.6z" />
                    </svg>
                    <span>Apple</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Section: Espace Pratique & Suggestions */}
          <div className="p-1">
            <MenuItem
              icon={<Sparkles size={16} className="text-emerald-400" />}
              label="Espace Pratique (Prières, Qibla, Douas)"
              onClick={() => handleAction(onOpenIslamicHub)}
            />
            {onOpenSuggestions && (
              <MenuItem
                icon={<Sparkles size={16} className="text-zinc-400" />}
                label="💡 Suggestion de l'utilisateur"
                onClick={() => handleAction(onOpenSuggestions)}
              />
            )}
          </div>

          {/* Section: Library & Stats & Offline */}
          <div className="p-1">
            <MenuItem
              icon={<Bookmark size={16} className="text-emerald-400" />}
              label={`Ma Liste (${userSpace?.myList?.length || 0})`}
              onClick={() => handleAction(onOpenMyList)}
            />
            <MenuItem
              icon={<Clock size={16} className="text-zinc-400" />}
              label="Historique de lecture"
              onClick={() => handleAction(onOpenWatchHistory)}
            />
            <MenuItem
              icon={<BarChart3 size={16} className="text-zinc-400" />}
              label="Mes Statistiques"
              onClick={() => handleAction(() => {
                if (onOpenStats) onOpenStats();
                else onOpenAccountSettings("stats");
              })}
            />
            <MenuItem
              icon={<DownloadCloud size={16} className="text-zinc-400" />}
              label="Mode Hors-Ligne"
              onClick={() => handleAction(onOpenOffline)}
            />
          </div>

          {/* Section: Theme, Profile Switching & Settings */}
          <div className="p-1">
            <MenuItem
              icon={
                theme === "system" ? (
                  <Monitor size={16} className="text-zinc-400" />
                ) : resolvedTheme === "dark" ? (
                  <Moon size={16} className="text-emerald-400" />
                ) : (
                  <Sun size={16} className="text-zinc-400" />
                )
              }
              label={
                theme === "system"
                  ? `Thème : Auto (${systemTheme === "dark" ? "Sombre" : "Clair"})`
                  : resolvedTheme === "dark"
                  ? "Thème : Sombre"
                  : "Thème : Clair"
              }
              onClick={() => toggleTheme()}
            />
            <MenuItem
              icon={<Layers size={16} className="text-zinc-400" />}
              label="Changer de profil"
              onClick={() => handleAction(onSwitchProfile)}
            />
            <MenuItem
              icon={<Bell size={16} className="text-emerald-400" />}
              label="Notifications & Prières"
              badge="Nouveau"
              onClick={() => handleAction(() => onOpenAccountSettings("notifications"))}
            />
            <MenuItem
              icon={<Settings size={16} className="text-zinc-400" />}
              label="Paramètres du compte"
              onClick={() => handleAction(onOpenAccountSettings)}
            />
          </div>

          {/* Section: Sign out */}
          <div className="p-1">
            <MenuItem
              icon={<LogOut size={16} />}
              label="Se déconnecter"
              onClick={() => handleAction(() => signOut())}
              danger
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  badge,
  onClick,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  badge?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium text-left rounded-xl transition-colors ${
        danger
          ? "text-red-400 hover:bg-red-950/40"
          : "text-zinc-300 hover:text-white hover:bg-zinc-900"
      }`}
    >
      <span className={danger ? "text-red-400" : "flex-shrink-0"}>{icon}</span>
      <span className="truncate flex-1">{label}</span>
      {badge && (
        <span className="ml-auto text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
          {badge}
        </span>
      )}
    </button>
  );
}
