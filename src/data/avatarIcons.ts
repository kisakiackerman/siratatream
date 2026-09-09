import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Circle,
  Compass,
  Crown,
  Flower2,
  Gem,
  Heart,
  Landmark,
  MoonStar,
  Shield,
  Sparkles,
  Star,
  Sun,
  Shapes,
} from "lucide-react";

export type AvatarIconId =
  | "moon"
  | "star"
  | "mosque"
  | "geometry"
  | "book"
  | "sparkles"
  | "sun"
  | "compass"
  | "heart"
  | "flower"
  | "gem"
  | "shield"
  | "crown"
  | "circle";

export const AVATAR_ICONS: { id: AvatarIconId; label: string; icon: LucideIcon }[] = [
  { id: "moon", label: "Croissant de lune", icon: MoonStar },
  { id: "star", label: "Étoile", icon: Star },
  { id: "mosque", label: "Mosquée", icon: Landmark },
  { id: "geometry", label: "Motif géométrique", icon: Shapes },
  { id: "book", label: "Livre", icon: BookOpen },
  { id: "sparkles", label: "Lumière", icon: Sparkles },
  { id: "sun", label: "Soleil", icon: Sun },
  { id: "compass", label: "Boussole", icon: Compass },
  { id: "heart", label: "Coeur", icon: Heart },
  { id: "flower", label: "Fleur", icon: Flower2 },
  { id: "gem", label: "Joyau", icon: Gem },
  { id: "shield", label: "Protection", icon: Shield },
  { id: "crown", label: "Couronne", icon: Crown },
  { id: "circle", label: "Cercle", icon: Circle },
];

export function getAvatarIcon(id?: string | null): LucideIcon | null {
  return AVATAR_ICONS.find((avatar) => avatar.id === id)?.icon ?? null;
}
