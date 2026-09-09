import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

interface IntroSplashProps {
  onComplete: () => void;
}

export default function IntroSplash({ onComplete }: IntroSplashProps) {
  const [isExiting, setIsExiting] = useState(false);
  const exitTriggeredRef = useRef(false);

  const handleSkip = useCallback(() => {
    if (exitTriggeredRef.current) return;
    exitTriggeredRef.current = true;
    setIsExiting(true);
  }, []);

  // Automatic transition after 3 seconds
  useEffect(() => {
    const autoTimer = setTimeout(() => {
      handleSkip();
    }, 3000);

    return () => clearTimeout(autoTimer);
  }, [handleSkip]);

  const handleExitComplete = () => {
    onComplete();
  };

  return (
    <motion.div
      id="intro-splash-screen"
      role="banner"
      aria-label="Écran d'introduction SiratStream"
      onClick={handleSkip}
      onTouchStart={handleSkip}
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (isExiting) {
          handleExitComplete();
        }
      }}
      className="fixed inset-0 z-[9999] bg-[#0A0A0F] flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden p-6"
    >
      {/* 7. Discreet 'Passer' button in top right */}
      <motion.button
        id="intro-passer-btn"
        type="button"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        onClick={(e) => {
          e.stopPropagation();
          handleSkip();
        }}
        className="absolute top-6 right-6 z-30 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/15 border border-white/20 text-xs text-zinc-300 hover:text-white backdrop-blur-xl transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95"
      >
        <span>Passer</span>
        <ArrowRight size={12} className="opacity-75" />
      </motion.button>

      {/* Subtle ambient liquid lighting in background */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-96 sm:h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

      {/* 5. Circular emerald ripple waves radiating outward */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={
          isExiting
            ? { opacity: 0 }
            : {
                scale: [0.8, 2.4, 3.6],
                opacity: [0, 0.45, 0],
              }
        }
        transition={{
          delay: 0.9,
          duration: 1.7,
          ease: "easeOut",
        }}
        className="absolute w-36 h-36 rounded-full border border-emerald-400/50 pointer-events-none shadow-[0_0_25px_rgba(52,211,153,0.3)]"
      />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={
          isExiting
            ? { opacity: 0 }
            : {
                scale: [0.8, 2.0, 3.1],
                opacity: [0, 0.35, 0],
              }
        }
        transition={{
          delay: 1.25,
          duration: 1.6,
          ease: "easeOut",
        }}
        className="absolute w-36 h-36 rounded-full border border-emerald-300/35 pointer-events-none shadow-[0_0_20px_rgba(110,231,183,0.2)]"
      />

      {/* Main Container */}
      <div className="relative flex flex-col items-center justify-center space-y-6 z-10">
        {/* 2. Liquid Glass Orb with droplet forming spring effect */}
        <motion.div
          id="intro-liquid-glass-orb"
          initial={{ scale: 0, opacity: 0 }}
          animate={
            isExiting
              ? { scale: 1.25, opacity: 0 }
              : { scale: [0, 1.1, 1], opacity: 1 }
          }
          transition={
            isExiting
              ? { duration: 0.45, ease: [0.32, 0, 0.67, 0] }
              : {
                  duration: 0.85,
                  times: [0, 0.72, 1],
                  ease: [0.34, 1.56, 0.64, 1],
                }
          }
          className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-white/[0.08] backdrop-blur-2xl border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.25)] shadow-2xl flex items-center justify-center overflow-hidden"
        >
          {/* Specular curved reflection highlight (top glass sheen) */}
          <div className="absolute top-1.5 left-3 right-3 h-10 sm:h-12 rounded-full bg-gradient-to-b from-white/25 via-white/10 to-transparent pointer-events-none" />

          {/* 3. SiratStream Logo (3 vertical bars) with sequential rise & emerald glow pulse */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 z-10">
            {/* Left bar: Emerald */}
            <motion.div
              initial={{ height: 0, opacity: 0, y: 15 }}
              animate={{
                height: [0, 48, 44],
                opacity: 1,
                y: 0,
                boxShadow: [
                  "0 0 0px rgba(52,211,153,0)",
                  "0 0 20px rgba(52,211,153,0.9)",
                  "0 0 10px rgba(52,211,153,0.5)",
                ],
              }}
              transition={{ delay: 0.35, duration: 0.55, ease: "easeOut" }}
              className="w-2 sm:w-2.5 bg-emerald-400 rounded-sm"
            />
            {/* Middle bar: Zinc */}
            <motion.div
              initial={{ height: 0, opacity: 0, y: 15 }}
              animate={{
                height: [0, 32, 28],
                opacity: 1,
                y: 0,
                boxShadow: [
                  "0 0 0px rgba(212,212,216,0)",
                  "0 0 15px rgba(212,212,216,0.7)",
                  "0 0 6px rgba(212,212,216,0.3)",
                ],
              }}
              transition={{ delay: 0.48, duration: 0.55, ease: "easeOut" }}
              className="w-2 sm:w-2.5 bg-zinc-300 rounded-sm"
            />
            {/* Right bar: White */}
            <motion.div
              initial={{ height: 0, opacity: 0, y: 15 }}
              animate={{
                height: [0, 56, 52],
                opacity: 1,
                y: 0,
                boxShadow: [
                  "0 0 0px rgba(255,255,255,0)",
                  "0 0 22px rgba(255,255,255,0.95)",
                  "0 0 12px rgba(255,255,255,0.5)",
                ],
              }}
              transition={{ delay: 0.62, duration: 0.55, ease: "easeOut" }}
              className="w-2 sm:w-2.5 bg-white rounded-sm"
            />
          </div>

          {/* Bottom subtle edge highlight */}
          <div className="absolute bottom-1.5 left-4 right-4 h-3 rounded-full bg-white/5 pointer-events-none" />
        </motion.div>

        {/* 4. Typography: Brand Name + Tagline with smooth upward fade */}
        <div className="flex flex-col items-center text-center space-y-1.5">
          {/* Brand Name */}
          <motion.div
            id="intro-brand-title"
            initial={{ opacity: 0, y: 14 }}
            animate={
              isExiting
                ? { opacity: 0, y: -6 }
                : { opacity: 1, y: 0 }
            }
            transition={
              isExiting
                ? { duration: 0.25 }
                : { delay: 0.95, duration: 0.6, ease: "easeOut" }
            }
            className="flex items-center justify-center tracking-tight"
          >
            <span className="text-white font-black text-2xl sm:text-3xl tracking-tight">
              SiratStream
            </span>
            <span className="text-emerald-400 text-base sm:text-lg font-bold ml-0.5">
              .app
            </span>
          </motion.div>

          {/* Exact Subtitle requested */}
          <motion.p
            id="intro-brand-tagline"
            initial={{ opacity: 0, y: 10 }}
            animate={
              isExiting
                ? { opacity: 0, y: -4 }
                : { opacity: 1, y: 0 }
            }
            transition={
              isExiting
                ? { duration: 0.25 }
                : { delay: 1.3, duration: 0.65, ease: "easeOut" }
            }
            className="text-zinc-400 text-xs sm:text-sm font-medium tracking-wide max-w-xs sm:max-w-sm px-2"
          >
            Plateforme de streaming spirituel
          </motion.p>
        </div>
      </div>

      {/* Discreet skippable hint on mobile */}
      <motion.div
        id="intro-skip-hint"
        initial={{ opacity: 0 }}
        animate={isExiting ? { opacity: 0 } : { opacity: 0.4 }}
        transition={{ delay: 1.8, duration: 0.5 }}
        className="absolute bottom-6 sm:bottom-8 text-[11px] text-zinc-500 tracking-wider uppercase font-medium select-none pointer-events-none"
      >
        Toucher pour passer
      </motion.div>
    </motion.div>
  );
}
