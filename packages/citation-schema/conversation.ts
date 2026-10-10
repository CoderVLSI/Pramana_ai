/** App greetings/navigation are not scripture evidence requests. Exact intents only. */
export function isAppConversation(query: string): boolean {
  const normalized = query.normalize("NFKC").toLowerCase().replace(/[!?.,।]/g, "").replace(/\s+/g," ").trim();
  return ["hi","hello","hey","namaste","नमस्ते","नमस्कार","hello pramana","hi pramana","help","what can you do","how do i use this app","how to use this app","how do i search","how do i set my api key"].includes(normalized);
}
