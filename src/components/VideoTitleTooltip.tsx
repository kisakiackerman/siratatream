import React from "react";
import { Info, Clock } from "lucide-react";
import { ContentItem } from "@/data/catalog";

type VideoTitleTooltipProps = {
  item: ContentItem;
  className?: string;
  titleClassName?: string;
  lineClamp?: 1 | 2 | 3;
  as?: "h3" | "h4" | "p";
};

export default function VideoTitleTooltip({
  item,
  className = "",
  titleClassName = "",
  lineClamp = 2,
  as: Component = "p",
}: VideoTitleTooltipProps) {
  const description = item.description?.trim();
  const clampClass =
    lineClamp === 1
      ? "line-clamp-1"
      : lineClamp === 3
      ? "line-clamp-3"
      : "line-clamp-2";

  return (
    <div
      className={`relative group/vtooltip inline-block w-full ${className}`}
      title={description || item.title}
    >
      {/* Video Title */}
      <Component className={`${titleClassName} ${clampClass}`}>
        {item.title}
      </Component>

      {/* Floating Dynamic Tooltip on Title Hover */}
      {description && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 sm:w-72 max-w-[85vw] p-3 rounded-2xl bg-zinc-950/95 border border-emerald-500/35 backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,0,0,0.85)] z-50 pointer-events-none opacity-0 invisible group-hover/vtooltip:opacity-100 group-hover/vtooltip:visible translate-y-1 group-hover/vtooltip:translate-y-0 transition-all duration-200 ease-out delay-75 text-left"
        >
          {/* Header with Channel & Duration */}
          <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-white/10 text-[10px]">
            <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1 truncate">
              <Info size={11} className="text-emerald-400 flex-shrink-0" />
              <span className="truncate">{item.channel}</span>
            </span>
            {item.duration && item.duration !== "—" && (
              <span className="flex items-center gap-1 font-mono text-zinc-400 text-[10px] flex-shrink-0">
                <Clock size={10} className="text-zinc-500" />
                <span>{item.duration}</span>
              </span>
            )}
          </div>

          {/* Description preview text */}
          <p className="text-xs text-zinc-200 leading-relaxed font-normal line-clamp-3 selection:bg-emerald-500/30">
            {description}
          </p>

          {/* Bottom metadata tags */}
          <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px] text-zinc-400">
            <div className="flex items-center gap-1 truncate max-w-[75%]">
              {item.categories && item.categories.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 truncate">
                  {item.categories[0]}
                </span>
              )}
              {item.year && (
                <span className="text-zinc-500 font-mono">({item.year})</span>
              )}
            </div>
            <span className="text-[9px] text-emerald-400/80 font-semibold italic flex-shrink-0">
              Aperçu
            </span>
          </div>

          {/* Centered Arrow Indicator */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-zinc-950 border-r border-b border-emerald-500/35 rotate-45" />
        </div>
      )}
    </div>
  );
}
