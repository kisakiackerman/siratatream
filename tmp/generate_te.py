import json, re

with open('towards_eternity_all_videos.json', 'r', encoding='utf-8') as f:
    videos = json.load(f)

# Load existing towardsEternityRaw descriptions and towardsEternityMeta from catalog.ts
with open('src/data/catalog.ts', 'r', encoding='utf-8') as f:
    catalog_ts = f.read()

existing_desc = {}
items = re.findall(r'\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\]', catalog_ts)
for yid, title, desc in items:
    existing_desc[yid] = (title, desc)

def determine_category(title):
    t = title.lower()
    if any(k in t for k in ['prophète', 'prophete', 'messager', 'sîra', 'sira', 'ibrahim', 'moussa', 'youssouf', 'yusuf', 'noe', 'noé', 'adam', 'issa', 'jésus', 'jesus']):
        return 'Prophètes'
    if any(k in t for k in ['compagnon', 'hamza', 'omar', 'ali ', 'bilal', 'khadija', 'fatima', 'abou bakr', 'abu bakr', 'aïcha', 'aicha']):
        return 'Compagnons'
    if any(k in t for k in ['miracle', 'coran', 'science', 'astronomie', 'sourate', 'verset', 'respiration']):
        return 'Miracles du Coran'
    if any(k in t for k in ['fin des temps', 'jugement', 'apocalypse', 'dajjal', 'enfer', 'paradis', 'barzakh', 'mort', 'tombe']):
        return 'Eschatologie'
    if any(k in t for k in ['ange', 'djinn', 'djinns', 'chaytan', 'satan', 'iblis']):
        return 'Anges & Djinns'
    if any(k in t for k in ['converti', 'conversion', 'témoignage', 'imam', 'prêtre', 'bouddhiste', 'juive', 'chrétien', 'athée', 'jeune', 'génération z', 'akhi']):
        return 'Héros & Personnages'
    return 'Histoire & Mystère'

def make_description(title, existing_d):
    if existing_d:
        return existing_d
    clean_title = title.replace('"', "'").strip()
    return f"Découvrez cet épisode exclusif de Towards Eternity Français : « {clean_title} ». Une réflexion spirituelle approfondie et documentée."

lines = []
lines.append("// Export complet des vidéos de la chaîne Towards Eternity Français")
lines.append("// Total: 199 vidéos cataloguées avec métadonnées, catégories et durées")
lines.append("")
lines.append("import type { Category, SkipSegment } from './catalog';")
lines.append("")
lines.append("export type TowardsEternityMetaItem = {")
lines.append("  cats: Category[];")
lines.append("  year: number;")
lines.append("  featured?: boolean;")
lines.append("  isNew?: boolean;")
lines.append("  isTrending?: boolean;")
lines.append("  duration?: string;")
lines.append("  skipSegments?: SkipSegment[];")
lines.append("  seriesId?: string;")
lines.append("  seriesTitle?: string;")
lines.append("  episodeNumber?: number;")
lines.append("  totalEpisodes?: number;")
lines.append("};")
lines.append("")
lines.append("export const towardsEternityRaw: [string, string, string][] = [")

for v in videos:
    yid = v['id']
    raw_title = v['title']
    old_title, old_desc = existing_desc.get(yid, (None, None))
    title = old_title if old_title else raw_title
    desc = make_description(title, old_desc)
    
    t_json = json.dumps(title, ensure_ascii=False)
    d_json = json.dumps(desc, ensure_ascii=False)
    lines.append(f"  [\"{yid}\", {t_json}, {d_json}],")

lines.append("];")
lines.append("")
lines.append("export const towardsEternityMeta: Record<string, TowardsEternityMetaItem> = {")

for i, v in enumerate(videos):
    yid = v['id']
    cat = determine_category(v['title'])
    is_new = (i < 15)
    is_trending = (i < 8 or v.get('viewCount', 0) > 100000)
    featured = (i == 0 or 'sîra' in v['title'].lower() or 'prophète muhammad' in v['title'].lower())
    dur = v.get('timeBadge', '15:00')
    
    extra = []
    if featured:
        extra.append("    featured: true,")
    if is_new:
        extra.append("    isNew: true,")
    if is_trending:
        extra.append("    isTrending: true,")
    if dur:
        extra.append(f"    duration: \"{dur}\",")
        
    extra_str = "\n".join(extra)
    if extra_str:
        extra_str = "\n" + extra_str

    lines.append(f"  \"{yid}\": {{\n    cats: [\"{cat}\"],\n    year: 2024,{extra_str}\n  }},")

lines.append("};")
lines.append("")

with open('src/data/towardsEternityVideos.ts', 'w', encoding='utf-8') as f:
    f.write("\n".join(lines))

print("Generated src/data/towardsEternityVideos.ts successfully!")
