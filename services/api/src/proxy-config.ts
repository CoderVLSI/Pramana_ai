/** Trust only the configured reverse-proxy hops or addresses. */
export function proxyTrust(value?: string): boolean | string | ((address: string, hop: number) => boolean) {
  if (!value || value === "false" || value === "0") return false;
  if (value === "true") return true;
  if (/^[1-9]\d?$/.test(value)) return (_address, hop) => hop < Number(value);
  return value;
}
