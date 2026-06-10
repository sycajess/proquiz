export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return (import.meta as any).env?.VITE_APP_URL || window.location.origin;
  }
  return process.env.APP_URL || 'http://localhost:3000';
}

export function getJoinUrl(roomCode: string): string {
  return `${getAppBaseUrl()}/join/${roomCode}`;
}

export function getPresentUrl(roomCode: string): string {
  return `${getAppBaseUrl()}/present/${roomCode}`;
}

export function getControlUrl(roomCode: string): string {
  return `${getAppBaseUrl()}/control/${roomCode}`;
}
