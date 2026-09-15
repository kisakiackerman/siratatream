import fs from "fs";
import path from "path";

async function crawlMinuteIslam() {
  console.log("=== Crawling @MinuteIslam ===");
  const res = await fetch("https://www.youtube.com/@MinuteIslam/videos", {
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
    throw new Error("Could not parse ytInitialData from @MinuteIslam/videos");
  }

  const apiKey = apiKeyMatch ? apiKeyMatch[1] : null;
  const clientVersion = clientVerMatch ? clientVerMatch[1] : "2.20260910.01.00";
  const initialData = JSON.parse(dataMatch[1]);

  const videos = [];
  const seenIds = new Set();

  function parseDurationSeconds(dur) {
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

  function extractVideos(obj) {
    if (!obj || typeof obj !== "object") return;
    if (obj.lockupViewModel && obj.lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_VIDEO") {
      const vm = obj.lockupViewModel;
      const id = vm.contentId;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        const title = vm.metadata?.lockupMetadataViewModel?.title?.content || "Vidéo";
        const badge = vm.contentImage?.thumbnailViewModel?.overlays?.find(
          (o) => o.thumbnailBottomOverlayViewModel
        );
        const duration = badge?.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel?.text || "—";
        const sec = parseDurationSeconds(duration);
        const rows = vm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows;
        let views = "";
        let published = "";
        if (rows && rows[0]?.metadataParts) {
          views = rows[0].metadataParts[0]?.text?.content || "";
          published = rows[0].metadataParts[1]?.text?.content || "";
        }
        videos.push({
          id,
          title: title.trim(),
          duration,
          durationSec: sec,
          views: views.trim(),
          published: published.trim(),
          url: `https://www.youtube.com/watch?v=${id}`,
          thumbnailUrl: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
          channel: "Minute Islam",
          handle: "@MinuteIslam"
        });
      }
    } else if (obj.videoRenderer) {
      const vr = obj.videoRenderer;
      const id = vr.videoId;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || "Vidéo";
        const duration = vr.lengthText?.simpleText || "—";
        const sec = parseDurationSeconds(duration);
        const views = vr.viewCountText?.simpleText || "";
        const published = vr.publishedTimeText?.simpleText || "";
        videos.push({
          id,
          title: title.trim(),
          duration,
          durationSec: sec,
          views: views.trim(),
          published: published.trim(),
          url: `https://www.youtube.com/watch?v=${id}`,
          thumbnailUrl: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
          channel: "Minute Islam",
          handle: "@MinuteIslam"
        });
      }
    }
    for (const k of Object.keys(obj)) extractVideos(obj[k]);
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

  extractVideos(initialData);

  let token = findToken(initialData);
  let page = 0;
  while (token && apiKey && page < 50) {
    page++;
    try {
      const resp = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify({
          context: { client: { clientName: "WEB", clientVersion, hl: "fr", gl: "FR" } },
          continuation: token
        })
      });
      const resData = await resp.json();
      const prevLen = videos.length;
      extractVideos(resData);
      token = findToken(resData);
      if (videos.length === prevLen) break;
    } catch (e) {
      console.error("Pagination error:", e.message);
      break;
    }
  }

  console.log(`Retrieved total ${videos.length} videos from @MinuteIslam.`);
  return videos;
}

async function run() {
  const allVideos = await crawlMinuteIslam();

  // Check which videos are already in the application
  const catalogContent = fs.readFileSync("./src/data/catalog.ts", "utf-8");
  const rawMatch = catalogContent.match(/const minuteIslamRaw:.*?=\s*(\[[\s\S]*?\n\];)/);
  const existingCatalogIds = new Set();
  if (rawMatch) {
    const matches = [...rawMatch[1].matchAll(/\["([^"]+)",/g)];
    matches.forEach((m) => existingCatalogIds.add(m[1]));
  }

  // Annotate all videos
  const annotatedAllVideos = allVideos.map((v) => ({
    ...v,
    alreadyInApp: existingCatalogIds.has(v.id),
    isOver10Min: v.durationSec >= 600
  }));

  // Filter for videos of more than 10 minutes (>= 600s)
  const over10MinVideos = annotatedAllVideos.filter((v) => v.durationSec >= 600);

  const alreadyInCount = over10MinVideos.filter((v) => v.alreadyInApp).length;
  const newVidsCount = over10MinVideos.filter((v) => !v.alreadyInApp).length;

  console.log(`\n=== Summary ===`);
  console.log(`Total videos on channel: ${annotatedAllVideos.length}`);
  console.log(`Videos >= 10 mins (600s): ${over10MinVideos.length}`);
  console.log(`- Already in application catalog: ${alreadyInCount}`);
  console.log(`- New videos not yet in catalog: ${newVidsCount}`);

  // 1. Export JSON: minute_islam_videos_over_10min.json
  fs.writeFileSync(
    "./minute_islam_videos_over_10min.json",
    JSON.stringify(over10MinVideos, null, 2),
    "utf-8"
  );
  console.log("Saved: ./minute_islam_videos_over_10min.json");

  // 2. Export JSON: minute_islam_all_videos.json
  fs.writeFileSync(
    "./minute_islam_all_videos.json",
    JSON.stringify(annotatedAllVideos, null, 2),
    "utf-8"
  );
  console.log("Saved: ./minute_islam_all_videos.json");

  // 3. Export CSV: minute_islam_videos_over_10min.csv
  const headers = [
    "ID YouTube",
    "Titre",
    "Duree",
    "Duree_Secondes",
    "Vues",
    "Date_Publication",
    "Lien_YouTube",
    "Deja_Dans_App"
  ];
  const csvRows = over10MinVideos.map((v) => {
    return [
      `"${v.id}"`,
      `"${v.title.replace(/"/g, '""')}"`,
      `"${v.duration}"`,
      `${v.durationSec}`,
      `"${v.views.replace(/"/g, '""')}"`,
      `"${v.published.replace(/"/g, '""')}"`,
      `"${v.url}"`,
      `"${v.alreadyInApp ? "OUI" : "NON"}"`
    ].join(";");
  });
  const csvContent = "\uFEFF" + [headers.join(";"), ...csvRows].join("\n");
  fs.writeFileSync("./minute_islam_videos_over_10min.csv", csvContent, "utf-8");
  console.log("Saved: ./minute_islam_videos_over_10min.csv");

  // 4. Update channelVideoDurations.ts with all scraped durations
  try {
    const durationsPath = "./src/data/channelVideoDurations.ts";
    let durationsContent = fs.readFileSync(durationsPath, "utf-8");
    let addedCount = 0;
    for (const v of allVideos) {
      if (!durationsContent.includes(`"${v.id}":`)) {
        // Insert right before the closing bracket of channelVideoDurations
        const insertPos = durationsContent.lastIndexOf("};");
        if (insertPos !== -1) {
          const entry = `  "${v.id}": {\n    "duration": "${v.duration}"\n  },\n`;
          durationsContent =
            durationsContent.slice(0, insertPos) + entry + durationsContent.slice(insertPos);
          addedCount++;
        }
      }
    }
    fs.writeFileSync(durationsPath, durationsContent, "utf-8");
    console.log(`Updated channelVideoDurations.ts: added ${addedCount} new duration entries.`);
  } catch (err) {
    console.error("Could not update channelVideoDurations.ts:", err.message);
  }
}

run().catch(console.error);
