import fs from "fs";
import path from "path";

export interface MonitoredChannel {
  id: string;
  name: string;
  handle: string;
  url: string;
  category: string;
}

export interface ExportedVideo {
  id: string; // YouTube ID
  title: string;
  channel: string;
  handle: string;
  duration: string;
  durationSeconds: number;
  url: string;
  thumbnail: string;
  exportedAt: string; // ISO date
  publishedApprox?: string;
  category?: string;
}

export interface AgentSyncLog {
  id: string;
  timestamp: string;
  status: "success" | "error" | "running";
  channelsChecked: number;
  newVideosExported: number;
  videosUnderTenMinIgnored: number;
  details: string;
}

export interface AgentState {
  isActive: boolean;
  mode: "silent"; // "sans même m'en informer"
  frequencyHours: number; // 24h
  minDurationMinutes: number; // 10 min
  lastRunTime: string | null;
  nextRunTime: string | null;
  totalExportedVideos: number;
  monitoredChannels: MonitoredChannel[];
  recentLogs: AgentSyncLog[];
}

export const MONITORED_CHANNELS: MonitoredChannel[] = [
  {
    id: "din-ul-qayyima",
    name: "Din-ul-Qayyima",
    handle: "@DinulQayyima1",
    url: "https://www.youtube.com/@DinulQayyima1",
    category: "Enseignements & Fiqh",
  },
  {
    id: "towards-eternity",
    name: "Towards Eternity",
    handle: "@TowardsEternityFrancais",
    url: "https://www.youtube.com/@TowardsEternityFrancais",
    category: "Histoire & Mystère",
  },
  {
    id: "narro-din",
    name: "NARRO DIN",
    handle: "@dinnarro",
    url: "https://www.youtube.com/@dinnarro",
    category: "Prophètes & Foi",
  },
  {
    id: "narro",
    name: "NARRO",
    handle: "@narrostory",
    url: "https://www.youtube.com/@narrostory",
    category: "Récits des Prophètes",
  },
  {
    id: "yacine",
    name: "Yacine",
    handle: "@yacinetareb",
    url: "https://www.youtube.com/@yacinetareb",
    category: "Réflexions & Société",
  },
  {
    id: "croyant-rationnel",
    name: "Croyant Rationnel",
    handle: "@croyantrationnel",
    url: "https://www.youtube.com/@croyantrationnel",
    category: "Science & Coran",
  },
  {
    id: "sur-le-chemin",
    name: "Sur le chemin de la prophétie",
    handle: "@Surlecheminde",
    url: "https://www.youtube.com/@Surlecheminde",
    category: "Récits & Témoignages",
  },
  {
    id: "minute-islam",
    name: "Minute Islam",
    handle: "@MinuteIslam",
    url: "https://www.youtube.com/@MinuteIslam",
    category: "Rappels & Spiritualité",
  },
  {
    id: "averoeshistoire",
    name: "Averroès Histoire",
    handle: "@averoeshistoire",
    url: "https://www.youtube.com/@averoeshistoire",
    category: "Histoire & Civilisation",
  },
  {
    id: "minhaj-an-nubuwwah",
    name: "Minhaj An-Nubuwwah",
    handle: "@MinhajAnNubuwwah",
    url: "https://www.youtube.com/@MinhajAnNubuwwah",
    category: "Enseignements & Rappels",
  },
  {
    id: "darifton-prod",
    name: "Darifton Prod",
    handle: "@dariftonprod",
    url: "https://www.youtube.com/@dariftonprod",
    category: "Documentaires & Histoire",
  },
  {
    id: "lislam-simplement",
    name: "L'Islam Simplement",
    handle: "@lislamsimplement",
    url: "https://www.youtube.com/@lislamsimplement",
    category: "Apprentissage & Rappels",
  },
  {
    id: "blue-casquette",
    name: "Blue Casquette",
    handle: "@bluecasquette",
    url: "https://www.youtube.com/@bluecasquette",
    category: "Investigations & Société",
  },
  {
    id: "la-quete",
    name: "La Quête",
    handle: "@laquetemedia",
    url: "https://www.youtube.com/@laquetemedia",
    category: "Découverte & Dialogue",
  },
  {
    id: "savants-sunnah",
    name: "Les Savants de la Sunnah",
    handle: "@SavantsSunnah",
    url: "https://www.youtube.com/@SavantsSunnah",
    category: "Extraits & Fatwas",
  },
];

const DATA_DIR = path.join(process.cwd(), "data");
const EXPORT_FILE = path.join(DATA_DIR, "daily_exported_videos.json");
const LOG_FILE = path.join(DATA_DIR, "agent_sync_logs.json");

export function parseDurationSeconds(dur: string | undefined): number {
  if (!dur || dur === "—") return 0;
  const str = dur.trim();
  if (str.includes(":")) {
    const parts = str.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
  }
  const h = str.match(/(\d+)\s*h/);
  const m = str.match(/(\d+)\s*min/);
  const s = str.match(/(\d+)\s*s/);
  let total = 0;
  if (h) total += parseInt(h[1], 10) * 3600;
  if (m) total += parseInt(m[1], 10) * 60;
  if (s) total += parseInt(s[1], 10);
  return total;
}

class DailyChannelSyncAgent {
  private isRunning: boolean = false;
  private intervalTimer: NodeJS.Timeout | null = null;
  private exportedVideos: Map<string, ExportedVideo> = new Map();
  private logs: AgentSyncLog[] = [];
  private lastRunTime: string | null = null;
  private nextRunTime: string | null = null;
  private knownCatalogIds: Set<string> = new Set();

  constructor() {
    this.ensureDataFiles();
    this.loadPersistedData();
  }

  private ensureDataFiles() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(EXPORT_FILE)) {
        fs.writeFileSync(EXPORT_FILE, JSON.stringify([], null, 2), "utf-8");
      }
      if (!fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2), "utf-8");
      }
    } catch (err: any) {
      console.error("[Agent] Erreur création répertoires:", err.message);
    }
  }

  private loadPersistedData() {
    try {
      if (fs.existsSync(EXPORT_FILE)) {
        const raw = fs.readFileSync(EXPORT_FILE, "utf-8");
        const list: ExportedVideo[] = JSON.parse(raw);
        for (const v of list) {
          // Filtrer selon la nouvelle règle stricte : >= 10 minutes (600s)
          if (!v.durationSeconds || v.durationSeconds >= 600) {
            this.exportedVideos.set(v.id, v);
          }
        }
      }
      if (fs.existsSync(LOG_FILE)) {
        const raw = fs.readFileSync(LOG_FILE, "utf-8");
        this.logs = JSON.parse(raw).slice(-50); // Keep last 50 logs
      }
    } catch (err: any) {
      console.error("[Agent] Erreur chargement persistance:", err.message);
    }
  }

  private persistData() {
    try {
      fs.writeFileSync(EXPORT_FILE, JSON.stringify(Array.from(this.exportedVideos.values()), null, 2), "utf-8");
      fs.writeFileSync(LOG_FILE, JSON.stringify(this.logs.slice(-50), null, 2), "utf-8");
    } catch (err: any) {
      console.error("[Agent] Erreur sauvegarde persistance:", err.message);
    }
  }

  public registerKnownCatalogIds(ids: string[]) {
    for (const id of ids) {
      this.knownCatalogIds.add(id);
    }
  }

  public startScheduler() {
    // Planification quotidienne (chaque jour = 24 heures)
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    
    // Déclencher une vérification silencieuse 15 secondes après le démarrage
    setTimeout(() => {
      this.runSilentSync("Démarrage automatique du serveur");
    }, 15000);

    // Répéter toutes les 24 heures sans interruption
    this.intervalTimer = setInterval(() => {
      this.runSilentSync("Exécution quotidienne programmée");
    }, TWENTY_FOUR_HOURS);

    this.nextRunTime = new Date(Date.now() + TWENTY_FOUR_HOURS).toISOString();
    console.log("[Agent Quotidien] Planificateur démarré (Mode Silencieux — Vérification toutes les 24h, filtre >= 10min)");
  }

  public stopScheduler() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  /**
   * Crawle une chaîne YouTube spécifique pour extraire les vidéos
   */
  private async crawlChannelVideos(channel: MonitoredChannel): Promise<Array<{ id: string; title: string; duration: string; durationSeconds: number }>> {
    const results: Array<{ id: string; title: string; duration: string; durationSeconds: number }> = [];
    try {
      const res = await fetch(`${channel.url}/videos`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "fr-FR,fr;q=0.9",
        },
      });
      if (!res.ok) return results;

      const html = await res.text();
      const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"(.*?)"/);
      const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/ytInitialData = ({.*?});/s);
      if (!dataMatch) return results;

      const initialData = JSON.parse(dataMatch[1]);
      const seenIds = new Set<string>();

      const parseObject = (obj: any) => {
        if (!obj || typeof obj !== "object") return;
        if (obj.lockupViewModel && obj.lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_VIDEO") {
          const vm = obj.lockupViewModel;
          const videoId = vm.contentId;
          if (videoId && !seenIds.has(videoId)) {
            seenIds.add(videoId);
            const title = vm.metadata?.lockupMetadataViewModel?.title?.content || "Nouvelle Vidéo";
            const badge = vm.contentImage?.thumbnailViewModel?.overlays?.find(
              (o: any) => o.thumbnailBottomOverlayViewModel
            );
            const duration = badge?.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel?.text || "—";
            const sec = parseDurationSeconds(duration);
            results.push({ id: videoId, title, duration, durationSeconds: sec });
          }
        } else if (obj.videoRenderer) {
          const vr = obj.videoRenderer;
          const videoId = vr.videoId;
          if (videoId && !seenIds.has(videoId)) {
            seenIds.add(videoId);
            const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || "Nouvelle Vidéo";
            const duration = vr.lengthText?.simpleText || "—";
            const sec = parseDurationSeconds(duration);
            results.push({ id: videoId, title, duration, durationSeconds: sec });
          }
        }
        for (const k of Object.keys(obj)) parseObject(obj[k]);
      };

      parseObject(initialData);

      // Pagination optionnelle de 1 page supplémentaire pour attraper les vidéos très récentes
      const findToken = (obj: any): string | null => {
        if (!obj || typeof obj !== "object") return null;
        if (obj.continuationCommand?.token) return obj.continuationCommand.token;
        for (const k of Object.keys(obj)) {
          const tok = findToken(obj[k]);
          if (tok) return tok;
        }
        return null;
      };

      const token = findToken(initialData);
      const apiKey = apiKeyMatch ? apiKeyMatch[1] : null;
      if (token && apiKey) {
        try {
          const resp = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
            body: JSON.stringify({
              context: { client: { clientName: "WEB", clientVersion: "2.20260910.01.00", hl: "fr", gl: "FR" } },
              continuation: token,
            }),
          });
          if (resp.ok) {
            const contData = await resp.json();
            parseObject(contData);
          }
        } catch {
          // Ignore pagination network issues
        }
      }
    } catch (err: any) {
      console.error(`[Agent] Erreur crawl ${channel.name}:`, err.message);
    }
    return results;
  }

  /**
   * Exécute une passe complète de synchronisation silencieuse
   */
  public async runSilentSync(triggerSource: string = "Manuel"): Promise<{
    newExportedCount: number;
    ignoredUnderTenCount: number;
    totalChannels: number;
  }> {
    if (this.isRunning) {
      return { newExportedCount: 0, ignoredUnderTenCount: 0, totalChannels: MONITORED_CHANNELS.length };
    }

    this.isRunning = true;
    const now = new Date();
    this.lastRunTime = now.toISOString();
    this.nextRunTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    let newExportedCount = 0;
    let ignoredUnderTenCount = 0;

    try {
      for (const ch of MONITORED_CHANNELS) {
        const videos = await this.crawlChannelVideos(ch);

        for (const v of videos) {
          // Vérifier si la vidéo est déjà connue
          const alreadyKnown = this.knownCatalogIds.has(v.id) || this.exportedVideos.has(v.id);

          // Règle stricte de l'utilisateur : les vidéos doivent faire AU MOINS 10 MINUTES (>= 600 secondes)
          // Exception accordée pour "Les Savants de la Sunnah"
          const isSavantsSunnah = ch.id === "savants-sunnah";
          if (!isSavantsSunnah && v.durationSeconds > 0 && v.durationSeconds < 600) {
            // Ignorée car moins de 10 min
            ignoredUnderTenCount++;
            continue;
          }

          // Si nouvelle vidéo et durée >= 10 min (ou non calculée encore >= 600s)
          if (!alreadyKnown) {
            const isTrailer = v.title.toLowerCase().includes("bande-annonce") || v.title.toLowerCase().includes("trailer");
            if (isTrailer) {
              ignoredUnderTenCount++;
              continue;
            }

            const exportedItem: ExportedVideo = {
              id: v.id,
              title: v.title,
              channel: ch.name,
              handle: ch.handle,
              duration: v.duration,
              durationSeconds: v.durationSeconds,
              url: `https://www.youtube.com/watch?v=${v.id}`,
              thumbnail: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
              exportedAt: new Date().toISOString(),
              category: ch.category,
            };

            this.exportedVideos.set(v.id, exportedItem);
            this.knownCatalogIds.add(v.id);
            newExportedCount++;
          }
        }
      }

      // Enregistrer le log
      const logEntry: AgentSyncLog = {
        id: `sync_${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: "success",
        channelsChecked: MONITORED_CHANNELS.length,
        newVideosExported: newExportedCount,
        videosUnderTenMinIgnored: ignoredUnderTenCount,
        details: `${triggerSource} : ${newExportedCount} nouvelle(s) vidéo(s) >= 10 min exportée(s), ${ignoredUnderTenCount} vidéo(s) < 10 min ignorée(s).`,
      };
      this.logs.unshift(logEntry);
      this.persistData();

      console.log(`[Agent Quotidien] Exécution terminée en silence : ${newExportedCount} exportées (>= 10 min), ${ignoredUnderTenCount} ignorées (< 10 min)`);
    } catch (err: any) {
      console.error("[Agent Quotidien] Erreur:", err.message);
      this.logs.unshift({
        id: `sync_${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: "error",
        channelsChecked: MONITORED_CHANNELS.length,
        newVideosExported: newExportedCount,
        videosUnderTenMinIgnored: ignoredUnderTenCount,
        details: `Erreur: ${err.message}`,
      });
    } finally {
      this.isRunning = false;
    }

    return {
      newExportedCount,
      ignoredUnderTenCount,
      totalChannels: MONITORED_CHANNELS.length,
    };
  }

  public getState(): AgentState {
    return {
      isActive: true,
      mode: "silent",
      frequencyHours: 24,
      minDurationMinutes: 10,
      lastRunTime: this.lastRunTime,
      nextRunTime: this.nextRunTime,
      totalExportedVideos: this.exportedVideos.size,
      monitoredChannels: MONITORED_CHANNELS,
      recentLogs: this.logs.slice(0, 20),
    };
  }

  public getExportedVideos(): ExportedVideo[] {
    return Array.from(this.exportedVideos.values()).sort(
      (a, b) => new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime()
    );
  }

  public generateCsv(): string {
    const videos = this.getExportedVideos();
    const headers = ["ID YouTube", "Titre", "Chaîne", "Identifiant Handle", "Durée", "Durée (sec)", "Lien Vidéo", "Date Export"];
    const rows = videos.map((v) => [
      v.id,
      `"${v.title.replace(/"/g, '""')}"`,
      `"${v.channel}"`,
      v.handle,
      v.duration,
      v.durationSeconds,
      v.url,
      v.exportedAt,
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
}

export const dailyChannelSyncAgent = new DailyChannelSyncAgent();
