export function decodeBase64(value: string): Uint8Array {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 === 1)
    throw Error("Invalid audio");
  const raw = atob(value);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
export function encodeBase64(value: Uint8Array): string {
  let raw = "";
  for (const byte of value) raw += String.fromCharCode(byte);
  return btoa(raw);
}
