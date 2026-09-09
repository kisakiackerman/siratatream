export type Category =
  | "Coran"
  | "Prophètes"
  | "Compagnons"
  | "Anges & Djinns"
  | "Eschatologie"
  | "Miracles du Coran"
  | "Héros & Personnages"
  | "Histoire & Mystère";

export type Channel =
  | "NARRO"
  | "NARRO DIN"
  | "Yacine"
  | "Towards Eternity"
  | "Croyant Rationnel"
  | "Récitations Haramain"
  | "Minute Islam"
  | string;

export type SkipSegment = {
  start: number; // in seconds (e.g. 15)
  end: number;   // in seconds (e.g. 75)
  label?: string; // e.g. "Passer la pub créateur", "Passer le sponsor", "Passer l'intro"
  type?: "sponsor" | "intro" | "promo";
};

export type VideoSourceType = "youtube" | "direct" | "vimeo" | "dailymotion" | "hls";

export type AudioTrackItem = {
  code: string;
  label: string;
  url: string;
};

export type ContentItem = {
  id: string;
  youtubeId: string;
  videoUrl?: string; // Direct MP4 / WebM / HLS / Custom video URL
  videoSourceType?: VideoSourceType;
  downloadUrl?: string; // Direct downloadable video URL for offline export
  title: string;
  description: string;
  channel: Channel;
  categories: Category[];
  year: number;
  rating: string;
  duration: string;
  score: number;
  thumbnail: string;
  image: string;
  heroImage?: string;
  audioUrl?: string;
  audioTracks?: AudioTrackItem[];
  featured?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  skipSegments?: SkipSegment[];
  seriesId?: string;
  seriesTitle?: string;
  episodeNumber?: number;
  totalEpisodes?: number;
};

export type ContentRowData = {
  id: string;
  label: string;
  items: ContentItem[];
};

const getThumbnail = (id: string) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;

type MetaRecord = Record<
  string,
  {
    cats: Category[];
    year: number;
    featured?: boolean;
    isNew?: boolean;
    isTrending?: boolean;
    audioUrl?: string;
    skipSegments?: SkipSegment[];
    seriesId?: string;
    seriesTitle?: string;
    episodeNumber?: number;
    totalEpisodes?: number;
  }
>;

const narroDinMeta: MetaRecord = {
  GBxsINL9kWw: {
    cats: ["Prophètes", "Histoire & Mystère"],
    year: 2026,
    featured: true,
    isTrending: true,
    isNew: true,
    skipSegments: [{ start: 0, end: 40, label: "Passer l'intro", type: "intro" }],
  },
  rgYrqJzdCSU: { cats: ["Prophètes"], year: 2026, isNew: true },
  JrpGTkMg0_Q: { cats: ["Prophètes", "Histoire & Mystère"], year: 2026, isNew: true },
  TZBy2GxSuTM: {
    cats: ["Miracles du Coran", "Histoire & Mystère"],
    year: 2026,
    isTrending: true,
    isNew: true,
    skipSegments: [{ start: 0, end: 35, label: "Passer l'intro", type: "intro" }],
  },
  thjHAg96G6U: { cats: ["Prophètes", "Histoire & Mystère"], year: 2026, isNew: true },
  "3yhT43ksbNM": { cats: ["Compagnons", "Héros & Personnages"], year: 2026, isNew: true },
  xMD45907G1U: { cats: ["Compagnons", "Histoire & Mystère"], year: 2026, isNew: true },
  NaQkMZrViT0: { cats: ["Eschatologie", "Histoire & Mystère"], year: 2026, isNew: true },
  "6SiRX2iN0rI": {
    cats: ["Miracles du Coran"],
    year: 2026,
    isTrending: true,
    isNew: true,
    skipSegments: [{ start: 0, end: 30, label: "Passer l'intro", type: "intro" }],
  },
  z3J9QrwSwec: {
    cats: ["Miracles du Coran", "Histoire & Mystère"],
    year: 2026,
    isTrending: true,
    isNew: true,
  },
  MeedZt1oVhA: {
    cats: ["Miracles du Coran", "Histoire & Mystère"],
    year: 2026,
    isTrending: true,
    isNew: true,
  },
  DfXoCLzweMA: {
    cats: ["Miracles du Coran", "Histoire & Mystère"],
    year: 2026,
    isTrending: true,
    isNew: true,
  },
  zm3pq24HhVM: {
    cats: ["Miracles du Coran", "Histoire & Mystère"],
    year: 2025,
    isTrending: true,
  },
  wNqNWexMLBI: {
    cats: ["Héros & Personnages", "Histoire & Mystère"],
    year: 2025,
    isTrending: true,
  },
  Vz2CoMfNv_U: {
    cats: ["Héros & Personnages", "Histoire & Mystère"],
    year: 2025,
    isTrending: true,
  },
  xh8YgT0eX10: {
    cats: ["Prophètes", "Histoire & Mystère"],
    year: 2026,
    isTrending: true,
    isNew: true,
  },
};

const narroMeta: MetaRecord = {
  VZJLHaqxZw4: { cats: ["Prophètes"], year: 2025 },
  "EK-lMsID6_U": { cats: ["Prophètes"], year: 2025 },
  _Hr6yBbTIM0: { cats: ["Prophètes"], year: 2025 },
  rPPlFnKVS2A: { cats: ["Prophètes", "Eschatologie"], year: 2024 },
  sMxBVKavPO8: { cats: ["Prophètes", "Héros & Personnages"], year: 2024 },
  xohQqtH1v9k: { cats: ["Prophètes"], year: 2024 },
  "YxBKtvmQS-M": { cats: ["Prophètes"], year: 2024 },
  VT14KYY0jWA: { cats: ["Prophètes"], year: 2025 },
  "MBa9gBXa-18": { cats: ["Prophètes", "Histoire & Mystère"], year: 2024 },
  Xs26kdKEwlg: {
    cats: ["Prophètes", "Histoire & Mystère"],
    year: 2025,
    featured: true,
    isTrending: true,
    skipSegments: [{ start: 0, end: 40, label: "Passer l'intro & pub créateur", type: "sponsor" }],
  },
  utZ20jFavhU: {
    cats: ["Histoire & Mystère"],
    year: 2025,
    isTrending: true,
    skipSegments: [{ start: 18, end: 72, label: "Passer le sponsor", type: "sponsor" }],
  },
  SWe239O2q6I: { cats: ["Héros & Personnages", "Anges & Djinns"], year: 2025, isTrending: true },
  "5NRBBvu7Lcs": { cats: ["Prophètes", "Histoire & Mystère"], year: 2025 },
  FJH_e5pwMzk: {
    cats: ["Prophètes", "Histoire & Mystère"],
    year: 2025,
    isNew: true,
    skipSegments: [{ start: 10, end: 55, label: "Passer la pub créateur", type: "sponsor" }],
  },
  X7b8kSW3PB0: {
    cats: ["Eschatologie"],
    year: 2025,
    isNew: true,
    skipSegments: [{ start: 0, end: 38, label: "Passer l'intro", type: "intro" }],
  },
  vDI4EzrKEQ8: { cats: ["Eschatologie"], year: 2024, isNew: true },
  UE0Ult3AtrU: { cats: ["Compagnons", "Héros & Personnages"], year: 2025, isTrending: true },
  NN1CwPcgcCU: { cats: ["Compagnons", "Héros & Personnages"], year: 2025 },
  "FJguj-Pi59w": { cats: ["Héros & Personnages"], year: 2025 },
  WKGSN68aBkI: { cats: ["Héros & Personnages", "Histoire & Mystère"], year: 2024 },
  "n-zTOILPVp4": {
    cats: ["Anges & Djinns", "Eschatologie"],
    year: 2026,
    isTrending: true,
    featured: true,
    skipSegments: [{ start: 25, end: 85, label: "Passer l'annonce créateur", type: "sponsor" }],
  },
  CuxJEvI3eto: {
    cats: ["Anges & Djinns", "Histoire & Mystère"],
    year: 2026,
    isNew: true,
    skipSegments: [{ start: 30, end: 88, label: "Passer la pub créateur", type: "sponsor" }],
  },
  ShAjaaV2YjM: { cats: ["Eschatologie", "Histoire & Mystère"], year: 2026, isNew: true },
  "1zks1SMNvIY": { cats: ["Anges & Djinns", "Histoire & Mystère"], year: 2024 },
  "4KNarj80mnY": { cats: ["Eschatologie", "Anges & Djinns"], year: 2024 },
  "77a2ywhTNhY": { cats: ["Eschatologie", "Anges & Djinns"], year: 2025 },
  CG1BG1U5jXU: { cats: ["Eschatologie"], year: 2025, isTrending: true },
  CzfGmFN6iao: { cats: ["Prophètes", "Histoire & Mystère"], year: 2025 },
  MQZnYFWTgJs: { cats: ["Eschatologie", "Histoire & Mystère"], year: 2024 },
  h3SbP3FDd28: { cats: ["Histoire & Mystère", "Miracles du Coran"], year: 2024 },
  i0okdKbT788: { cats: ["Prophètes", "Histoire & Mystère"], year: 2024 },
  UnmxHm8y5a4: { cats: ["Prophètes", "Histoire & Mystère"], year: 2024 },
  "Nv-bAdXllkk": { cats: ["Histoire & Mystère"], year: 2026, isTrending: true },
  ZxhTqFuSAzg: { cats: ["Histoire & Mystère"], year: 2025 },
  "4WQnXfkWygs": { cats: ["Héros & Personnages", "Histoire & Mystère"], year: 2025 },
  VCkkV5RSQMQ: { cats: ["Histoire & Mystère"], year: 2025, isNew: true },
  "EZh-MCNkicc": { cats: ["Histoire & Mystère"], year: 2025 },
  lZ7B_dZfvPA: { cats: ["Prophètes", "Héros & Personnages"], year: 2026, isNew: true },
  xDdF3LCbaGI: { cats: ["Eschatologie"], year: 2024 },
  t5iOxpukiPk: { cats: ["Histoire & Mystère"], year: 2026, isNew: true },
  r7xjc_c0kyI: { cats: ["Histoire & Mystère"], year: 2026, isNew: true },
  "4W8uaeXSQyc": { cats: ["Histoire & Mystère"], year: 2026, isNew: true },
  z6gp6VkXvek: { cats: ["Histoire & Mystère"], year: 2026, isNew: true },
  Di3yiK6E77Q: { cats: ["Histoire & Mystère"], year: 2026, isNew: true },
  "7MTukb8H1vc": { cats: ["Eschatologie", "Histoire & Mystère"], year: 2026, isNew: true, isTrending: true },
  Sp1zalDQXMo: { cats: ["Compagnons", "Héros & Personnages"], year: 2026, isNew: true, isTrending: true },
  "O8kPaIVY-mM": { cats: ["Coran", "Héros & Personnages"], year: 2026, isNew: true },
  NXEnXySiBIQ: { cats: ["Coran", "Héros & Personnages"], year: 2026, isNew: true },
  Egf2qRzhz9A: { cats: ["Coran", "Héros & Personnages"], year: 2026, isNew: true },
  VUtFKzjd2cI: { cats: ["Coran", "Héros & Personnages"], year: 2026, isNew: true },
  aDGgpwEUXk0: { cats: ["Coran", "Héros & Personnages"], year: 2026, isNew: true },
  PVWqIyow9z0: { cats: ["Coran", "Héros & Personnages"], year: 2026, isNew: true },
  G1thorI5y_8: { cats: ["Coran", "Héros & Personnages"], year: 2026, isNew: true },
  wuXB_PGaJjY: { cats: ["Prophètes", "Miracles du Coran"], year: 2026, isNew: true, isTrending: true },
  "6eEovH89rxw": { cats: ["Compagnons", "Héros & Personnages"], year: 2026, isNew: true },
  L4CQr7P6URI: { cats: ["Coran", "Héros & Personnages"], year: 2026, isNew: true },
  cjm6z_Fx174: { cats: ["Prophètes", "Histoire & Mystère"], year: 2026, isNew: true },
  esxkBnouDLU: { cats: ["Anges & Djinns", "Histoire & Mystère"], year: 2026, isNew: true },
  _Tni4gMfWFA: { cats: ["Histoire & Mystère", "Héros & Personnages"], year: 2026, isNew: true, isTrending: true },
  "jkY0e0FK0-M": { cats: ["Compagnons", "Héros & Personnages"], year: 2026, isNew: true },
  "2wHPGTfmW4s": { cats: ["Histoire & Mystère", "Prophètes"], year: 2026, isNew: true },
  "cX-rgOf_RKI": { cats: ["Prophètes", "Histoire & Mystère"], year: 2026, isNew: true },
  ZmrFoGS4NpY: { cats: ["Histoire & Mystère", "Héros & Personnages"], year: 2026, isNew: true, isTrending: true },
  "g2I53FcIv-k": { cats: ["Compagnons", "Héros & Personnages"], year: 2026, isNew: true },
  puYY5tfN0CU: { cats: ["Histoire & Mystère"], year: 2026, isNew: true },
  SdDuBzUTFT0: { cats: ["Héros & Personnages", "Histoire & Mystère"], year: 2026, isNew: true },
  kejGlN7VskA: { cats: ["Eschatologie"], year: 2026, isNew: true },
  kRLDZvJkOrE: { cats: ["Anges & Djinns"], year: 2026, isNew: true },
  Ec6yK7RHhD8: { cats: ["Eschatologie"], year: 2026, isNew: true },
  "51MgS858wpk": { cats: ["Compagnons", "Héros & Personnages"], year: 2026, isNew: true },
  iY94z7g3Jcc: { cats: ["Eschatologie"], year: 2026, isNew: true },
  eFBzKtGtNUY: { cats: ["Eschatologie", "Anges & Djinns"], year: 2026, isNew: true },
};

const yacineMeta: MetaRecord = {
  fuX7BViVyno: {
    cats: ["Prophètes", "Eschatologie"],
    year: 2023,
    isTrending: true,
    skipSegments: [{ start: 0, end: 45, label: "Passer l'intro & pub créateur", type: "sponsor" }],
  },
  gl0GKDB3Nvo: {
    cats: ["Prophètes"],
    year: 2023,
    featured: true,
    skipSegments: [{ start: 12, end: 68, label: "Passer le sponsor Mubeen", type: "sponsor" }],
  },
  DE6eRTl43DI: { cats: ["Prophètes"], year: 2023 },
  XKl4Y36qREs: {
    cats: ["Prophètes"],
    year: 2024,
    isTrending: true,
    skipSegments: [{ start: 20, end: 75, label: "Passer la pub créateur", type: "sponsor" }],
  },
  Kx6yF2PtsHg: { cats: ["Prophètes", "Histoire & Mystère"], year: 2023 },
  pjyGmUKhx14: { cats: ["Prophètes", "Histoire & Mystère"], year: 2023 },
  "EGJndSj_-SI": { cats: ["Prophètes", "Anges & Djinns"], year: 2023 },
  m8PSuC3HmpA: { cats: ["Prophètes", "Histoire & Mystère"], year: 2023 },
  juNul3I0z94: { cats: ["Prophètes"], year: 2023 },
  "-zn3YHu_-ME": { cats: ["Prophètes", "Eschatologie"], year: 2023 },
  njgXO6BrLsA: {
    cats: ["Compagnons"],
    year: 2022,
    isTrending: true,
    skipSegments: [{ start: 15, end: 70, label: "Passer le sponsor", type: "sponsor" }],
  },
  bppu48Ew4QA: { cats: ["Compagnons", "Anges & Djinns"], year: 2023 },
  UjGV8zqtdl0: { cats: ["Compagnons", "Héros & Personnages"], year: 2023 },
  rSDp4XAo7qk: {
    cats: ["Compagnons", "Héros & Personnages"],
    year: 2024,
    isNew: true,
    skipSegments: [{ start: 18, end: 65, label: "Passer la pub créateur", type: "sponsor" }],
  },
  "8uqZxbv3-CM": { cats: ["Compagnons", "Héros & Personnages"], year: 2024, isNew: true },
  JcHMx17vdRE: { cats: ["Anges & Djinns"], year: 2023, isNew: true },
  iwM8rTPueGI: { cats: ["Anges & Djinns", "Histoire & Mystère"], year: 2023 },
  p3gneZAtQOs: { cats: ["Anges & Djinns", "Prophètes"], year: 2023 },
  qLGc1bPyHiw: { cats: ["Anges & Djinns"], year: 2023 },
  xoK96rMnQuU: { cats: ["Anges & Djinns"], year: 2023 },
  ZHPQEk7N6jY: { cats: ["Anges & Djinns", "Prophètes"], year: 2023 },
  "6SgZdJUHchk": { cats: ["Anges & Djinns"], year: 2023 },
  KePZWT2nCec: { cats: ["Anges & Djinns"], year: 2023 },
  "b1b1-uRfJGk": { cats: ["Anges & Djinns", "Eschatologie"], year: 2023 },
  "_T-ka-OFs60": { cats: ["Anges & Djinns", "Prophètes"], year: 2023 },
  pgo08KSRQU4: {
    cats: ["Eschatologie", "Anges & Djinns"],
    year: 2024,
    isTrending: true,
    skipSegments: [{ start: 0, end: 35, label: "Passer l'intro", type: "intro" }],
  },
  XSt2PV7MYQI: { cats: ["Eschatologie"], year: 2024 },
  w71TTKHSX98: { cats: ["Eschatologie"], year: 2024, isNew: true },
  PiJuYXJyRsM: { cats: ["Eschatologie"], year: 2023 },
  ESs8FC08MVI: { cats: ["Eschatologie", "Prophètes"], year: 2023 },
  "JFhFnBWxD-s": { cats: ["Eschatologie", "Prophètes"], year: 2023 },
  rMgQVmmpyeI: { cats: ["Eschatologie"], year: 2023 },
  "880zNwqJho4": { cats: ["Eschatologie"], year: 2023 },
  JCtF62S2TDI: { cats: ["Miracles du Coran"], year: 2023 },
  "Pn778jWiP-U": { cats: ["Miracles du Coran"], year: 2023 },
  U4Cdzsu0uaA: { cats: ["Miracles du Coran", "Prophètes"], year: 2023 },
  "Sj4JboSZ-qQ": { cats: ["Miracles du Coran", "Anges & Djinns"], year: 2023 },
  LItRZaIf3yY: { cats: ["Héros & Personnages", "Histoire & Mystère"], year: 2023 },
  spF8Fwo0wIk: { cats: ["Prophètes", "Histoire & Mystère"], year: 2023 },
  u4k1mgLtdVE: { cats: ["Prophètes", "Eschatologie"], year: 2023 },
  P0fLsMrOAA0: { cats: ["Héros & Personnages"], year: 2023 },
  pIuOqdEy2xs: { cats: ["Héros & Personnages", "Miracles du Coran"], year: 2023 },
  VDsqYf0Obvg: { cats: ["Héros & Personnages"], year: 2023 },
  wxBzydEYsdU: {
    cats: ["Histoire & Mystère", "Eschatologie"],
    year: 2026,
    isTrending: true,
    featured: true,
    skipSegments: [{ start: 30, end: 92, label: "Passer l'annonce créateur", type: "sponsor" }],
  },
  "_HV3aU0cx-g": { cats: ["Héros & Personnages"], year: 2026, isNew: true },
};

const towardsEternityMeta: MetaRecord = {
  c01ys_5EKSI: {
    cats: ["Prophètes"],
    year: 2024,
    featured: true,
    isTrending: true,
    skipSegments: [{ start: 0, end: 42, label: "Passer l'intro & annonce", type: "intro" }],
  },
  "vT-GmNItVJo": { cats: ["Prophètes"], year: 2024 },
  EeFh25K24x8: { cats: ["Prophètes", "Compagnons"], year: 2024 },
  LmLo4CO0LNw: { cats: ["Prophètes", "Miracles du Coran"], year: 2024 },
  "52C7ExmyPTw": { cats: ["Prophètes", "Histoire & Mystère"], year: 2024 },
  SFXsnEfVC1s: {
    cats: ["Prophètes", "Histoire & Mystère"],
    year: 2024,
    isTrending: true,
    skipSegments: [{ start: 15, end: 68, label: "Passer la pub créateur", type: "sponsor" }],
  },
  D9RaH5IoMCU: { cats: ["Prophètes", "Compagnons", "Héros & Personnages"], year: 2024 },
  yfF7IXb1q9Q: { cats: ["Prophètes", "Histoire & Mystère"], year: 2024 },
  YwOFj8edxaU: { cats: ["Prophètes"], year: 2024, isNew: true },
  TJL2ganDyBc: {
    cats: ["Compagnons"],
    year: 2024,
    isNew: true,
    isTrending: true,
    skipSegments: [{ start: 0, end: 32, label: "Passer l'intro", type: "intro" }],
  },
  "3C4U5WGmFs0": { cats: ["Héros & Personnages", "Histoire & Mystère"], year: 2024 },
  Yst8jgGviA8: { cats: ["Histoire & Mystère"], year: 2024 },
  "7NKz_Ixu4kc": { cats: ["Prophètes", "Histoire & Mystère"], year: 2024, isNew: true },
  nISqIWdpYQ8: {
    cats: ["Prophètes"],
    year: 2024,
    isTrending: true,
    skipSegments: [{ start: 10, end: 58, label: "Passer le sponsor", type: "sponsor" }],
  },
  WgPuTsCwhpc: { cats: ["Compagnons", "Héros & Personnages"], year: 2024, isTrending: true },
  aM14o1R2fkk: { cats: ["Miracles du Coran"], year: 2025, isNew: true },
  APx0E7O0x6c: { cats: ["Héros & Personnages", "Histoire & Mystère"], year: 2025, isNew: true },
  IjNfRBnR3Pk: { cats: ["Héros & Personnages", "Histoire & Mystère"], year: 2025, isNew: true },
  "8JcKbq06HRM": { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  "6nYvhq7rtaU": { cats: ["Prophètes"], year: 2024 },
  DnP3qd_Qwcs: { cats: ["Prophètes"], year: 2024 },
  yo4FjML2RKw: { cats: ["Prophètes", "Histoire & Mystère"], year: 2024 },
  jdqsiFw74Jk: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  "50ExPJin0Ho": { cats: ["Miracles du Coran"], year: 2024 },
  "9Nig8R3mHh4": { cats: ["Miracles du Coran"], year: 2025, isNew: true },
  HPlRgzr3g_c: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  HVoEpbeehnU: {
    cats: ["Histoire & Mystère"],
    year: 2025,
    isTrending: true,
    skipSegments: [{ start: 25, end: 82, label: "Passer l'annonce de soutien", type: "promo" }],
  },
  LR3rQ8EG498: { cats: ["Héros & Personnages", "Histoire & Mystère"], year: 2025, isNew: true },
  Pcwmler30yk: { cats: ["Eschatologie", "Histoire & Mystère"], year: 2025, isNew: true },
  QwN7qtPeOBg: { cats: ["Compagnons", "Héros & Personnages"], year: 2025, isNew: true },
  RyH0Ic_xMnw: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  TottSdGMDfM: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  U_KEkklNgE8: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  WXHW3Ac4CWo: { cats: ["Histoire & Mystère"], year: 2025, isTrending: true },
  bUsQT_fDBdw: { cats: ["Prophètes", "Héros & Personnages"], year: 2025, isNew: true },
  guKvNzcL4rQ: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  hFKDclO3EY0: { cats: ["Prophètes"], year: 2025, isNew: true },
  sW1m8S1plOw: { cats: ["Prophètes", "Miracles du Coran"], year: 2025, isNew: true },
  vnLKa4RkpAA: { cats: ["Prophètes", "Histoire & Mystère"], year: 2025, isTrending: true },
  xsQmE7GAGyA: { cats: ["Prophètes", "Héros & Personnages"], year: 2025, isNew: true },
  y2mevKuOKjo: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  AKfptpvAI1g: { cats: ["Miracles du Coran"], year: 2025, isNew: true },
  BYsk3Lz27Ho: { cats: ["Miracles du Coran"], year: 2025, isNew: true },
  EkfZS5kCUVY: { cats: ["Miracles du Coran", "Prophètes"], year: 2025, isNew: true },
  GN71AKyWUbg: { cats: ["Miracles du Coran"], year: 2025, isNew: true },
  "VUAaZoCe-bc": { cats: ["Miracles du Coran"], year: 2025, isNew: true },
  X3RLnBVL8Jc: { cats: ["Miracles du Coran"], year: 2025, isNew: true },
  qTUhSeWtCis: { cats: ["Miracles du Coran"], year: 2025, isNew: true },
  x3On4hWht00: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  "5q2o6PpwGbI": { cats: ["Eschatologie", "Histoire & Mystère"], year: 2025, isNew: true, isTrending: true },
  wCqt7QOA2QA: { cats: ["Histoire & Mystère", "Héros & Personnages"], year: 2025, isNew: true },
  wCstYQKX8U8: { cats: ["Histoire & Mystère", "Héros & Personnages"], year: 2025, isNew: true, isTrending: true },
  DtQp7r7e_J8: { cats: ["Eschatologie", "Histoire & Mystère"], year: 2025, isNew: true, isTrending: true },
  XNqzrQlLLFY: { cats: ["Histoire & Mystère", "Héros & Personnages"], year: 2025, isNew: true, isTrending: true },
};

const croyantRationnelMeta: MetaRecord = {
  "E-3Opi2yDjs": {
    cats: ["Eschatologie", "Histoire & Mystère"],
    year: 2025,
    isTrending: true,
    skipSegments: [{ start: 0, end: 36, label: "Passer l'intro & annonce", type: "intro" }],
  },
  Mt6LA6mtk9Q: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  "ewyOBQy66-4": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    isTrending: true,
    skipSegments: [{ start: 12, end: 60, label: "Passer la pub créateur", type: "sponsor" }],
  },
  h4e25tydSxI: { cats: ["Histoire & Mystère", "Héros & Personnages"], year: 2025, isNew: true },
  "h671xDi-hAA": { cats: ["Eschatologie"], year: 2025, isNew: true },
  hnp4sw7Zw0c: { cats: ["Histoire & Mystère"], year: 2025, isTrending: true },
  "s-R9ALodR6I": { cats: ["Anges & Djinns"], year: 2025, isNew: true },
  CNfOSXQsGsg: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  JAVM9SJlrig: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  KzXH2Io3LtM: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  "PpuOdplk-B8": { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  TClsJ1F398s: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  "Vqhwihm-R8c": { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  Vz3KE3CdvxU: { cats: ["Compagnons", "Héros & Personnages"], year: 2025, isNew: true },
  eeLYvyGSTgo: { cats: ["Héros & Personnages", "Histoire & Mystère"], year: 2025, isNew: true },
  mGf0E0jfeNc: { cats: ["Histoire & Mystère"], year: 2025, isNew: true },
  nZx97arDIHE: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  qlhM54Cptxw: { cats: ["Eschatologie", "Anges & Djinns"], year: 2025, isNew: true, isTrending: true },
  "xmzTjT-hwJ8": { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  zLR8DEOThwc: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  WUx1ErC39EQ: { cats: ["Histoire & Mystère", "Héros & Personnages"], year: 2026, isNew: true, isTrending: true },
  VWvVZdhYFtk: { cats: ["Eschatologie", "Histoire & Mystère"], year: 2026, isNew: true },
  SkKnO_g1BrA: { cats: ["Eschatologie", "Histoire & Mystère"], year: 2026, isNew: true, isTrending: true },
  "Do_s-1BLe24": { cats: ["Eschatologie", "Histoire & Mystère"], year: 2026, isNew: true },
  dWu6NUFfCvE: { cats: ["Histoire & Mystère"], year: 2026, isNew: true },
  WRzmmLgVnt4: { cats: ["Histoire & Mystère"], year: 2026, isNew: true },
  eDR8LIihOZA: { cats: ["Histoire & Mystère"], year: 2026, isNew: true, isTrending: true },
  "CW1Prjn-3cs": { cats: ["Histoire & Mystère"], year: 2026, isNew: true },
  n4st3dqnY9M: { cats: ["Histoire & Mystère"], year: 2026, isNew: true, isTrending: true },
  XkMbsl9j4nE: { cats: ["Histoire & Mystère"], year: 2026, isNew: true },
  IoGqok1BLX0: { cats: ["Histoire & Mystère", "Prophètes"], year: 2026, isNew: true },
};

const minuteIslamMeta: MetaRecord = {
  NDxEgz2oIqE: { cats: ["Miracles du Coran", "Histoire & Mystère"], year: 2025, isNew: true, isTrending: true },
  uMUhKIlTf6E: { cats: ["Eschatologie"], year: 2025, isNew: true, isTrending: true },
  IQgrEqyaUag: { cats: ["Histoire & Mystère", "Miracles du Coran"], year: 2025, isNew: true },
  BxgVOKxyh2w: { cats: ["Miracles du Coran", "Histoire & Mystère"], year: 2025, isNew: true },
  Evr8LYo8Dt0: { cats: ["Eschatologie", "Histoire & Mystère"], year: 2025, isNew: true },
  ljWrUUQ3DdI: { cats: ["Miracles du Coran", "Histoire & Mystère"], year: 2025, isNew: true },
  "-Kgkfuzuhwc": { cats: ["Histoire & Mystère", "Prophètes"], year: 2025, isNew: true },
  eGVYv7oZMm8: { cats: ["Miracles du Coran", "Coran"], year: 2025, isNew: true, isTrending: true },
  LfTkK6ktk5w: { cats: ["Histoire & Mystère"], year: 2025, isNew: true },
  DefDLFdk7QQ: { cats: ["Histoire & Mystère", "Miracles du Coran"], year: 2025, isNew: true, isTrending: true },
  nkvx27zE6Mo: { cats: ["Histoire & Mystère"], year: 2025, isNew: true, isTrending: true },
  guwErCKlbO4: { cats: ["Histoire & Mystère", "Héros & Personnages"], year: 2025, isNew: true },
  YOu1on5c3kw: { cats: ["Eschatologie", "Histoire & Mystère"], year: 2025, isNew: true, isTrending: true },
  CRPlrOuJxT0: { cats: ["Histoire & Mystère"], year: 2025, isNew: true },
  YuIDtvYwtz0: { cats: ["Histoire & Mystère", "Anges & Djinns"], year: 2025, isNew: true },
  "jJAA60-14u0": { cats: ["Eschatologie", "Histoire & Mystère"], year: 2025, isNew: true },
  INr0y5Np4Y8: { cats: ["Eschatologie"], year: 2025, isNew: true, isTrending: true },
  rgtxZuJmwMc: { cats: ["Eschatologie"], year: 2025, isNew: true, isTrending: true },
  "6Z-umY6WInU": { cats: ["Eschatologie", "Histoire & Mystère"], year: 2025, isNew: true },
  UeRjMfySejA: { cats: ["Histoire & Mystère", "Miracles du Coran"], year: 2025, isNew: true },
  WZnTMTwxVN0: {
    cats: ["Anges & Djinns", "Histoire & Mystère"],
    year: 2025,
    isNew: true,
    isTrending: true,
    skipSegments: [
      { start: 82, end: 151, label: "Présentation du Qarin", type: "intro" },
      { start: 151, end: 316, label: "Les murmures et influences" },
      { start: 316, end: 645, label: "Les invocations protectrices" },
      { start: 645, end: 720, label: "Conclusion spirituelle" },
    ],
  },
  "16NoYOXm8CA": { cats: ["Miracles du Coran", "Histoire & Mystère"], year: 2025, isNew: true },
  hF_VXUaKjGk: { cats: ["Histoire & Mystère"], year: 2025, isNew: true },
  X19CsM5BH6A: { cats: ["Eschatologie"], year: 2025, isNew: true, isTrending: true },
  "_6m-BRNc34Y": { cats: ["Histoire & Mystère"], year: 2025, isNew: true },
  "5l2-NAG0w7c": { cats: ["Histoire & Mystère", "Héros & Personnages"], year: 2025, isNew: true },
  ZwY6Gx4KD1s: { cats: ["Histoire & Mystère"], year: 2025, isNew: true },
  "K4-DNtDbAfQ": { cats: ["Histoire & Mystère", "Eschatologie"], year: 2025, isNew: true, isTrending: true },
  W7C4KfbEt2M: { cats: ["Histoire & Mystère"], year: 2025, isNew: true },
  "Zyy_5-d-Y9c": { cats: ["Eschatologie", "Histoire & Mystère"], year: 2025, isNew: true },
  n3YzO8nGUUs: { cats: ["Histoire & Mystère"], year: 2025, isNew: true },
  SPICJxNcXQo: { cats: ["Histoire & Mystère"], year: 2025, isNew: true, isTrending: true },
  uJpsa3dUxdg: { cats: ["Eschatologie"], year: 2025, isNew: true, isTrending: true },
  AU9a8VYpwZI: { cats: ["Coran", "Histoire & Mystère"], year: 2025, isNew: true },
  p1h8Uv2i2l4: { cats: ["Histoire & Mystère"], year: 2025, isNew: true },
  CgmRciPEgV0: { cats: ["Histoire & Mystère", "Héros & Personnages"], year: 2025, isNew: true, isTrending: true },
};

const communityMeta: MetaRecord = {
  pn5Kk1JY93g: { cats: ["Coran", "Prophètes", "Histoire & Mystère"], year: 2025, isNew: true, isTrending: true },
  toSgPWX87W8: { cats: ["Coran", "Miracles du Coran"], year: 2025, isNew: true },
  DWeJaNN8Bhk: { cats: ["Anges & Djinns", "Histoire & Mystère"], year: 2025, isNew: true, isTrending: true },
  "IqKm0gRu-_Y": { cats: ["Histoire & Mystère"], year: 2026, isNew: true },
  ugt2m2UDs9A: { cats: ["Histoire & Mystère", "Héros & Personnages"], year: 2025, isNew: true },
  Y3ukppFaVBU: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  "0V3v_uPAOBw": { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  H9VKNw4cwKA: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  xKRD5Lmba0o: { cats: ["Héros & Personnages"], year: 2026, isNew: true },
  FCxUXtdN1pU: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  kBmWOcJKIko: { cats: ["Histoire & Mystère"], year: 2026, isNew: true },
  hcxV40rupDE: { cats: ["Héros & Personnages"], year: 2026, isNew: true },
  dwK5F_PXV_I: { cats: ["Héros & Personnages"], year: 2026, isNew: true },
  wQREAw7Jl5o: { cats: ["Histoire & Mystère"], year: 2026, isNew: true },
  QAKB5JPjU6I: { cats: ["Héros & Personnages"], year: 2026, isNew: true },
  xKXPtDz6eyM: { cats: ["Héros & Personnages"], year: 2026, isNew: true },
  OaX_qWLNPWs: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  I7hVt0VVKJE: { cats: ["Histoire & Mystère"], year: 2025, isNew: true },
  qzDosOe0mgo: { cats: ["Histoire & Mystère"], year: 2025, isNew: true },
  "7gh9PPAZI0c": { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  hAvbpCBDgDM: { cats: ["Histoire & Mystère"], year: 2025, isNew: true },
  xFenpNBdxj0: { cats: ["Héros & Personnages"], year: 2025, isNew: true },
  "2j0T2Ty36Go": { cats: ["Histoire & Mystère"], year: 2025, isNew: true },
};

const narroDinRaw: [string, string, string][] = [
  ["GBxsINL9kWw", "J'ai voyagé à travers l'histoire du Prophète Adam علیه‌السلام", "Dans ce premier épisode immersif de « J'ai voyagé à travers l'histoire des Prophètes », plongez aux origines de la création pour revivre l'histoire du Prophète Adam en totale immersion."],
  ["rgYrqJzdCSU", "J'ai voyagé à travers l'histoire du Prophète Adam (Bande-Annonce)", "Bande-annonce officielle du grand récit sur le Prophète Adam : une reconstitution narrative et visuelle inédite."],
  ["JrpGTkMg0_Q", "J'ai voyagé à travers l'Histoire des Prophètes (Bande-Annonce)", "Du Paradis au déluge de Nouh, du feu d'Ibrahim à la mer fendue de Moussa : la bande-annonce de la série immersive."],
  ["TZBy2GxSuTM", "Ce verset du Coran sur l'atome défie tous les scientifiques", "L'atome cache-t-il la plus grande preuve de l'existence de Dieu ? Vide à 99,99%, quarks et particules subatomiques : quand la physique confirme le texte coranique."],
  ["thjHAg96G6U", "Achoura : Le jour où Allah a sauvé Moussa عليه السلام", "L'histoire grandiose du jour d'Achoura : la fuite d'Égypte, l'ouverture miraculeuse de la mer Rouge et la délivrance des croyants."],
  ["3yhT43ksbNM", "Summayah : La première martyre de l'Islam", "Le sacrifice héroïque de Summayah bint Khayyat face à la tyrannie des Quraysh à La Mecque. Une leçon éternelle de bravoure et de fidélité."],
  ["xMD45907G1U", "Le Roi Négus et les Musulmans exilés", "L'émouvant exil en Abyssinie et la récitation de la sourate Maryam devant le Négus chrétien, qui pleura en découvrant les paroles d'Allah."],
  ["NaQkMZrViT0", "La destruction de la Kaaba (Signes de la Fin des Temps)", "Les prophéties eschatologiques authentiques sur le sort de la Kaaba à l'approche de l'Heure."],
  ["6SiRX2iN0rI", "Le miracle de l'Abeille : Les secrets révélés du Coran", "Seul insecte doté d'une sourate entière à son nom, l'abeille recèle des miracles biologiques, mathématiques et curatifs saisissants."],
  ["z3J9QrwSwec", "L'ADN : Le code source de Dieu (Ce que les scientifiques avouent)", "L'ADN est-il le fruit d'un hasard ou d'une programmation sublime ? Découvrez les ponts fascinants entre génétique moderne et le Coran."],
  ["MeedZt1oVhA", "Pourquoi Allah a créé l'Univers ? (La vérité touchante)", "Quel est le but ultime de la création de l'Univers et de notre venue sur Terre ? Une réflexion profonde entre science, logique et spiritualité."],
  ["DfXoCLzweMA", "Le Big Bang dans le Coran ? La preuve qui change tout", "L'expansion continue du cosmos, le Big Bang et la fumée primordiale : comment le Coran a-t-il décrit ces réalités astrophysiques 14 siècles plus tôt ?"],
  ["zm3pq24HhVM", "Que faisait ALLAH avant la création ? (La réponse d'Einstein et du Coran)", "Où était Allah avant le début du temps ? Une exploration vertigineuse réconciliant théorie de la relativité et enseignements islamiques."],
  ["wNqNWexMLBI", "UN HOMME PIEUX accusé à tort de FORNICATION (L'histoire de Jurayj)", "L'histoire poignante de Jurayj l'ermite, accusé du pire des péchés jusqu'au miracle où un nouveau-né proclama sa pureté."],
  ["Vz2CoMfNv_U", "3 HOMMES ÉPROUVÉS par Allah et UN SEUL a réussi", "Le lépreux, le chauve et l'aveugle : l'histoire authentique des trois hommes éprouvés par un ange pour tester leur gratitude."],
  ["xh8YgT0eX10", "Le Prophète ﷺ a raconté cette histoire… et elle change la vie", "Un récit prophétique bouleversant conté par le Messager d'Allah ﷺ, porteur d'une sagesse immense et d'une profonde transformation intérieure pour le croyant."],
];

const narroRaw: [string, string, string][] = [
  ["VZJLHaqxZw4", "L'HISTOIRE DU PROPHETE IBRAHIM (EP.1)", "La jeunesse d'Ibrahim : sa quête de vérité face à un peuple idolâtre, et son affrontement avec le roi Nimrod."],
  ["EK-lMsID6_U", "L'HISTOIRE DU PROPHETE IBRAHIM (EP.2)", "Le miracle du feu, l'exil, et la construction de la Kaaba. La foi inébranlable du père des prophètes."],
  ["_Hr6yBbTIM0", "L'HISTOIRE DU PROPHETE IBRAHIM (EP.3)", "Le sacrifice suprême et la construction de la Kaaba. L'épreuve ultime d'Ibrahim et sa soumission totale à Allah."],
  ["rPPlFnKVS2A", "La 1ère fin du monde: L'histoire du Prophète Nouh", "Le déluge, l'arche, et un peuple entier anéanti. L'histoire du prophète Nouh et de la première fin du monde."],
  ["sMxBVKavPO8", "Hud contre Les Géants : le Prophète face au peuple qui défiait Allah", "Le peuple de 'Ad, des géants arrogants qui défièrent Allah. Le prophète Hud face à la plus grande civilisation de son époque."],
  ["xohQqtH1v9k", "L'homme le plus patient de l'Histoire : le Prophète Ayoub", "L'histoire du prophète Ayoub (Job), l'homme qui perdit tout — sa famille, sa santé, sa richesse — mais ne cessa jamais de remercier Allah."],
  ["YxBKtvmQS-M", "L'HISTOIRE DU PROPHÈTE YUNUS", "Le prophète avalé par la baleine, les ténèbres de la mer, et le duo le plus puissant de l'histoire : la patience et le pardon."],
  ["VT14KYY0jWA", "L'HISTOIRE DU PROPHETE YUSUF", "Trahi par ses frères, vendu comme esclave, jeté en prison — puis élevé au plus haut rang. L'histoire extraordinaire de Yusuf (Joseph)."],
  ["MBa9gBXa-18", "La véritable histoire du Prophète Lut (Sodome & Gomorrhe)", "La destruction de Sodome et Gomorrhe : un peuple corrompu, un prophète averti, et une destruction divine sans précédent."],
  ["Xs26kdKEwlg", "Le Prophète Moussa VS le Géant de 3000 ans", "Le face-à-face entre le Prophète Moussa et un géant âgé de 3000 ans. L'un des récits les plus mystérieux de l'Islam."],
  ["utZ20jFavhU", "LES 4 ROIS qui ont possédé entièrement la TERRE", "Quatre rois ont régné sur l'intégralité de la Terre. Qui étaient-ils ? Comment ont-ils obtenu un tel pouvoir ?"],
  ["SWe239O2q6I", "Il était le plus grand adorateur de son époque… voilà comment Iblis l'a détruit", "L'histoire bouleversante de l'homme le plus pieux de son époque, et comment Iblis a réussi à le faire tomber."],
  ["5NRBBvu7Lcs", "Les 4 Prophètes les plus mystérieux du Coran", "Certains prophètes mentionnés dans le Coran restent entourés de mystère. Découvrez les histoires de quatre d'entre eux."],
  ["FJH_e5pwMzk", "Al Khidr: Pourquoi ce Prophète a tué un enfant ?", "Al Khidr, ce mystérieux prophète qui voyagea avec Moussa et commit des actes apparemment incompréhensibles."],
  ["X7b8kSW3PB0", "FIN DU MONDE: Ces SIGNES MINEURS que tout le monde ignore", "Les signes mineurs de l'Heure que nous ignorons pourtant tous. Une exploration détaillée des prophéties."],
  ["vDI4EzrKEQ8", "Nouveau signe de la fin du monde en Arabie !", "Des nouveaux signes de la fin du monde sont apparus en péninsule arabique. Que disent les textes ?"],
  ["UE0Ult3AtrU", "L'Histoire incroyable de HAMZA (Le Lion d'Allah)", "Hamza ibn Abdul Muttalib, l'oncle du Prophète ﷺ, surnommé le Lion d'Allah. Un homme de courage et de conviction."],
  ["NN1CwPcgcCU", "Comment Othman Ibn Affan est devenu milliardaire en Dollar ?", "L'histoire d'Othman Ibn Affan, l'un des plus riches compagnons, qui utilisa sa fortune au service de l'Islam."],
  ["FJguj-Pi59w", "Pourquoi ce mort de 23 ans ne pouvait pas entrer à la mosquée ?", "Une histoire troublante sur un jeune homme décédé et ce qui s'est passé lors de son enterrement."],
  ["WKGSN68aBkI", "Imam Malik: Il a défié le pouvoir au nom de la vérité", "L'Imam Malik, l'un des plus grands savants de l'Islam, qui affronta le calife pour défendre la vérité."],
  ["n-zTOILPVp4", "Djinns, Dajjal, Rothschild : ce que cache VRAIMENT l'Antarctique", "L'Antarctique, ses mystères, et les connexions étranges entre Djinns, Dajjal et les puissances mondiales."],
  ["CuxJEvI3eto", "Aïcha Kandicha : La djinn la plus dangereuse du Maghreb ? (enquête)", "Une enquête fascinante sur Aïcha Kandicha, la créature surnaturelle la plus redoutée du Maghreb."],
  ["ShAjaaV2YjM", "BALENCIAGA et le culte satanique de BAAL ?", "Les liens troublants entre les marques de luxe, le culte de Baal et les pratiques occultes antiques."],
  ["1zks1SMNvIY", "Ce livre de magie a ruiné un milliardaire de la Silicon Valley", "L'histoire d'un milliardaire de la Silicon Valley détruit par un livre de magie ancienne."],
  ["4KNarj80mnY", "Ils ont vu le Dajjal !", "Des hommes ont rencontré le Dajjal. Que leur a-t-il dit ? Que leur a-t-il montré ? Un récit saisissant."],
  ["77a2ywhTNhY", "Qui a enchainé le Dajjal sur une île ?", "Le Dajjal est enchaîné sur une île mystérieuse, attendant l'Heure. Qui l'y a attaché et pourquoi ?"],
  ["CG1BG1U5jXU", "7 Milliards contre Gog et Magog : Le récit de la fin", "Gog et Magog, les peuples qui dévasteront la Terre à la fin des temps. Le récit terrifiant de leur libération."],
  ["CzfGmFN6iao", "Dhul Qarnayn: Le roi qui a conquis toute la Terre", "Dhul Qarnayn, ce roi mystérieux mentionné dans le Coran, qui voyagea d'un bout à l'autre de la Terre."],
  ["MQZnYFWTgJs", "Un explorateur musulman découvre la Barriere de Gog & Magog ?", "La quête pour retrouver la barrière construite par Dhul Qarnayn pour emprisonner Gog et Magog."],
  ["h3SbP3FDd28", "Ils dorment 300 ans et se réveillent.", "L'histoire des Gens de la Caverne : sept jeunes hommes qui dormirent 300 ans et se réveillèrent dans un autre monde."],
  ["i0okdKbT788", "Les gens du Rass: Ce peuple méconnu qui a fondu comme du fer", "L'histoire méconnue du peuple du Rass, mentionné dans le Coran, et leur destruction fulgurante."],
  ["UnmxHm8y5a4", "Les 3 hommes les plus mystérieux du Coran", "Trois hommes mentionnés dans le Coran dont l'identité reste un mystère. Qui sont-ils réellement ?"],
  ["Nv-bAdXllkk", "Qui a vendu la Palestine à un pays qui n'existe pas ?", "Une plongée dans l'histoire de la Palestine et les manipulations géopolitiques qui ont conduit à sa situation actuelle."],
  ["ZxhTqFuSAzg", "La Momie Maudite qui a Coulé le Titanic (Histoire VRAIE)", "L'histoire vraie de la momie maudite qui aurait causé le naufrage du Titanic. Récit ou réalité ?"],
  ["4WQnXfkWygs", "Pourquoi ce jeune homme SOURIAIT encore après sa mort ? (histoire vraie)", "Une histoire vraie et bouleversante : un jeune homme retrouvé souriant après son décès."],
  ["VCkkV5RSQMQ", "Ils ouvrent une tombe de 11 ans et découvrent l'impossible...", "Une découverte stupéfiante dans une tombe de 11 ans. Ce qu'ils y ont trouvé dépasse l'entendement."],
  ["EZh-MCNkicc", "L'HORRIBLE histoire de JEFFREY EPSTEIN", "L'histoire sombre de Jeffrey Epstein et les réseaux de pouvoir qu'il révèle. Une enquête fascinante."],
  ["lZ7B_dZfvPA", "Brûlés pour leur Foi : La Véritable Tragédie des Gens du Fossé", "L'histoire des Gens du Fossé : des croyants brûlés vifs pour leur foi. L'un des récits les plus poignants du Coran."],
  ["xDdF3LCbaGI", "1H après TA MORT", "Que se passe-t-il une heure après votre mort ? Un récit saisissant sur le passage de l'âme."],
  ["t5iOxpukiPk", "Le livre de sorcellerie le plus dangereux au monde", "Une enquête stupéfiante sur le livre de sorcellerie le plus redouté de l'histoire, ses origines et ses avertissements."],
  ["r7xjc_c0kyI", "L'histoire dérangeante du satanisme moderne", "L'histoire troublante et occulte du satanisme moderne et les manipulations invisibles qui façonnent notre époque."],
  ["4W8uaeXSQyc", "La face cachée du Nouvel An (Saint Sylvestre)", "Les origines païennes et occultes méconnues des célébrations du Nouvel An et de la Saint-Sylvestre."],
  ["z6gp6VkXvek", "La face cachée du Père Noël", "Décryptage des racines réelles du mythe de Noël entre traditions antiques, paganisme et dérives commerciales."],
  ["Di3yiK6E77Q", "Le côté sombre caché de LABUBU", "Une analyse percutante sur la figurine phénomène LABUBU et ses symbolismes cachés."],
  ["7MTukb8H1vc", "L’enfant mystérieux qui prétend être le Dajjal", "Le récit troublant de l'enfant qui prétendait être le faux messie et les investigations menées par les Compagnons."],
  ["Sp1zalDQXMo", "Cette guerrière musulmane a brisé seule l’armée Romaine", "L'incroyable épopée de Khawlah bint al-Azwar, la cavalière masquée qui mit en déroute les légions byzantines."],
  ["O8kPaIVY-mM", "Abdel Basset: Le maître des récitateurs", "L'hommage à la voix d'or d'Égypte, Cheikh Abdel Basset Abdel Samad, dont la récitation a ému des générations."],
  ["NXEnXySiBIQ", "Mahmoud Khalil Al-Hussary : la voix qui a fait trembler le monde", "Le parcours du maître du Tajwid parfait, Cheikh Al-Hussary, premier à enregistrer le Coran psalmodié complet."],
  ["Egf2qRzhz9A", "Maher Al Muaiqly : de prof de maths… à Imam de la Mecque", "Le destin extraordinaire de Cheikh Maher Al Muaiqly, passé des bancs de l'enseignement au minbar sacré du Haram."],
  ["VUtFKzjd2cI", "Sudais : Ce que sa mère lui a dit… est devenu réalité", "L'invocation prophétique d'une mère pour son fils qui est devenu le doyen des imams de la Grande Mosquée de La Mecque."],
  ["aDGgpwEUXk0", "Saud Shuraim : L’homme qu’ils ont voulu faire taire ?", "Le parcours intègre et courageux de l'ancien imam de la Kaaba, Cheikh Saud Ash-Shuraim."],
  ["PVWqIyow9z0", "La véritable histoire de Yasser Dossari", "L'ascension vocale et spirituelle de Cheikh Yasser Al-Dossari jusqu'à la direction des prières à Masjid Al-Haram."],
  ["G1thorI5y_8", "Mohamed Ayoub : la voix oubliée de Médine", "L'histoire émouvante de Cheikh Mohamed Ayoub, l'imam légendaire de la Mosquée du Prophète ﷺ à Médine."],
  ["wuXB_PGaJjY", "Ce miracle du Prophète Issa va vous glacer le sang…", "Les miracles stupéfiants accordés au Prophète 'Issa ('alayhi salam) par la volonté d'Allah."],
  ["6eEovH89rxw", "Othman Ibn Affan : le calife qui a été assassiné en récitant le Coran", "Le martyre tragique du troisième calife bien guidé, Dhul-Nûrayn, mort le Coran entre les mains."],
  ["L4CQr7P6URI", "Ce que vous ignorez sur Ali Jaber (et pourquoi il a marqué le monde)", "La vie poignante de Cheikh Ali Jaber, la voix cristalline des années 80 à La Mecque."],
  ["cjm6z_Fx174", "Un explorateur découvre la cité perdu du prophète Souleymane ?", "Sur les traces de la légendaire capitale du Prophète Soulayman et des bâtisseurs invisibles."],
  ["esxkBnouDLU", "Sorciers, démons, sacrifices : aux origines de la sorcellerie", "D'où vient la sorcellerie ? Une rétrospective historique depuis Babylone et Harout et Marout."],
  ["_Tni4gMfWFA", "Comment l’Algérie est devenue musulmane ? L’histoire complète", "L'épopée de l'Islam au Maghreb et en Algérie à travers les figures héroïques de 'Oqba et Tariq ibn Ziyad."],
  ["jkY0e0FK0-M", "Omar Ibn Al Khattab : l’homme qui a fait trembler les empires", "Le califat d'Al-Farouq 'Umar ibn al-Khattâb, symbole de justice absolue qui terrassa les empires perse et romain."],
  ["2wHPGTfmW4s", "Un espion Britannique découvre la cité des Géants ?", "L'expédition clandestine d'un explorateur à la recherche des vestiges des peuples anciens géants."],
  ["cX-rgOf_RKI", "Et si le Sphinx était… le Prophète Idriss (Enoch) ?", "Hypothèses et recherches historiques sur le Prophète Idriss ('alayhi salam), premier homme à avoir écrit avec la plume."],
  ["ZmrFoGS4NpY", "Ils ont tenté d’ouvrir la tombe du Prophète… à Médine !", "La tentative secrète de pillage de la tombe prophétique déjouée miraculeusement sous le règne de Nur ad-Din Zengi."],
  ["g2I53FcIv-k", "Abu Bakr : L’homme qui a tout donné pour le Prophète ﷺ", "Le premier calife de l'Islam, As-Siddiq, qui sacrifia toute sa fortune et sa vie pour soutenir la cause d'Allah."],
  ["puYY5tfN0CU", "L'hymne Algérien écrit avec le sang (5 Juillet 1962)", "L'histoire poignante de Kassaman, écrit par Moufdi Zakaria sur les murs de la prison de Barberousse avec son sang."],
  ["SdDuBzUTFT0", "Je meurs mais l'Algérie Vivra - Ahmed Zabana", "Les dernières paroles héroïques d'Ahmed Zabana face à la guillotine pour la liberté de sa patrie."],
  ["kejGlN7VskA", "IL ONT VU DAJJAL !", "Le témoignage authentique de Tamim Ad-Dari rapporté dans Sahih Muslim sur sa rencontre avec l'imposteur."],
  ["kRLDZvJkOrE", "Les 10 Anges d'Allah", "Découvrez les dix anges majeurs et leurs missions divines confiées par le Créateur."],
  ["Ec6yK7RHhD8", "8 PORTES DU PARADIS", "Quelles sont les huit portes du Paradis et par quelle porte entrerez-vous ? Un rappel inspirant."],
  ["51MgS858wpk", "9 plus jeunes Héros de l'Islam", "Ces jeunes compagnons qui ont accompli des prouesses extraordinaires avant l'âge de 20 ans."],
  ["iY94z7g3Jcc", "les 3 premiers à entré en Enfer", "Le hadith saisissant sur les trois premières personnes jugées au Jour Dernier par manque de sincérité."],
  ["eFBzKtGtNUY", "7 portes de l'Enfer !", "La description coranique des sept degrés et portes de l'Enfer et les avertissements divins."],
];

const yacineRaw: [string, string, string][] = [
  ["fuX7BViVyno", "L'HISTOIRE DU prophète NOUH (La première fin du monde)", "L'histoire complète du prophète Nouh : l'arche, le déluge, et la destruction d'un peuple entier qui refusa de croire."],
  ["gl0GKDB3Nvo", "Pourquoi on est sur terre ? - Adam Vs Moussa -", "Une conversation fascinante entre les prophètes Adam et Moussa sur le sens de notre existence sur Terre."],
  ["DE6eRTl43DI", "L'HISTOIRE DU PROPHÈTE IBRAHIM : Le Père des Prophètes", "L'histoire complète du prophète Ibrahim, le père des prophètes, et son combat pour le monothéisme."],
  ["XKl4Y36qREs", "L'histoire de Jésus le messie de L'ISLAM", "L'histoire de Jésus (Îsâ) dans la perspective islamique : sa naissance miraculeuse, ses miracles, et son retour."],
  ["Kx6yF2PtsHg", "FACE à des géants...il libère la PALESTINE (Prophète Yoshu Ibn Noun)", "Le prophète Yoshu ibn Noun face à des géants pour libérer la Terre Sainte. Un récit épique de courage et de foi."],
  ["pjyGmUKhx14", "DES GÉANTS ANÉANTIS PAR ALLAH ? (PROPHÈTE HUD & SALEH)", "Les prophètes Hud et Saleh face à des peuples de géants arrogants. La destruction divine de 'Ad et Thamud."],
  ["EGJndSj_-SI", "Y avait-il Des prophètes DJINNS ?", "Existe-t-il des prophètes parmi les Djinns ? Une exploration fascinante d'une question méconnue."],
  ["m8PSuC3HmpA", "Y avait-il Des prophètes NOIRS ?", "L'histoire des prophètes originaires d'Afrique. Une réflexion sur la diversité des prophètes mentionnés dans le Coran."],
  ["juNul3I0z94", "L'histoire du prophète Mohamed ﷺ - En 8 minutes", "La vie du Prophète Mohammed ﷺ résumée en 8 minutes : de sa naissance à son héritage spirituel."],
  ["-zn3YHu_-ME", "La noyade du fils de Noé (Nouh)", "L'histoire déchirante du fils de Nouh qui refusa de monter dans l'arche et périt dans le déluge."],
  ["njgXO6BrLsA", "Crucifié… son histoire fait trembler le prophète ﷺ", "L'histoire d'un compagnon crucifié pour son amour du Prophète ﷺ. Un récit poignant sur la foi et le sacrifice."],
  ["bppu48Ew4QA", "Un ANGE est venu à son secours !!! - L'histoire du compagnon et des anges", "L'histoire d'un compagnon sauvé par l'intervention d'un ange. Quand le monde invisible vient au secours des croyants."],
  ["UjGV8zqtdl0", "Il brûle le CORAN… Un héros de l'Islam", "L'histoire d'un homme qui défia la persécution pour protéger le Coran. Un héros méconnu de l'Islam."],
  ["rSDp4XAo7qk", "Cette FEMME a CHANGÉ la Mecque À tout jamais … Khadija bint Khuwaylid", "Khadija, la première épouse du Prophète ﷺ, la première à croire en lui, et la femme qui changea la Mecque."],
  ["8uqZxbv3-CM", "Découvrez l'histoire de Khadija !", "L'histoire de Khadija bint Khuwaylid : sa foi, sa générosité, et son rôle fondamental dans les premières années de l'Islam."],
  ["JcHMx17vdRE", "La guerre entre les anges et les djinns", "La guerre légendaire entre les anges et les djinns. Un récit épique sur les forces invisibles qui peuplent notre monde."],
  ["iwM8rTPueGI", "Le Djinn qui volait le trésor des Musulmans", "L'histoire d'un djinn qui volait le trésor des musulmans. Quand le monde invisible s'immisce dans les affaires humaines."],
  ["p3gneZAtQOs", "Le plus Puissant DJINN face au prophète Souleyman", "Le prophète Souleyman face au plus puissant des Djinns. La soumission du monde invisible au plus grand roi de l'Islam."],
  ["qLGc1bPyHiw", "La création des djinns, leur réalité ?", "D'où viennent les Djinns ? Comment ont-ils été créés ? Une exploration de leur réalité selon les textes islamiques."],
  ["xoK96rMnQuU", "L'affrontement ANGES vs DJINNS, l'accession du DIABLE", "L'affrontement originel entre les anges et les djinns, et la chute d'Iblis. Le récit de la première rébellion."],
  ["ZHPQEk7N6jY", "Quand les Djinns sont venus voir le prophète ﷺ", "Le récit extraordinaire de la rencontre entre les Djinns et le Prophète ﷺ. Quand le monde invisible vient écouter la Révélation."],
  ["6SgZdJUHchk", "Qui sont l'élite des Anges ?", "Découvrez l'élite des anges : Djibril, Mikael, Israfil, et les plus puissants serviteurs d'Allah."],
  ["KePZWT2nCec", "L'ANGE ISRAFIL a pleuré de PEUR", "L'ange Israfil, celui qui soufflera dans la trompette, a pleuré de peur devant la majesté d'Allah."],
  ["b1b1-uRfJGk", "L'ange de la MORT était choqué ....", "L'ange de la mort (Azraël) face à une situation qui l'a choqué. Un récit sur le mystère de la mort."],
  ["_T-ka-OFs60", "L'ange qui n'a pas SOURIT au PROPHETE ﷺ", "L'histoire d'un ange qui ne sourit jamais et sa rencontre avec le Prophète ﷺ. Un récit sur la gravité et la révérence."],
  ["pgo08KSRQU4", "Le SEUL homme à avoir vu le DAJJAL - Tamim el Dari", "Tamim el Dari, le seul compagnon à avoir rencontré le Dajjal de son vivant. Un récit authentique saisissant."],
  ["XSt2PV7MYQI", "Que se passe-t-il après TA mort ?", "Une exploration de ce qui nous attend après la mort, selon les textes islamiques. Un récit qui invite à la réflexion."],
  ["w71TTKHSX98", "La PREMIÈRE nuit dans TA tombe...", "La première nuit dans la tombe : un récit saisissant sur ce que vit l'âme après son départ de ce monde."],
  ["PiJuYXJyRsM", "Cette vache causera la destruction d'Al-Aqsa ? (La prophétie de la vache rouge)", "La prophétie de la vache rouge et son lien avec la destruction d'Al-Aqsa. Un signe des temps messianiques."],
  ["ESs8FC08MVI", "Pourquoi la Prophétie du Messie HANTE Netanyahu ??", "Les liens troublants entre la prophétie du Messie, le Machiah, et les ambitions politiques contemporaines."],
  ["JFhFnBWxD-s", "2023 PRÉDIT par Le prophète ﷺ (c'est incroyable)", "Des événements contemporains prédits par le Prophète ﷺ il y a 1400 ans. Les signes de notre époque."],
  ["rMgQVmmpyeI", "ON ASSISTE à la réalisation de la PROPHETIE !", "Les prophéties se réalisent sous nos yeux. Un rappel puissant que nous vivons des temps exceptionnels."],
  ["880zNwqJho4", "The Arrival Of Imam Al-Mahdi", "L'arrivée de l'Imam Al-Mahdi : qui est-il ? Quand viendra-t-il ? Que disent les textes sur ce guide de la fin des temps ?"],
  ["JCtF62S2TDI", "Le CORAN révèle un SECRET d'Égypte", "Un secret archéologique d'Égypte révélé par le Coran. Quand les miracles scientifiques rejoignent l'histoire."],
  ["Pn778jWiP-U", "UN MIRACLE scientifique Révélé par le CORAN - Le Mystère du fer", "Le mystère du fer dans le Coran : un miracle scientifique qui défie les explications humaines."],
  ["U4Cdzsu0uaA", "Le SECRET de cette CITÉ est révélé (VILLE DU PROPHÈTE Ibrahim)", "Les découvertes archéologiques qui confirment les récits coraniques sur la cité du prophète Ibrahim."],
  ["Sj4JboSZ-qQ", "Des anges entendus par la NASA !?", "Des sons mystérieux de l'espace captés par la NASA : les anges sont-ils responsables ? Un récit fascinant."],
  ["LItRZaIf3yY", "LA bataille de BADR : Quand les anges ont écrit l'histoire", "La bataille de Badr : 313 musulmans face à 1000 ennemis, et les anges qui combattirent à leurs côtés."],
  ["spF8Fwo0wIk", "IL A DÉTRUIT LA FAUSSE KAABA DU YÉMEN ...Des diables la protégeaient", "L'histoire d'un roi qui détruisit la fausse Kaaba du Yémen protégée par des diables. Quand la foi triomphe des ténèbres."],
  ["u4k1mgLtdVE", "ASSASSINER le Prophète ﷺ A MEKKAH (La réunion secrète du Diable)", "Le complot des Quraysh pour assassiner le Prophète ﷺ et la réunion secrète du Diable à La Mecque."],
  ["P0fLsMrOAA0", "Est-ce qu'Allah t'aime ?", "Comment savoir si Allah nous aime ? Les signes de l'amour divin dans nos vies, selon les enseignements prophétiques."],
  ["pIuOqdEy2xs", "ALLAH a conclu un PACTE avec TOI (tu ne t'en souviens plus)", "Le pacte originel entre Allah et chaque âme humaine avant la création. Un rappel profond de notre engagement éternel."],
  ["VDsqYf0Obvg", "Un récit sur la foi et l'épreuve", "Une histoire puissante sur la foi face à l'épreuve, et la manière dont Allah éprouve ceux qu'Il aime."],
  ["wxBzydEYsdU", "La PIRE catastrophe de l'Histoire islamique", "La pire catastrophe de l'histoire islamique : un récit bouleversant qui marqua la communauté musulmane pour toujours."],
  ["_HV3aU0cx-g", "Cette histoire est une véritable leçon sur le pardon et la miséricorde", "Une histoire touchante sur le pardon, la miséricorde, et la grandeur d'âme dans la tradition islamique."],
];

const haramainMeta: Record<string, { cats: Category[]; year: number; featured?: boolean; isNew?: boolean; isTrending?: boolean; audioUrl?: string }> = {
  // Sheikh Ali Jaber (رحمه الله)
  "y7zkqaSgZME": { cats: ["Coran"], year: 1987, featured: true, isTrending: true },
  "swc_xCSX6Uk": { cats: ["Coran"], year: 1987, isTrending: true },
  "1hLkxJGYR8w": { cats: ["Coran"], year: 1987, isTrending: true },
  "22Ht4PCHcFU": { cats: ["Coran"], year: 1987 },
  "kCUGd2jM5O4": { cats: ["Coran"], year: 1987 },
  "UaMPoBQr7uA": { cats: ["Coran"], year: 1987 },

  // Sheikh Abdul Rahman Al-Sudais (حفظه الله)
  "ogIVF0l80Pw": { cats: ["Coran"], year: 1989, isTrending: true },
  "1f5rkERtQW4": { cats: ["Coran"], year: 1995, isTrending: true },
  "juVunrc7jZQ": { cats: ["Coran"], year: 1989 },
  "ej1u1bP0hL4": { cats: ["Coran"], year: 1989 },
  "NUjBYXYfvlc": { cats: ["Coran"], year: 1989 },
  "7x7mmuXUWKk": { cats: ["Coran"], year: 1989 },

  // Sheikh Saud Al-Shuraim (حفظه الله)
  "XCtt9qhhBlU": { cats: ["Coran"], year: 1995, isTrending: true },
  "ouvXxJf3SAs": { cats: ["Coran"], year: 1998 },
  "rL3dTkOvbyg": { cats: ["Coran"], year: 1995, isTrending: true },
  "R7Af9hGsaVU": { cats: ["Coran"], year: 1993 },

  // Sheikh Muhammad Ayyub (رحمه الله) - Madinah
  "cjGjZ7ZMWFQ": { cats: ["Coran"], year: 1990, isTrending: true },
  "PzrMXukUn8U": { cats: ["Coran"], year: 1992 },
  "X_6Vl4v-Frs": { cats: ["Coran"], year: 1997 },
  "dZhg_gJxw2s": { cats: ["Coran"], year: 1993 },

  // Sheikh Ali Al-Hudhaify & Sheikh Abdullah Al-Khulaifi & Sheikh Abdullah Al-Juhany
  "FfVZANx8fbQ": { cats: ["Coran"], year: 1989 },
  "KO-kNgrIuis": { cats: ["Coran"], year: 1989, isTrending: true },
  "P7q0FCfMc6Y": { cats: ["Coran"], year: 1993 },
  "aArE7-LeUj8": { cats: ["Coran"], year: 2005 },
};

const haramainRaw: [string, string, string][] = [
  // Sheikh Ali Jaber
  [
    "y7zkqaSgZME",
    "Makkah Taraweeh 1987 (1407H) — Sheikh Ali Jaber | Sourates Al-Hajj & Al-Mu'minun",
    "Récitation légendaire et intemporelle de Sheikh Ali Jaber (رحمه الله) lors de la 17ème nuit de Ramadan 1407 à la Grande Mosquée de La Mecque (Masjid Al-Haram). Une émotion pure qui a marqué l'histoire des Haramain.",
  ],
  [
    "swc_xCSX6Uk",
    "Makkah Taraweeh 1987 (1407H) — Sheikh Ali Jaber | Sourate Al-Qasas",
    "Enregistrement historique au Mihrab du Saint Sanctuaire de La Mecque. La voix inoubliable et mélodieuse d'Ali Jaber dans l'histoire de Moussa (Sourate Al-Qasas).",
  ],
  [
    "1hLkxJGYR8w",
    "Makkah Taraweeh 1987 (1407H) — Sheikh Ali Jaber | Sourates Ya-Sin & As-Saffat",
    "Archive vidéo rare de 1987 à Masjid Al-Haram : récitation des sourates Ya-Sin et As-Saffat par Sheikh Ali Jaber lors de la 22ème nuit de Ramadan 1407.",
  ],
  [
    "22Ht4PCHcFU",
    "Makkah Taraweeh 1987 (1407H) — Sheikh Ali Jaber | Sourate Al-Isra",
    "Récitation empreinte de ferveur et de solennité de la Sourate Al-Isra lors des prières nocturnes de Ramadan à La Mecque.",
  ],
  [
    "kCUGd2jM5O4",
    "Makkah Taraweeh 1407H — Sheikh Ali Jaber | Joyau Coranique de La Mecque",
    "Un chef-d'œuvre de la récitation coranique mecquoise avec l'acoustique caractéristique du Haram des années 80.",
  ],
  [
    "UaMPoBQr7uA",
    "Khatm Al-Quran 1987 (1407H) — Sheikh Ali Jaber, Sheikh Sudais & Sheikh Khulaifi",
    "La grandiose nuit de clôture du Coran de Ramadan 1407H réunissant les 3 géants de l'imamat de La Mecque.",
  ],

  // Sheikh Abdul Rahman Al-Sudais
  [
    "ogIVF0l80Pw",
    "Makkah Taraweeh 1989 (1409H) — Sheikh Abdul Rahman Al-Sudais | Sourates Saba & Ya-Sin",
    "Les premières années emblématiques du Sheikh Sudais à la Kaaba lors de la 21ème nuit de Ramadan 1409. Une jeunesse vocale et une cadence rythmée inoubliable.",
  ],
  [
    "1f5rkERtQW4",
    "Makkah Taraweeh 1995 (1415H) — Sheikh Abdul Rahman Al-Sudais | Sourates Al-Kahf & Maryam",
    "Enregistrement culte des années 90 : Sheikh Sudais guidant les fidèles dans le Mataf historique lors de la 16ème nuit de Ramadan 1415.",
  ],
  [
    "juVunrc7jZQ",
    "Makkah Taraweeh 1989 (1409H) — Sheikh Abdul Rahman Al-Sudais | Sourates An-Nur & Al-Furqan",
    "Prière nocturne de Ramadan 1409 à La Mecque. La psalmodie vibrante et émouvante de Sheikh Sudais dans les versets de la lumière.",
  ],
  [
    "ej1u1bP0hL4",
    "Makkah Taraweeh 1989 (1409H) — Sheikh Abdul Rahman Al-Sudais | Sourates Ghafir & Fussilat",
    "Nuit du 23 Ramadan 1409H à la Grande Mosquée de La Mecque. Récitation fluide et profonde devant les pèlerins.",
  ],
  [
    "NUjBYXYfvlc",
    "Makkah Taraweeh 1989 (1409H) — Sheikh Abdul Rahman Al-Sudais | Sourates Al-Jumu'ah à At-Tahrim",
    "Récitation historique de la 27ème nuit de Ramadan 1409 à La Mecque par Sheikh Abdul Rahman Al-Sudais.",
  ],
  [
    "7x7mmuXUWKk",
    "Khatm Al-Quran & Doua 1989 (1409H) — Sheikh Sudais, Sheikh Humaid & Sheikh Khulaifi",
    "La clôture émouvante de Ramadan 1409 à La Mecque avec le grand Doua Al-Khatm par Sheikh Sudais.",
  ],

  // Sheikh Saud Al-Shuraim
  [
    "XCtt9qhhBlU",
    "Makkah Taraweeh 1995 (1415H) — Sheikh Saud Al-Shuraim | Sourates Al-Isra & Al-Kahf",
    "Archive vidéo rare des années 90 : Sheikh Saud Al-Shuraim au Mihrab du Mataf lors de la 16ème nuit de Ramadan 1415.",
  ],
  [
    "ouvXxJf3SAs",
    "Makkah Taraweeh 1998 (1419H) — Sheikh Saud Al-Shuraim | Sourate Maryam",
    "L'un des enregistrements les plus diffusés et appréciés du Sheikh Shuraim lors des nuits de Ramadan à Masjid Al-Haram.",
  ],
  [
    "rL3dTkOvbyg",
    "Makkah Taraweeh — Sheikh Saud Al-Shuraim | Première Nuit de Ramadan",
    "L'ouverture solennelle du mois sacré avec la récitation captivante et le ton inimitable de Sheikh Saud Al-Shuraim.",
  ],
  [
    "R7Af9hGsaVU",
    "Makkah Taraweeh — Sheikh Saud Al-Shuraim | 10ème Nuit au Saint Sanctuaire",
    "Récitation magistrale de Sheikh Shuraim dans l'enceinte sacrée de la Kaaba.",
  ],

  // Sheikh Muhammad Ayyub (Médine)
  [
    "cjGjZ7ZMWFQ",
    "Madinah Taraweeh 1990 (1410H) — Sheikh Muhammad Ayyub | Première Nuit Historique",
    "L'année de nomination du Sheikh Muhammad Ayyub (رحمه الله) comme Imam à la Mosquée du Prophète ﷺ à Médine. Sa psalmodie hijazie légendaire a bouleversé le monde.",
  ],
  [
    "PzrMXukUn8U",
    "Madinah Taraweeh 1992 (1412H) — Sheikh Muhammad Ayyub | Sourates du Juz Amma (1412H)",
    "Prière nocturne à Al-Masjid An-Nabawi (Médine) : le Sheikh Muhammad Ayyub sublime les sourates avec une maîtrise inégalée des maqamats.",
  ],
  [
    "X_6Vl4v-Frs",
    "Madinah Tahajjud 1997 (1417H) — Sheikh Muhammad Ayyub | Sourates At-Tawbah & Yunus",
    "Prière de Tahajjud lors de la 27ème nuit de Ramadan 1417H à Médine : une dévotion et une émotion intenses.",
  ],
  [
    "dZhg_gJxw2s",
    "Madinah Taraweeh 1993 (1413H) — Sheikh Muhammad Ayyub | Sourate Al-Mu'minun",
    "La récitation mythique de Sourate Al-Mu'minun par Sheikh Muhammad Ayyub à Médine, un chef-d'œuvre de la récitation coranique.",
  ],

  // Sheikh Ali Al-Hudhaify & Sheikh Abdullah Al-Khulaifi
  [
    "FfVZANx8fbQ",
    "Makkah Taraweeh 1989 (1409H) — Sheikh Ali Al-Hudhaify | Sourates Adh-Dhariyat & Al-Qamar",
    "L'Imam emblématique de Médine, Sheikh Ali Al-Hudhaify, guidant le Tarawih à la Sainte Mosquée de La Mecque en 1409H (26ème nuit).",
  ],
  [
    "KO-kNgrIuis",
    "Makkah Taraweeh 1989 (1409H) — Sheikh Ali Al-Hudhaify | Sourates Al-Mulk à Nuh",
    "Récitation calme et solennelle de Sheikh Ali Al-Hudhaify lors de la 28ème nuit de Ramadan 1409 à La Mecque.",
  ],
  [
    "P7q0FCfMc6Y",
    "Makkah Taraweeh 1993 (1413H) — Sheikh Abdullah Al-Khulaifi | Récitation Historique",
    "Le grand doyen Sheikh Abdullah Al-Khulaifi (رحمه الله), Imam de La Mecque pendant plus de 40 ans, guidant les fidèles à Masjid Al-Haram.",
  ],
  [
    "aArE7-LeUj8",
    "Makkah Taraweeh 2005 (1426H) — Sheikh Abdullah Al-Juhany | Sourates Al-Furqan & Ash-Shu'ara",
    "La récitation mélodieuse et douce de Sheikh Abdullah Al-Juhany lors de la 18ème nuit de Ramadan 1426H à La Mecque.",
  ],
];

const towardsEternityRaw: [string, string, string][] = [
  ["c01ys_5EKSI", "La Vie du Prophète Muhammad ﷺ — Ô Messager (Ép.1)", "La toute première série au monde retraçant la Sîra du Prophète ﷺ, visualisée par intelligence artificielle. Le début d'un voyage extraordinaire à travers sa vie."],
  ["vT-GmNItVJo", "Les Jours les Plus Durs de l'Islam — Ô Messager (Ép.2)", "Les premières années de la Révélation furent marquées par la persécution. Revivez les épreuves des tout premiers musulmans."],
  ["EeFh25K24x8", "Hamza et Omar Deviennent Musulmans — Ô Messager (Ép.3)", "Deux hommes redoutés se convertissent à l'Islam, changeant à jamais le destin de la communauté naissante à La Mecque."],
  ["LmLo4CO0LNw", "Le Miracle Qui Choqua Quraysh — Ô Messager (Ép.4)", "Un événement surnaturel bouleverse les Quraysh et confirme aux yeux de tous la véracité du message du Prophète ﷺ."],
  ["52C7ExmyPTw", "Le Prophète Muhammad ﷺ a Dû Quitter La Mecque — Ô Messager (Ép.5)", "Face à une persécution croissante, le Prophète ﷺ et ses compagnons entament l'Hégire vers Médine, un tournant décisif de l'Islam."],
  ["SFXsnEfVC1s", "Bataille de Badr – 2 Miracles d'Allah pour Son Messager — Ô Messager (Ép.6)", "Une armée en infériorité numérique triomphe grâce à l'aide divine. Le récit de la bataille de Badr et de ses miracles."],
  ["D9RaH5IoMCU", "Hamza (RA) est Tombé en Martyr — Bataille d'Uhud — Ô Messager (Ép.7)", "La bataille d'Uhud coûte la vie à Hamza, l'oncle du Prophète ﷺ et Lion d'Allah. Un moment de grand sacrifice pour l'Islam naissant."],
  ["yfF7IXb1q9Q", "La Forteresse de Khaybar est Tombée ! — Ô Messager (Ép.9)", "La prise de la forteresse de Khaybar marque une victoire décisive pour la communauté musulmane grandissante."],
  ["YwOFj8edxaU", "Le Dernier Sermon du Prophète ﷺ — Ô Messager (Ép.11)", "Les derniers mots du Prophète ﷺ à son peuple lors du Pèlerinage d'Adieu, un testament spirituel pour toute l'humanité."],
  ["TJL2ganDyBc", "L'Histoire de Khadijah (RA) en IA — Mères du Paradis (Ép.1)", "Première épouse du Prophète ﷺ et première croyante, Khadijah incarna la foi, le soutien et le sacrifice dès les premiers instants de l'Islam."],
  ["3C4U5WGmFs0", "\"Je préférerais que tu sois une pr*stituée plutôt qu'une musulmane\" — Juive convertie à l'Islam", "Le témoignage bouleversant d'une femme juive dont la conversion à l'Islam provoqua le rejet total de sa famille."],
  ["Yst8jgGviA8", "La Nouvelle Preuve Irréfutable de l'Existence de Dieu ! — La Fin de l'Agnosticisme", "Une argumentation qui bouscule l'agnosticisme moderne et propose une preuve renouvelée de l'existence de Dieu."],
  ["7NKz_Ixu4kc", "Le Miracle Du Déluge De Noé — L'Incroyable Histoire du Prophète Noé et Son Arche", "Plongez dans l'histoire fascinante du Prophète Noé (psl), du grand déluge et de la construction de son arche. Un récit captivant sur la foi et la persévérance."],
  ["nISqIWdpYQ8", "La Vie du Prophète Muhammad ﷺ en 21 Minutes", "La vie complète du Prophète Muhammad ﷺ résumée en 21 minutes : de sa naissance à la Révélation, un parcours extraordinaire."],
  ["WgPuTsCwhpc", "L'Histoire des Plus Grands Compagnons du Prophète ﷺ", "Une compilation des récits des plus grands compagnons du Prophète ﷺ, un travail réalisé avec passion et dévotion."],
  ["aM14o1R2fkk", "Les Miracles du Coran Que Vous Allez Entendre pour la Première Fois", "Des miracles scientifiques du Coran que vous n'avez jamais entendus. Une exploration fascinante des preuves divines."],
  ["APx0E7O0x6c", "\"Mon Père M'a Renié Après L'Islam…\" — Un Ex-Chrétien Raconte Son Histoire", "Le témoignage bouleversant d'un ex-chrétien dont la conversion à l'Islam provoqua le rejet de sa famille. Une histoire de foi et de sacrifice."],
  ["IjNfRBnR3Pk", "\"Je me Suis Converti à L'Islam à Hollywood\" — Un Rêve du Propos Divin", "L'histoire incroyable d'une conversion à l'Islam à Hollywood. Quand le rêve divin guide vers la vérité."],
  ["8JcKbq06HRM", "Futur Prêtre se Convertit à L'Islam — \"J'ai Défié le Coran\"", "L'histoire émouvante de la conversion de Yusha Evans, futur prêtre qui défia le Coran avant de trouver la vérité de l'Islam."],
  ["6nYvhq7rtaU", "L'Histoire Complète du Prophète Youssouf (Joseph) — Un Récit Émouvant", "L'histoire complète du Prophète Youssouf (Joseph), trahi par ses frères, vendu comme esclave, puis élevé au plus haut rang par la volonté d'Allah."],
  ["DnP3qd_Qwcs", "L'Histoire du Prophète ﷺ — Épisode 18", "Un épisode de la série retraçant la vie du Prophète Muhammad ﷺ, ses enseignements et les événements marquants de sa mission."],
  ["yo4FjML2RKw", "L'Histoire du Prophète — Récit Complet en Français", "Un récit complet et détaillé sur la vie du Prophète, ses enseignements et son héritage spirituel pour l'humanité."],
  ["jdqsiFw74Jk", "D'une Carrière au FBI à un Imam Musulman — Pour l'Islam", "Le parcours incroyable d'un agent du FBI qui quitta sa carrière pour devenir imam. Une histoire de transformation et de dévotion."],
  ["50ExPJin0Ho", "Les Miracles du Coran Que Vous Découvrirez pour la Première Fois", "Une exploration fascinante de miracles du Coran encore méconnus, qui renforcent la foi et émerveillent l'esprit."],
  ["9Nig8R3mHh4", "Allah a Caché ce Miracle dans ta Respiration — Cela va Renforcer ta Foi", "Un miracle divin caché dans l'acte le plus naturel de la vie : la respiration. Une réflexion qui va renforcer votre foi."],
  ["HPlRgzr3g_c", "Un Bouddhiste se Convertit à l'Islam — « Je ne Peux pas Voir Dieu, Pourquoi Croire ? »", "Le témoignage d'un bouddhiste qui trouva la vérité de l'Islam malgré ses questions existentielles sur l'existence de Dieu."],
  ["HVoEpbeehnU", "La Jeunesse qu'Israël Craint — La Génération Z", "Une analyse de la génération Z qui se tourne vers l'Islam en nombre, un phénomène qui inquiète les puissances dominantes."],
  ["LR3rQ8EG498", "La Génération Z se Convertit à l'Islam — La Jeunesse que l'Occident N'attendait Pas", "Un phénomène de masse : les jeunes de la génération Z embrassent l'Islam dans le monde entier. Une révolution spirituelle silencieuse."],
  ["Pcwmler30yk", "Un Bon Non-Musulman en Enfer, Un Musulman Pécheur au Paradis ? — La Réponse Islamique", "Une question philosophique profonde : la justice divine face à la foi et aux actes. La réponse islamique à un dilemme éternel."],
  ["QwN7qtPeOBg", "Fatima (RA) : La Fille du Prophète Muhammad ﷺ — Mères du Paradis (Ép.7)", "Fatima, la fille bien-aimée du Prophète ﷺ, l'une des quatre femmes parfaites de l'histoire. Sa vie, sa foi et son héritage spirituel."],
  ["RyH0Ic_xMnw", "J'ai Abandonné une Vie de Millionnaire pour l'Islam — Histoire de Conversion Émouvante", "Le témoignage d'un homme qui quitta tout — richesse, statut, confort — pour embrasser l'Islam. Un sacrifice inspirant."],
  ["TottSdGMDfM", "De la Boîte de Nuit à l'Islam — Un Entrepreneur de 23 ans se Convertit", "L'histoire d'un jeune entrepreneur de 23 ans qui quitta une vie de fêtes et de nuit pour trouver la vérité dans l'Islam."],
  ["U_KEkklNgE8", "Comment Allah m'a Sauvé — L'Histoire d'un Reconversion Spirituelle", "Un témoignage puissant sur la manière dont Allah guide et sauve ceux qui Le cherchent sincèrement."],
  ["WXHW3Ac4CWo", "J'ai Été Viré de la Mosquée à Cause de mes Tatouages — Non-Croyant vs Musulman", "Un échange fascinant entre un non-croyant et un musulman sur les préjugés, l'apparence et la foi."],
  ["bUsQT_fDBdw", "Bataille de la Tranchée : le Duel Épique d'Ali (RA) — Ô Messager (Ép.8)", "La bataille de la Tranchée et le duel héroïque d'Ali ibn Abi Talib (RA) face au guerrier Amr ibn Abd-Wudd. Un moment de légende."],
  ["guKvNzcL4rQ", "Je chantais dans des églises… jusqu'au jour où j'ai découvert l'islam — Noor Saadeh", "Le témoignage de Noor Saadeh, qui grandit en chantant dans les églises avant de trouver la vérité de l'Islam."],
  ["hFKDclO3EY0", "La Première Série de Sîra Visualisée par IA au Monde — Bande-annonce Ô Messager", "La bande-annonce officielle de la première série au monde retraçant la vie du Prophète ﷺ visualisée par intelligence artificielle."],
  ["sW1m8S1plOw", "Hajar (AS) : Seule dans le Désert avec Ismaïl (AS) — Le Miracle de Zamzam (Ép.6)", "Hajar, seule dans le désert avec son bébé Ismaïl, et le miracle de Zamzam. Un récit de patience et de confiance en Allah."],
  ["vnLKa4RkpAA", "La Conquête de la Mecque — Personne Ne S'attendait à Cela — Ô Messager (Ép.10)", "La conquête de la Mecque par le Prophète ﷺ : un retour triomphal sans effusion de sang. Un tournant historique de l'Islam."],
  ["xsQmE7GAGyA", "Eve (AS) — La Première Femme sur Terre — Mères du Paradis (Ép.8)", "Eve (Hawwa), la première femme de l'humanité. Son histoire, son rôle dans la création et les leçons éternelles de sa vie."],
  ["y2mevKuOKjo", "La Mort Tragique de Ma Mère M'a Conduit à l'Islam — Le Témoignage d'un Ex-Athée Suédois", "L'histoire bouleversante d'un athée suédois dont le deuil maternel fut le point de départ d'un voyage spirituel vers l'Islam."],
  ["AKfptpvAI1g", "Le Scientifique Musulman qui a Découvert la Gravité avant Newton", "Un short fascinant sur les savants musulmans qui ont découvert la gravité bien avant Newton. Un héritage scientifique oublié."],
  ["BYsk3Lz27Ho", "Le Miracle du Coran : Pourquoi la Fourmi a Dit « Écrase-la »", "Un miracle linguistique du Coran dans l'histoire de la fourmi et du Prophète Souleyman. La précision divine des mots du Coran."],
  ["EkfZS5kCUVY", "Pourquoi le Coran N'Appelle Jamais le Souverain de Joseph « Pharaon »", "Une précision étonnante du Coran : il ne nomme jamais « Pharaon » le souverain de l'époque de Joseph. Un miracle historique."],
  ["GN71AKyWUbg", "Le Coran Décrivait Déjà le Ciel Protecteur de la Terre il y a 1 400 Ans", "Le Coran décrivait le rôle protecteur de l'atmosphère terrestre 14 siècles avant la science moderne. Un miracle scientifique."],
  ["VUAaZoCe-bc", "Le Miracle des Montagnes dans le Coran", "Les montagnes, décrites dans le Coran comme des pieux stabilisateurs de la Terre. Un miracle scientifique confirmé par la géologie."],
  ["X3RLnBVL8Jc", "Pourquoi le Coran Parle d'un Moustique Femelle ?", "Pourquoi le Coran mentionne-t-il spécifiquement le moustique femelle ? Une précision biologique étonnante du Livre Saint."],
  ["qTUhSeWtCis", "Le Miracle du Coran : La Lettre qui Révèle la Fin du Soleil", "Une lettre du Coran qui décrit la fin du Soleil. Un miracle linguistique et scientifique qui défie l'entendement."],
  ["x3On4hWht00", "Gagne des Hassanates Pendant que tu Dors — Sunnahs du Coucher ﷺ", "Les sunnahs du coucher du Prophète ﷺ : comment gagner des bonnes actions même pendant son sommeil."],
  ["5q2o6PpwGbI", "SIGNS OF THE END OF TIMES VISIBLE IN 2025", "Une analyse visuelle et spirituelle frappante des signes de la Fin des Temps observés dans les bouleversements climatiques, géopolitiques et sociétaux actuels."],
  ["wCqt7QOA2QA", "Why do some women choose to leave this mosque?", "Une enquête poignante et bienveillante explorant les raisons pour lesquelles certaines femmes s'éloignent des mosquées et comment restaurer l'accueil prophétique."],
  ["wCstYQKX8U8", "INCREDIBLE CONVERSION AT 69 YEARS OLD", "Le récit poignant et inspirant d'une conversion à l'Islam à l'âge de 69 ans. Une preuve vivante que la guidance d'Allah n'a pas d'âge."],
  ["DtQp7r7e_J8", "Life After Death in Islam: Step by Step", "Le voyage complet de l'âme après la mort étape par étape : de l'agonie et la tombe (Barzakh) au Jour de la Résurrection, la Balance et l'Éternité."],
  ["XNqzrQlLLFY", "I Was Kidnapped for Accepting Islam! - Hindu Converts to Islam", "Le récit bouleversant d'un converti hindou à l'Islam confronté aux épreuves et à la persécution, guidé par la vérité inébranlable du Tawhid."],
];

const croyantRationnelRaw: [string, string, string][] = [
  ["E-3Opi2yDjs", "EBO Noah : Il Annonce la Fin du Monde sur TikTok et Arnaque des Milliers de Personnes", "Une enquête sur EBO Noah, ce influenceur qui annonça la fin du monde sur TikTok et trompa des milliers de croyants. Un rappel sur les faux prophètes."],
  ["Mt6LA6mtk9Q", "Voici le Vrai Visage de Croyant Rationnel", "La présentation et le parcours du créateur de Croyant Rationnel, sa vision et sa démarche pour transmettre l'Islam avec rationalité."],
  ["ewyOBQy66-4", "Epstein a Volé un Morceau de la Kaaba", "Les liens troublants entre Jeffrey Epstein et les mystères de la Kaaba. Une enquête fascinante au croisement de l'histoire et du complot."],
  ["h4e25tydSxI", "Elle a Épousé 40 Hommes, Aucun N'en est Sorti Vivant", "L'histoire mystérieuse d'une femme qui épousa 40 hommes sans qu'aucun n'en réchappe. Un récit fascinant sur la trahison et la justice divine."],
  ["h671xDi-hAA", "Le Faux Mahdi est Arrivé", "Un faux Mahdi fait son apparition. Comment reconnaître les imposteurs de la fin des temps selon les textes islamiques."],
  ["hnp4sw7Zw0c", "24H avec une Tribu Africaine Coupée du Monde", "Une immersion fascinante au sein d'une tribu africaine isolée du reste du monde. Une réflexion sur la foi, la nature et la modernité."],
  ["s-R9ALodR6I", "Un Djin Nous Attaque — On a Tout Filmé", "Une expérience saisissante : une rencontre avec un djinn, filmée en direct. Quand le monde invisible se manifeste."],
  ["CNfOSXQsGsg", "URGENT : Achoura Commence Demain", "Un rappel important sur le jeûne d'Achoura, sa signification spirituelle et les mérites de ce jour sacré dans la tradition islamique."],
  ["JAVM9SJlrig", "Se Plaindre de la Chaleur Peut T'Emmener en Enfer", "Une réflexion sur la gratitude et la patience face aux épreuves du quotidien. Se plaindre peut-il nous nuire spirituellement ?"],
  ["KzXH2Io3LtM", "7 Choses Haram pour les Hommes", "Une liste de 7 choses interdites (haram) spécifiquement pour les hommes en Islam. Un rappel important pour les croyants."],
  ["PpuOdplk-B8", "Explication du Jeûne de Achoura", "Une explication détaillée du jeûne d'Achoura : son histoire, sa signification, et la manière de l'observer selon la Sunna."],
  ["TClsJ1F398s", "Raser sa Barbe est Dangereux pour la Santé", "Une réflexion sur la barbe en Islam et les risques sanitaires du rasage. Entre Sunna, science et conseils pratiques."],
  ["Vqhwihm-R8c", "Il Fait des Rappels mais Il S'en Rappelle Plus", "Une critique de ceux qui transmettent des rappels islamiques sans les appliquer eux-mêmes. Un appel à la sincérité spirituelle."],
  ["Vz3KE3CdvxU", "La Femme de Ousmane Dembélé", "L'histoire et la foi de la femme du footballeur Ousmane Dembélé. Quand l'Islam guide les choix de vie des stars du sport."],
  ["eeLYvyGSTgo", "L'Acteur de Breaking Bad, Giancarlo Esposito, s'est Converti à l'Islam", "L'histoire de la conversion de Giancarlo Esposito, l'acteur de Breaking Bad. Quand les stars d'Hollywood trouvent l'Islam."],
  ["mGf0E0jfeNc", "Les Signes de Main de Naruto sont-ils du Shirk ?", "Une analyse islamique des signes de main dans l'anime Naruto : relèvent-ils du shirk ? Une réflexion entre pop culture et religion."],
  ["nZx97arDIHE", "3 Remèdes Islamiques pour Augmenter sa Testostérone", "Des remèdes issus de la tradition islamique pour booster naturellement la testostérone. Entre Sunna et santé masculine."],
  ["qlhM54Cptxw", "Les Animaux Parlent ! Nouveau Signe de la Fin du Monde", "Un nouveau signe de la fin du monde : les animaux qui parlent. Que disent les textes islamiques sur ce signe majeur ?"],
  ["xmzTjT-hwJ8", "Toutes Tes Duas Seront Acceptées ce Mardi 26 Mai 2026 (Jour d'Arafat)", "Le jour d'Arafat : le jour où toutes les invocations sont exaucées. Un rappel sur l'importance de ce jour béni."],
  ["zLR8DEOThwc", "Elle a Forniqué avec son Cousin", "Une histoire sur les conséquences du péché et le chemin du repentir. Un rappel sur la gravité de la fornication en Islam."],
  ["WUx1ErC39EQ", "J’ai Enquêté sur Les Nourrices Musulmanes en France : (ça fait mal...)", "Une grande enquête percutante sur la situation et les défis des nourrices et assistantes maternelles musulmanes en France, entre vocation, foi et pressions sociétales."],
  ["VWvVZdhYFtk", "Pourquoi les Hommes Ressemblent de plus en plus à des Femmes", "Analyse sociologique et spirituelle à la lumière des prophéties islamiques sur la perte des repères masculins et les bouleversements de notre époque contemporaine."],
  ["SkKnO_g1BrA", "LES SIGNES DE LA FIN DES TEMPS AVEC PREUVES L'INTÉGRALE", "Le grand documentaire intégral sur les signes mineurs et majeurs de la fin des temps, étayé par les textes authentiques du Coran et de la Sunnah."],
  ["Do_s-1BLe24", "ISRAEL et L'IRAN Vous cachent Quelque chose", "Décryptage des coulisses géopolitiques et eschatologiques entre Israël et l'Iran. Ce que les récits médiatiques traditionnels ne vous disent pas."],
  ["dWu6NUFfCvE", "J'ai Enquêté sur Ce GOUROU - Ancien Imam (Et C'est parti Beaucoup Trop Loin)", "Une enquête exclusive et documentée sur les dérives sectaires d'un ancien imam devenu gourou, et les mécanismes de manipulation spirituelle."],
  ["WRzmmLgVnt4", "I Investigated the 2.0 BROTHERS and It's Much WORSE ...", "Une investigation choc sur les dérives du cyber-activisme et les faux influenceurs prétendant agir au nom de la communauté."],
  ["eDR8LIihOZA", "J'ai Enquêté sur les ONG & Association internationale (vous n'êtes pas prêts)", "Enquête immersive sur le fonctionnement trouble de certaines grandes ONG et associations humanitaires internationales : où va réellement l'argent des dons ?"],
  ["CW1Prjn-3cs", "J'ai Enquêté sur ce que Cachent les Médias en France sur L'Islam", "Décryptage méthodique du traitement médiatique de l'Islam en France : manipulation de l'opinion, omissions volontaires et discours de stigmatisation."],
  ["n4st3dqnY9M", "J'ai Enquêté sur Ce que le DARK WEB cache sur L'ISLAM", "Plongée dans les bas-fonds du Dark Web à la découverte des réseaux de diffamation, marchés occultes et complots visant l'Islam et ses fidèles."],
  ["XkMbsl9j4nE", "J'ai Enquêté sur les MUSULMANS de Gaza Qui Travaillent Secrètement Pour ISRAEL", "Enquête rigoureuse et documentée sur les réseaux de renseignement, le chantage et la collaboration forcée ou clandestine dans le conflit de Gaza."],
  ["IoGqok1BLX0", "Les critiques des hadiths : qui sont ceux qui ne les acceptent pas", "Une réfutation argumentée et pédagogique du courant coraniste et des sceptiques qui rejettent la Sunnah et l'autorité des recueils prophétiques authentiques."],
];

const minuteIslamRaw: [string, string, string][] = [
  ["NDxEgz2oIqE", "THE 7 DEADLY SINS - @Minute Islam", "Les 7 grands péchés destructeurs (Al-Mubiqat) mis en garde par le Prophète ﷺ : explications concises, gravité spirituelle et remèdes pour s'en préserver."],
  ["uMUhKIlTf6E", "END OF TIMES - IMMINENT SIGNS - Minute Islam", "Rappel court, intense et captivant sur les signes imminents de l'Heure : la sécheresse, les épreuves et les annonces de la Révélation."],
  ["IQgrEqyaUag", "THE INTERPRETATION OF DREAMS - Minute Islam", "L'art et la science de l'interprétation des rêves (Tafsir Al-Ahlam) en Islam : distinguer le songe véridique de la ruse satanique et des pensées de l'âme."],
  ["BxgVOKxyh2w", "WOULD YOU BE ATHEIST? - Minute Islam", "Un questionnement philosophique et rationnel percutant sur les limites logiques de l'athéisme face à la complexité harmonieuse de l'Univers et de la vie."],
  ["Evr8LYo8Dt0", "4 things to do before you die - minute Islam", "Quatre actions indispensables et prioritaires à accomplir de son vivant avant que l'Heure n'arrive pour garantir un bilan favorable auprès du Créateur."],
  ["ljWrUUQ3DdI", "INVISIBLE SINS - MEDITANCE - Minute Islam", "La médisance, la jalousie et les péchés de la langue : ces fautes invisibles qui détruisent les bonnes actions à notre insu. Comment purifier son cœur."],
  ["-Kgkfuzuhwc", "INTIMATE RELATIONS BEFORE ISLAM - Minute Islam", "Une rétrospective historique sur les coutumes et pratiques relationnelles de l'époque préislamique (Jahiliyya) et la noblesse apportée par les préceptes de l'Islam."],
  ["eGVYv7oZMm8", "WHO IS ALLAH ? - Minute Islam", "Qui est Allah ? La définition sublime de l'Unicité Divine (Tawhid), Ses Plus Beaux Noms et Attributs expliqués avec une simplicité bouleversante."],
  ["LfTkK6ktk5w", "VIRGINITY - Minute Islam", "La pureté, la chasteté et la préservation de soi dans les enseignements islamiques face aux dérives de l'hypersexualisation moderne."],
  ["DefDLFdk7QQ", "Tu n'es Peut Être Plus Musulman Sans le savoir", "Explication claire et percutante des annulatifs de l'Islam (Nawaqid Al-Islam) et des pièges subtils qui peuvent menacer la foi."],
  ["nkvx27zE6Mo", "J'ai Enquêté sur Les Dessous du Poulet KFC Halal en France (AVS? ACHAHADA? MOSQUÉE DE LYON?)", "Grande enquête d'investigation sur la traçabilité de la viande et les organismes de certification halal (AVS, Achahada, Mosquée de Lyon) dans les fast-foods en France."],
  ["guwErCKlbO4", "L'ISLAM AU SÉNÉGAL ( Épisode 1: La route du Tawhid)", "Documentaire immersif retraçant l'histoire glorieuse de l'Islam au Sénégal, la transmission du Tawhid et l'héritage des grands savants de l'Afrique de l'Ouest."],
  ["YOu1on5c3kw", "CE QU'IL SE PASSERA LE JOUR DU JUGEMENT DERNIER", "Description saisissante des étapes du Jour du Jugement Dernier : le souffle de la Trompe, le rassemblement, les comptes et la traversée du pont As-Sirat."],
  ["CRPlrOuJxT0", "J'ai enquêté sur les INFLUENCEURS MUSULMANS qui vous mentent", "Décryptage salutaire sur le business, les placements de produits douteux et les dérives de certains influenceurs musulmans sur les réseaux sociaux."],
  ["YuIDtvYwtz0", "Tu as ces 5 choses chez toi ? Il est temps de s’en débarrasser !", "5 objets ou pratiques souvent présents dans les foyers qui empêchent l'entrée des anges de miséricorde selon les hadiths prophétiques."],
  ["jJAA60-14u0", "QUE DEVIENDRONT LES ANIMAUX APRÈS LE JUGEMENT ( PARADIS, ENFER OU POUSSIÈRE )", "Que dit l'Islam sur le sort des animaux lors du Jour de la Résurrection ? Rétablissement de la justice entre les créatures puis retour en poussière."],
  ["INr0y5Np4Y8", "LA FIN DES TEMPS 1 - INTRODUCTION", "Premier volet de la grande série sur la Fin des Temps : panorama général, signes précurseurs et attitudes du croyant face aux troubles (Fitna)."],
  ["rgtxZuJmwMc", "LA FIN DES TEMPS 2 - MAHDI, DAJJAL, ISA, GOG & MAGOG", "Deuxième volet consacré aux signes majeurs : l'apparition du Mahdi, la venue de l'Antéchrist (Dajjal), la descente de Jésus ('Isa) et les peuples Gog et Magog."],
  ["6Z-umY6WInU", "CANICULE : LA DÉRANGEANTE VÉRITÉ QUE NOUS CACHENT LES MÉDIAS", "Les chaleurs extrêmes et la canicule à la lumière des enseignements islamiques : un souffle de l'Enfer et un rappel des réalités de l'Au-delà."],
  ["UeRjMfySejA", "Quel est le sens de la vie ? Médite avant de mourir", "Méditation profonde sur la raison d'être de l'être humain, l'épreuve de l'ici-bas et la préparation lucide du départ vers l'éternité."],
  ["WZnTMTwxVN0", "Ce Djinn te Suit jusqu'à la Mort - Et ce n'est pas le plus Choquant", "Les révélations authentiques sur le Qarin (le compagnon djinn assigné à chaque individu), ses murmures (waswas) et les moyens spirituels de s'en protéger."],
  ["16NoYOXm8CA", "Cro-Magnon et évolution : ce que l'Islam en dit", "Confronter la théorie de l'évolution, l'homme de Cro-Magnon et les découvertes archéologiques avec le récit coranique de la création d'Adam."],
  ["hF_VXUaKjGk", "D'où vient l'Obsession des Hommes à l'Infidélité ?", "Analyse des causes psychologiques et spirituelles de la trahison et de la tromperie, et comment la foi fortifie le foyer et le respect des engagements."],
  ["X19CsM5BH6A", "CE QU'IL SE PASSERA LE JOUR DE LA FIN DES TEMPS", "Le bouleversement de l'Univers, l'effondrement des cieux et des montagnes : les descriptions bibliques et coraniques de la fin du monde."],
  ["_6m-BRNc34Y", "J'ai enquêté sur l'HORREUR des Imams 2.0 égareurs", "Enquête critique sur les faux prédicateurs et pseudo-savants du web qui déforment les textes et égarent la jeunesse pour des vues et des abonnés."],
  ["5l2-NAG0w7c", "Ce qu'Allah a Mis Sur Notre Route En Bosnie Nous a CHOQUÉ", "Carnet de voyage et témoignage poignant en Bosnie-Herzégovine sur les traces de l'histoire musulmane européenne et les leçons de résilience."],
  ["ZwY6Gx4KD1s", "Omra à petit prix : partir seul sans agence pour moins de 500€", "Guide complet et conseils pratiques pour accomplir son pèlerinage de l'Omra en toute autonomie à moindre coût, sans compromettre sa dévotion."],
  ["K4-DNtDbAfQ", "J'ai Enquêté sur Trump, les Rothschild et Le Pacte Secret Des Sionistes Chrétiens Contre l’islam", "Enquête géopolitique approfondie sur les alliances évangéliques, le sionisme chrétien aux États-Unis et leurs ambitions eschatologiques au Moyen-Orient."],
  ["W7C4KfbEt2M", "J'ai Enquêté sur La Colonisation Française et sa Stratégie pour Supprimer l'islam d'Algerie", "Recherche historique détaillée sur les politiques de défrancisation et de tentative d'éradication de l'identité islamique durant la colonisation en Algérie."],
  ["Zyy_5-d-Y9c", "Le conflit Iran-Israël : signes d’un changement global à venir ?", "Analyse stratégique et eschatologique sur l'escalade militaire entre l'Iran et Israël et ses répercussions sur l'équilibre mondial."],
  ["n3YzO8nGUUs", "Un Rabbin Révèle La VÉRITÉ sur La Guerre Actuelle et le Si0nisme", "Témoignage et analyse d'un rabbin orthodoxe antisioniste distinguant le judaïsme traditionnel des visées politiques et militaires nationalistes."],
  ["SPICJxNcXQo", "4 CONSEILS CONTRE LE PORNO", "Quatre étapes concrètes, psychologiques et spirituelles pour briser l'addiction à la pornographie et purifier son regard et son cœur."],
  ["uJpsa3dUxdg", "LA FIN DES TEMPS 6 - LES SIGNES VISIBLES", "Sixième volet de la série Eschatologie : les signes mineurs déjà réalisés et observables sous nos yeux au XXIe siècle."],
  ["AU9a8VYpwZI", "INVOCATION DU VOYAGE - Minute Islam - Ecouter, Apprendre, Comprendre.", "Dua du voyage (Dou'a As-Safar) avec prononciation claire en arabe, translittération, traduction française et explication de ses mérites."],
  ["p1h8Uv2i2l4", "Rappel Spirituel & Méditation — Minute Islam", "Méditation sur la constance dans l'adoration, la purification de l'intention et le détachement des futilités de la vie d'ici-bas."],
  ["CgmRciPEgV0", "J'OFFRE DES IPAD À DES NON MUSULMANS QUI RÉPONDENT CORRECTEMENT À NOS QUESTIONS !", "Micro-trottoir éducatif et bienveillant dans la rue pour faire découvrir l'Islam, déconstruire les stéréotypes et récompenser les participants."],
];

const communityRaw: [string, string, string, string][] = [
  ["pn5Kk1JY93g", "Un chrétien lit le Coran : Jésus et Marie dans la Sourate Al-Imran", "Une lecture attentive et respectueuse des versets coraniques dédiés à 'Isa (Jésus) et Maryam (Marie), mettant en lumière la vénération de leurs figures en Islam.", "La Quête"],
  ["toSgPWX87W8", "Une grande perte si vous lisez rarement cette sourate - Cheikh Souleyman bin Salimullah Ar-Rouhayli", "Explication des mérites incommensurables et des bénédictions associées à la récitation fréquente des sourates protectrices et fondamentales.", "As-Sunnah"],
  ["DWeJaNN8Bhk", "LA PARALYSIE DU SOMMEIL : Ce Phénomène Terrifiant Que Personne N'arrive à Expliquer", "Entre explications scientifiques et enseignements islamiques sur le monde invisible : que se passe-t-il lors de la paralysie du sommeil et comment s'en prémunir ?", "Ousstaz"],
  ["IqKm0gRu-_Y", "Psfprime : Amulettes de protection, Cherté de la vie au Sénégal, le regard de l'islam", "Émission spéciale décryptant l'usage traditionnel des amulettes (gris-gris), les questions socio-économiques et les réponses du fiqh islamique.", "2stvsenegal"],
  ["ugt2m2UDs9A", "Voici pourquoi j'ai quitté la France pour la Malaisie. 🇲🇾🇫🇷", "Retour d'expérience et témoignage inspirant sur la Hijra, le coût de la vie et l'épanouissement familial dans un pays musulman moderne.", "RayGdr"],
  ["Y3ukppFaVBU", "SAMA YAAY - Saison 1 - Episode 23 : Bande Annonce", "Bande-annonce officielle de la série sénégalaise Sama Yaay mettant en scène les liens familiaux, les épreuves et les valeurs morales.", "EvenProd"],
  ["0V3v_uPAOBw", "Série - Kër Gu Mag - Episode 23 - VOSTFR", "Épisode de la série sociétale Kër Gu Mag abordant les dynamiques familiales, la sagesse des aînés et les traditions.", "Marodi TV Sénégal"],
  ["H9VKNw4cwKA", "VEO Sprint - Fitness & Découverte", "Session dynamique d'entraînement physique et conseils de discipline corporelle au quotidien.", "Découvertes"],
  ["xKRD5Lmba0o", "Récital XXL de Lamine Camara contre le PSG", "Retour en images et analyse sportive de la prestation étincelante du milieu de terrain sénégalais Lamine Camara.", "Sport & Société"],
  ["FCxUXtdN1pU", "Training at the Most Dangerous Gym in America", "Immersion et séance intensive de musculation et de dépassement de soi dans une salle mythique.", "Découvertes"],
  ["kBmWOcJKIko", "Vibe Coding with Gemini 3 in Google AI Studio", "Démonstration du développement assisté par intelligence artificielle pour concevoir rapidement des applications modernes.", "Tech & Savoir"],
  ["hcxV40rupDE", "Un choc de Premier League 2026/27 (J3)", "Résumé des temps forts, buts et analyse tactique de la grande affiche du championnat anglais.", "Sport & Société"],
  ["dwK5F_PXV_I", "Al-Ittihad étouffe Al-Nassr | Al-Ittihad vs Al-Nassr", "Debrief passionné et analyse du duel au sommet entre les géants de la Saudi Pro League.", "Sport & Société"],
  ["wQREAw7Jl5o", "Test des Nouveaux Modèles Audio & IA Musicale", "Test complet des nouveaux modèles de génération audio et intelligence artificielle créative.", "Tech & Savoir"],
  ["QAKB5JPjU6I", "Valence 0-5 Barcelone - Analyse Tactique", "Analyse tactique et retour sur le match entre le Barça et Valence.", "Sport & Société"],
  ["xKXPtDz6eyM", "Le début de saison enchanté du Barça à Mestalla", "Analyse détaillée de la rencontre de Liga espagnole et des enjeux de la saison.", "Sport & Société"],
  ["OaX_qWLNPWs", "Routine Diète + Entraînement Fitness & Santé", "Conseils diététiques simples et programme d'exercices physiques pour reprendre sa santé en main.", "Santé & Bien-être"],
  ["I7hVt0VVKJE", "Ces applications m'ont payé (preuve à l'appui)", "Enquête et tests pratiques sur les applications de micro-rémunération et de productivité en ligne.", "Tech & Savoir"],
  ["qzDosOe0mgo", "Le Diable s'habille en Rick Owens : son incroyable histoire", "Récit documentaire sur les coulisses de la mode, les influences artistiques et les dérives de l'extravagance.", "Société"],
  ["7gh9PPAZI0c", "Iliman Ndiaye - Débuts Remarquables", "Compilations des meilleurs gestes techniques et du parcours exemplaire d'Iliman Ndiaye.", "Sport & Société"],
  ["hAvbpCBDgDM", "Astuces et Soins Quotidiens : Hacks Indispensables", "Guide pratique de soins corporels simples et efficaces au quotidien.", "Santé & Bien-être"],
  ["xFenpNBdxj0", "Surviving The World's Most Dangerous Gym!", "Aventure et défi sportif immersif dans une salle d'entraînement extrême.", "Découvertes"],
  ["2j0T2Ty36Go", "Last Minute Goal FIFA vs PES (1999 - 2025)", "Rétrospective nostalgique sur 25 ans d'évolution graphique et de gameplay entre les simulations de football.", "Tech & Savoir"],
];

function buildItem(
  id: string,
  youtubeId: string,
  title: string,
  description: string,
  channel: Channel,
  meta: {
    cats?: Category[];
    year?: number;
    featured?: boolean;
    isNew?: boolean;
    isTrending?: boolean;
    audioUrl?: string;
    skipSegments?: SkipSegment[];
    seriesId?: string;
    seriesTitle?: string;
    episodeNumber?: number;
    totalEpisodes?: number;
  }
): ContentItem {
  const categories = meta.cats ?? [];

  // Series detection
  let seriesId = meta.seriesId;
  let seriesTitle = meta.seriesTitle;
  let episodeNumber = meta.episodeNumber;
  let totalEpisodes = meta.totalEpisodes;

  if (!seriesId) {
    if (title.includes("Ô Messager") || title.includes("O Messager")) {
      seriesId = "o-messager";
      seriesTitle = "Ô Messager — Sîra du Prophète ﷺ";
      totalEpisodes = 11;
      const match = title.match(/(?:Ép\.|Ep\.|Épisode)\s*(\d+)/i);
      if (match) episodeNumber = parseInt(match[1], 10);
    } else if (title.toUpperCase().includes("PROPHETE IBRAHIM")) {
      seriesId = "histoire-ibrahim";
      seriesTitle = "L'Histoire du Prophète Ibrahim";
      totalEpisodes = 3;
      const match = title.match(/(?:EP\.|Ép\.|Ep\.)\s*(\d+)/i);
      if (match) episodeNumber = parseInt(match[1], 10);
    } else if (title.includes("Mères du Paradis")) {
      seriesId = "meres-du-paradis";
      seriesTitle = "Mères du Paradis";
      totalEpisodes = 8;
      const match = title.match(/(?:Ép\.|Ep\.|Épisode)\s*(\d+)/i);
      if (match) episodeNumber = parseInt(match[1], 10);
    }
  }

  return {
    id,
    youtubeId,
    title,
    description,
    channel,
    categories,
    year: meta.year ?? 2024,
    rating: "TV-PG",
    duration: "—",
    score: 85 + Math.floor(Math.random() * 14),
    thumbnail: getThumbnail(youtubeId),
    image: getThumbnail(youtubeId),
    heroImage: getThumbnail(youtubeId),
    audioUrl: meta.audioUrl,
    featured: meta.featured,
    isNew: meta.isNew,
    isTrending: meta.isTrending,
    skipSegments: meta.skipSegments,
    seriesId,
    seriesTitle,
    episodeNumber,
    totalEpisodes,
  };
}

const narroDinItems: ContentItem[] = narroDinRaw.map(([ytId, title, desc], i) => {
  const meta = narroDinMeta[ytId] ?? {};
  return buildItem(`nd${i + 1}`, ytId, title, desc, "NARRO DIN", meta);
});

const narroItems: ContentItem[] = narroRaw.map(([ytId, title, desc], i) => {
  const meta = narroMeta[ytId] ?? {};
  return buildItem(`n${i + 1}`, ytId, title, desc, "NARRO", meta);
});

const yacineItems: ContentItem[] = yacineRaw.map(([ytId, title, desc], i) => {
  const meta = yacineMeta[ytId] ?? {};
  return buildItem(`y${i + 1}`, ytId, title, desc, "Yacine", meta);
});

const towardsEternityItems: ContentItem[] = towardsEternityRaw.map(([ytId, title, desc], i) => {
  const meta = towardsEternityMeta[ytId] ?? {};
  return buildItem(`te${i + 1}`, ytId, title, desc, "Towards Eternity", meta);
});

const croyantRationnelItems: ContentItem[] = croyantRationnelRaw.map(([ytId, title, desc], i) => {
  const meta = croyantRationnelMeta[ytId] ?? {};
  return buildItem(`cr${i + 1}`, ytId, title, desc, "Croyant Rationnel", meta);
});

const haramainItems: ContentItem[] = haramainRaw.map(([ytId, title, desc], i) => {
  const meta = haramainMeta[ytId] ?? {};
  return buildItem(`h${i + 1}`, ytId, title, desc, "Récitations Haramain", meta);
});

const minuteIslamItems: ContentItem[] = minuteIslamRaw.map(([ytId, title, desc], i) => {
  const meta = minuteIslamMeta[ytId] ?? {};
  return buildItem(`mi${i + 1}`, ytId, title, desc, "Minute Islam", meta);
});

const communityItems: ContentItem[] = communityRaw.map(([ytId, title, desc, ch], i) => {
  const meta = communityMeta[ytId] ?? {};
  return buildItem(`com${i + 1}`, ytId, title, desc, ch, meta);
});

export const catalog: ContentItem[] = [
  ...narroDinItems,
  ...narroItems,
  ...yacineItems,
  ...towardsEternityItems,
  ...croyantRationnelItems,
  ...haramainItems,
  ...minuteIslamItems,
  ...communityItems,
];

export const allCategories: Category[] = [
  "Coran",
  "Prophètes",
  "Compagnons",
  "Anges & Djinns",
  "Eschatologie",
  "Miracles du Coran",
  "Héros & Personnages",
  "Histoire & Mystère",
];

export const categories = allCategories;

export function getFeaturedContent(): ContentItem {
  return catalog.find((c) => c.featured) || catalog[0];
}

export function getContentByCategory(cat: Category): ContentItem[] {
  return catalog.filter((c) => c.categories.includes(cat));
}

export function getContentByChannel(channel: Channel): ContentItem[] {
  return catalog.filter((c) => c.channel === channel);
}

export function getSeriesEpisodes(seriesId: string): ContentItem[] {
  return catalog
    .filter((c) => c.seriesId === seriesId)
    .sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
}

export const rows: ContentRowData[] = [
  {
    id: "trending",
    label: "Tendances",
    items: catalog.filter((c) => c.isTrending),
  },
  {
    id: "coran-tarawih",
    label: "📖 Coran : Tarawih Historiques de La Mecque & Médine (1980 - 2000)",
    items: catalog.filter((c) => c.categories.includes("Coran")),
  },
  ...allCategories
    .filter((cat) => cat !== "Coran")
    .map((cat) => ({
      id: cat.toLowerCase().replace(/[^a-z]/g, "-"),
      label: cat,
      items: catalog.filter((c) => c.categories.includes(cat)),
    })),
  {
    id: "recitations-haramain",
    label: "🕌 Récitations & Tarawih des Grands Imams (1980 - 2000)",
    items: catalog.filter((c) => c.channel === "Récitations Haramain"),
  },
  {
    id: "narro-din",
    label: "🌟 NARRO DIN — Voyages & Histoires Prophétiques",
    items: catalog.filter((c) => c.channel === "NARRO DIN"),
  },
  {
    id: "narro",
    label: "NARRO — Récits Immersifs",
    items: catalog.filter((c) => c.channel === "NARRO"),
  },
  {
    id: "yacine",
    label: "Yacine — Histoires Islamiques",
    items: catalog.filter((c) => c.channel === "Yacine"),
  },
  {
    id: "towards-eternity",
    label: "Towards Eternity — Ô Messager",
    items: catalog.filter((c) => c.channel === "Towards Eternity"),
  },
  {
    id: "croyant-rationnel",
    label: "Croyant Rationnel",
    items: catalog.filter((c) => c.channel === "Croyant Rationnel"),
  },
  {
    id: "minute-islam",
    label: "⏱️ Minute Islam — Rappels & Sagesses",
    items: catalog.filter((c) => c.channel === "Minute Islam"),
  },
  {
    id: "new",
    label: "Nouveautés",
    items: catalog.filter((c) => c.isNew),
  },
].filter((r) => r.items.length > 0);
