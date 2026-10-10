/** Permission dialogs may make an Android app inactive during startup. */
export function shouldStopLive(
  appState: string,
  sessionActive: boolean,
  requestingPermission: boolean,
) {
  return sessionActive && appState !== "active" && !requestingPermission;
}
