export type SupportState =
  "DIRECT" | "INFERRED" | "TRADITIONAL" | "DISPUTED" | "NOT_VERIFIED";
export interface Passage {
  id: string;
  work_id: string;
  edition_id: string;
  reference: string;
  chapter: number;
  verse: number;
  original: string;
  translation: string;
  translator: string;
  translation_language?: string;
  keywords: string[];
  review_status: "fixture" | "approved";
  license_id: string;
  released_in: string;
  content_sha256: string;
  exact_verse?: string;
  hierarchy?: { name: string; value: string }[];
  source_locator?: {
    volume: string;
    printed_page: number;
    pdf_page: number;
    asset_sha256: string;
  };
  completeness?: "complete" | "abridged" | "selected";
  quote_source?: "original" | "translation";
  translation_sha256?: string;
  audio_allowed?: boolean;
}
export interface Claim {
  text: string;
  evidence_ids: string[];
  type: SupportState;
  quote_span: [number, number];
}
export interface Answer {
  id: string;
  query: string;
  answer: string;
  support_state: SupportState;
  claims: Claim[];
  citations: Passage[];
  caveats: string[];
  corpus_release: string;
  safe_to_speak: boolean;
}
export const RELEASE = "development-fixtures-0.1";
