import catalogueCandidates from "./catalogue-candidates.json";
export const MAHAPURANA_TARGETS = [
  ["brahma-purana", "Brahma Purana"],
  ["padma-purana", "Padma Purana"],
  ["vishnu-purana", "Vishnu Purana"],
  ["shiva-purana", "Shiva Purana"],
  ["bhagavata-purana", "Bhagavata Purana"],
  ["narada-purana", "Narada Purana"],
  ["markandeya-purana", "Markandeya Purana"],
  ["agni-purana", "Agni Purana"],
  ["bhavishya-purana", "Bhavishya Purana"],
  ["brahmavaivarta-purana", "Brahmavaivarta Purana"],
  ["linga-purana", "Linga Purana"],
  ["varaha-purana", "Varaha Purana"],
  ["skanda-purana", "Skanda Purana"],
  ["vamana-purana", "Vamana Purana"],
  ["kurma-purana", "Kurma Purana"],
  ["matsya-purana", "Matsya Purana"],
  ["garuda-purana", "Garuda Purana"],
  ["brahmanda-purana", "Brahmanda Purana"],
] as const;
export const GITA_PRESS_SCOPE = "gita-press-mahapuranas";
export const gitaPressRegister = MAHAPURANA_TARGETS.map(([work_id, title]) => ({
  work_id,
  title,
  intended_publisher: "Gita Press",
  publisher_location: "Gorakhpur",
  edition_status: "not_selected",
  catalogue_url: "https://gitapress.org/catalogue",
  catalogue_code: null,
  edition_id: null,
  print_year: null,
  volumes: [],
  completeness: "unconfirmed",
  rights_status: "pending",
  review_status: "pending",
  indexed_passages: 0,
  requested_assets: [
    "Sanskrit source text",
    "Hindi translation where licensed",
  ],
  required_permissions: ["index", "quote", "remote_embedding", "audio"],
  catalogue_candidates:
    catalogueCandidates.find((w) => w.work_id === work_id)
      ?.catalogue_candidates ?? [],
  catalogue_status:
    catalogueCandidates.find((w) => w.work_id === work_id)?.status ??
    "not_checked",
}));

export const EPIC_TARGETS = [
  ["valmiki-ramayana", "Valmiki Ramayana", "Valmiki", "kanda"],
  ["mahabharata", "Mahabharata", "Vyasa", "parva"],
] as const;
export const gitaPressEpicRegister = EPIC_TARGETS.map(([work_id, title, traditional_author, division]) => ({
  work_id, title, traditional_author, division,
  intended_publisher: "Gita Press", publisher_location: "Gorakhpur",
  edition_status: "not_selected", edition_id: null,
  completeness: "unconfirmed", rights_status: "pending", review_status: "pending",
  indexed_passages: 0,
  citation_hierarchy: [division, "chapter", "verse"],
  catalogue_url: "https://gitapress.org/catalogue",
  requested_assets: ["Sanskrit source text", "Hindi translation where licensed"],
  required_permissions: ["index", "quote", "remote_embedding", "audio"],
}));

export const VEDA_TARGETS = [
  ["rigveda", "Rigveda"], ["yajurveda", "Yajurveda"],
  ["samaveda", "Samaveda"], ["atharvaveda", "Atharvaveda"],
] as const;
export const gitaPressVedaRegister = VEDA_TARGETS.map(([work_id, title]) => ({
  work_id, title, intended_publisher: "Gita Press", publisher_location: "Gorakhpur",
  edition_status: "not_selected", edition_id: null, recension: null,
  completeness: "unconfirmed", rights_status: "pending", review_status: "pending",
  indexed_passages: 0, catalogue_status: "full_editions_not_established",
  citation_hierarchy: "To be selected from the actual recension",
  accent_review_status: "pending",
  requested_assets: ["Accented Sanskrit Samhita text", "Hindi translation where licensed"],
  required_permissions: ["index", "quote", "remote_embedding", "audio"],
}));
