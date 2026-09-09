import { useEffect, useMemo, useState } from "react";
import { Compass, X } from "lucide-react";

type QiblaCompassProps = {
  onClose: () => void;
};

const MECCA_LAT = 21.4225;
const MECCA_LNG = 39.8262;

function calculateQibla(lat: number, lng: number) {
  const phiK = (MECCA_LAT * Math.PI) / 180;
  const lambdaK = (MECCA_LNG * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const lambda = (lng * Math.PI) / 180;
  const numerator = Math.sin(lambdaK - lambda);
  const denominator = Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda);
  const angle = (Math.atan2(numerator, denominator) * 180) / Math.PI;
  return (angle + 360) % 360;
}

export default function QiblaCompass({ onClose }: QiblaCompassProps) {
  const [qiblaAngle, setQiblaAngle] = useState(119); // Default France ~ 119°
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setQiblaAngle(Math.round(calculateQibla(coords.latitude, coords.longitude)));
      },
      () => {
        setError("Position non détectée. Angle par défaut pour la France/Europe affiché.");
      }
    );
  }, []);

  useEffect(() => {
    function handleOrientation(event: DeviceOrientationEvent) {
      if (typeof event.alpha === "number") {
        setDeviceHeading(360 - event.alpha);
      }
    }
    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => window.removeEventListener("deviceorientation", handleOrientation, true);
  }, []);

  const needleRotation = useMemo(() => (qiblaAngle - deviceHeading + 360) % 360, [deviceHeading, qiblaAngle]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white text-center shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-zinc-400 hover:text-white" aria-label="Fermer la boussole">
          <X size={20} />
        </button>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Direction de la Mecque</p>
        <h2 className="mb-6 text-2xl font-bold flex items-center justify-center gap-2">
          <Compass className="text-emerald-400" size={24} />
          Boussole Qibla
        </h2>

        <div className="relative mx-auto mb-6 flex h-64 w-64 items-center justify-center rounded-full border-4 border-zinc-800 bg-zinc-900 shadow-inner">
          <div className="absolute top-2 text-xs font-bold text-red-400">N (0°)</div>
          <div className="absolute right-2 text-xs font-bold text-zinc-500">E (90°)</div>
          <div className="absolute bottom-2 text-xs font-bold text-zinc-500">S (180°)</div>
          <div className="absolute left-2 text-xs font-bold text-zinc-500">O (270°)</div>

          {/* Compass Needle */}
          <div
            className="absolute flex h-48 w-10 items-center justify-center transition-transform duration-300"
            style={{ transform: `rotate(${needleRotation}deg)` }}
          >
            <div className="h-24 w-1 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
            <div className="absolute top-0 flex flex-col items-center">
              <span className="text-xl">🕋</span>
              <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/80 px-1 rounded">QIBLA</span>
            </div>
          </div>
          <div className="h-4 w-4 rounded-full bg-emerald-400 ring-4 ring-zinc-950" />
        </div>

        <p className="text-3xl font-black text-emerald-400 tabular-nums">{qiblaAngle}°</p>
        <p className="mt-1 text-xs text-zinc-400">Angle vers la Kaaba (Mecque, Arabie Saoudite)</p>
        {error && <p className="mt-4 text-xs text-amber-400 bg-amber-950/30 p-2 rounded border border-amber-800/40">{error}</p>}
      </div>
    </div>
  );
}
