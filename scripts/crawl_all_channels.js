import fs from "fs";

const CHANNELS = [
  { id: "din-ul-qayyima", name: "Din-ul-Qayyima", handle: "@DinulQayyima1" },
  { id: "towards-eternity", name: "Towards Eternity", handle: "@TowardsEternityFrancais" },
  { id: "narro-din", name: "NARRO DIN", handle: "@dinnarro" },
  { id: "narro", name: "NARRO", handle: "@narrostory" },
  { id: "yacine", name: "Yacine", handle: "@yacinetareb" },
  { id: "croyant-rationnel", name: "Croyant Rationnel", handle: "@croyantrationnel" },
  { id: "minute-islam", name: "Minute Islam", handle: "@MinuteIslam" },
  { id: "sur-le-chemin", name: "Sur le chemin de la prophétie", handle: "@Surlecheminde" },
  { id: "averoeshistoire", name: "Averroès Histoire", handle: "@averoeshistoire" }
];

export function parseDurationSeconds(dur) {
  if (!dur || dur === "—") return 0;
  const str = dur.trim();
  if (str.includes(":")) {
    const p = str.split(":").map(Number);
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
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

export async function crawlChannel(handle, minDurationSeconds = 0) {
  try {
    const res = await fetch(`https://www.youtube.com/${handle}/videos`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9"
      }
    });
    const html = await res.text();
    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"(.*?)"/);
    const clientVerMatch = html.match(/"INNERTUBE_CLIENT_VERSION":"(.*?)"/);
    const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/ytInitialData = ({.*?});/s);

    if (!dataMatch) {
      console.error(`[Crawl] Could not parse ytInitialData for ${handle}`);
      return [];
    }

    const apiKey = apiKeyMatch ? apiKeyMatch[1] : null;
    const clientVersion = clientVerMatch ? clientVerMatch[1] : "2.20260910.01.00";
    const initialData = JSON.parse(dataMatch[1]);

    const videos = [];
    const seenIds = new Set();

    function parseObject(obj) {
      if (!obj || typeof obj !== "object") return;
      if (obj.lockupViewModel && obj.lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_VIDEO") {
        const vm = obj.lockupViewModel;
        const videoId = vm.contentId;
        if (videoId && !seenIds.has(videoId)) {
          seenIds.add(videoId);
          const title = vm.metadata?.lockupMetadataViewModel?.title?.content || "Vidéo";
          const badge = vm.contentImage?.thumbnailViewModel?.overlays?.find(
            (o) => o.thumbnailBottomOverlayViewModel
          );
          const duration = badge?.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel?.text || "—";
          const sec = parseDurationSeconds(duration);
          if (sec === 0 || sec >= minDurationSeconds) {
            videos.push({ id: videoId, title, duration, durationSeconds: sec, handle });
          }
        }
      } else if (obj.videoRenderer) {
        const vr = obj.videoRenderer;
        const videoId = vr.videoId;
        if (videoId && !seenIds.has(videoId)) {
          seenIds.add(videoId);
          const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || "Vidéo";
          const duration = vr.lengthText?.simpleText || "—";
          const sec = parseDurationSeconds(duration);
          if (sec === 0 || sec >= minDurationSeconds) {
            videos.push({ id: videoId, title, duration, durationSeconds: sec, handle });
          }
        }
      }
      for (const k of Object.keys(obj)) parseObject(obj[k]);
    }

    function findToken(obj) {
      if (!obj || typeof obj !== "object") return null;
      if (obj.continuationCommand?.token) return obj.continuationCommand.token;
      for (const k of Object.keys(obj)) {
        const tok = findToken(obj[k]);
        if (tok) return tok;
      }
      return null;
    }

    parseObject(initialData);

    // Fetch up to 30 continuations per channel to get full channel archives
    let continuationToken = findToken(initialData);
    let pageCount = 0;
    while (continuationToken && apiKey && pageCount < 30) {
      pageCount++;
      try {
        const resp = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
          body: JSON.stringify({
            context: { client: { clientName: "WEB", clientVersion, hl: "fr", gl: "FR" } },
            continuation: continuationToken
          })
        });
        const resData = await resp.json();
        const prevCount = videos.length;
        parseObject(resData);
        continuationToken = findToken(resData);
        if (videos.length === prevCount) break;
      } catch (e) {
        console.error(`[Crawl Continuation Error] ${handle}:`, e.message);
        break;
      }
    }

    console.log(`[Crawl] ${handle}: Retrieved ${videos.length} videos`);
    return videos;
  } catch (err) {
    console.error(`[Crawl Error] ${handle}:`, err.message);
    return [];
  }
}

async function run() {
  const allDurations = {};
  for (const ch of CHANNELS) {
    const list = await crawlChannel(ch.handle, 0);
    for (const v of list) {
      allDurations[v.id] = {
        title: v.title,
        duration: v.duration,
        durationSeconds: v.durationSeconds,
        handle: ch.handle,
        channel: ch.name
      };
    }
  }
  fs.writeFileSync("./all_channels_durations.json", JSON.stringify(allDurations, null, 2), "utf-8");
  console.log(`Done! Total video durations mapped: ${Object.keys(allDurations).length}`);
}

if (process.argv[1]?.endsWith("crawl_all_channels.js")) {
  run();
}
