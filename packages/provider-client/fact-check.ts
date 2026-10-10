import type { Passage } from "../citation-schema";
export function compareClaim(quote: string, passages: Passage[]) {
  const normalized = quote.normalize("NFC").trim().replace(/\s+/g, " ");
  const eligible = passages.filter((p) => p.review_status === "approved");
  const exact =
    normalized.length >= 20
      ? eligible.filter((p) =>
          [p.original, p.translation].some((text) =>
            text.normalize("NFC").replace(/\s+/g, " ").includes(normalized),
          ),
        )
      : [];
  return {
    verdict: exact.length
      ? "local_text_match"
      : eligible.length
        ? "related_passages_only"
        : "not_verified",
    matched_ids: exact.map((p) => p.id),
    note: exact.length
      ? "The submitted wording occurs in an installed reviewed passage. This does not validate the screenshot, its claimed attribution, translation equivalence, interpretation or omitted context. Inspect the edition and surrounding text."
      : "No exact wording match was established. Related passages and web results are leads, not proof that the quote is authentic or fabricated. OCR and edition differences may matter.",
  };
}
