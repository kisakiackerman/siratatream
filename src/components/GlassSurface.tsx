import React from "react";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "standard" | "modal" | "card" | "subtle" | "emerald" | "dropdown";
  className?: string;
}

export function GlassPanel({
  children,
  variant = "standard",
  className = "",
  ...props
}: GlassPanelProps) {
  const variantClass = {
    standard: "liquid-glass rounded-2xl",
    modal: "liquid-glass-modal rounded-2xl",
    card: "liquid-glass-card rounded-2xl",
    subtle: "liquid-glass-subtle rounded-xl",
    emerald: "liquid-glass-emerald rounded-2xl",
    dropdown: "liquid-glass-dropdown rounded-2xl",
  }[variant];

  return (
    <div className={`${variantClass} ${className}`} {...props}>
      {children}
    </div>
  );
}

export default GlassPanel;
