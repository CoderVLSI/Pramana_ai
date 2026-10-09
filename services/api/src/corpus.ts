import { gitaPressRegister } from "../../../packages/corpus-schema/register";
import { createHash } from "node:crypto";
import { RELEASE, type Passage } from "../../../packages/citation-schema/index";
const rows = [
  [
    2,
    47,
    "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",
    "Your concern is with action alone, never with its fruits. Do not let the fruits of action be your motive, and do not become attached to inaction.",
    ["action", "karma", "duty", "fruits", "results", "attachment", "work"],
  ],
  [
    2,
    48,
    "योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय।\nसिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते॥",
    "Established in yoga, perform actions, abandoning attachment, Dhananjaya. Be the same in success and failure; this equanimity is called yoga.",
    ["equanimity", "yoga", "success", "failure", "balance", "action"],
  ],
  [
    4,
    7,
    "यदा यदा हि धर्मस्य ग्लानिर्भवति भारत।\nअभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम्॥",
    "Whenever dharma declines, Bharata, and adharma rises, then I manifest myself.",
    ["dharma", "decline", "manifest", "krishna"],
  ],
  [
    6,
    26,
    "यतो यतो निश्चरति मनश्चञ्चलमस्थिरम्।\nततस्ततो नियम्यैतदात्मन्येव वशं नयेत्॥",
    "Whenever the restless and unsteady mind wanders, one should restrain it and bring it back under the control of the self.",
    ["mind", "meditation", "wander", "restless", "focus"],
  ],
  [
    9,
    26,
    "पत्रं पुष्पं फलं तोयं यो मे भक्त्या प्रयच्छति।\nतदहं भक्त्युपहृतमश्नामि प्रयतात्मनः॥",
    "Whoever offers me a leaf, a flower, a fruit, or water with devotion: I accept that offering made with devotion by one whose self is disciplined.",
    ["devotion", "offering", "flower", "bhakti", "leaf"],
  ],
] as const;
export const passages: Passage[] = rows.map(
  ([chapter, verse, original, translation, keywords]) => ({
    id: `fixture_bg_${chapter}_${verse}`,
    work_id: "bhagavad-gita",
    edition_id: "development-sanskrit-fixture",
    reference: `Bhagavad Gita ${chapter}.${verse}`,
    chapter,
    verse,
    original,
    translation,
    translator: "Pramana development rendering; not a published translation",
    keywords: [...keywords],
    review_status: "fixture",
    license_id: "development-only",
    released_in: RELEASE,
    content_sha256: createHash("sha256").update(original).digest("hex"),
  }),
);
export const works = [
  {
    id: "bhagavad-gita",
    title: "Bhagavad Gita",
    subtitle: "A dialogue on action, wisdom, and devotion",
    passage_count: passages.length,
    status: "Development fixtures",
    editions: [
      {
        id: "development-sanskrit-fixture",
        name: "Development Sanskrit fixture",
        publisher: null,
        year: null,
        review_status: "fixture",
        rights:
          "Not cleared for production; scans and publisher translations excluded",
      },
    ],
  },
  {
    id: "mahabharata",
    title: "Mahabharata",
    subtitle: "Traditionally attributed to Vyasa · Gita Press edition pending",
    passage_count: 0,
    status: "Awaiting reviewed corpus",
    editions: [],
  },
  {
    id: "valmiki-ramayana",
    title: "Valmiki Ramayana",
    subtitle: "Valmiki's Sanskrit epic · Gita Press edition pending",
    passage_count: 0,
    status: "Awaiting reviewed corpus",
    editions: [],
  },
  {
    id: "bhagavata-purana",
    title: "Bhagavata Purana",
    subtitle: "Stories of devotion and the divine",
    passage_count: 0,
    status: "Awaiting reviewed corpus",
    editions: [],
  },
];

export const mahapuranas = [
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
].map(([id, title]) => ({
  id,
  title,
  category: "mahapurana",
  status: "Awaiting edition, rights clearance, and scholarly review",
  passage_count: 0,
  editions: [],
}));
for (const work of mahapuranas)
  if (!works.some((w) => w.id === work.id))
    works.push({ ...work, subtitle: "Planned source corpus" });

for (const work of works) {
  const target = gitaPressRegister.find((r) => r.work_id === work.id);
  if (target) {
    work.status = "Gita Press, Gorakhpur · edition and rights pending";
    work.subtitle = "Gita Press reference collection · not indexed";
  }
}

for (const [id, title] of [["rigveda", "Rigveda"], ["yajurveda", "Yajurveda"], ["samaveda", "Samaveda"], ["atharvaveda", "Atharvaveda"]])
  works.push({id, title, subtitle: "Recension and full Gita Press edition not yet established", status: "Planned · source verification pending", passage_count: 0, editions: []});
