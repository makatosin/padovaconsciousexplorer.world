const KEY = "pce-demo-token";

export function getDemoToken(): string | undefined {
  try {
    return (
      localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY) ?? undefined
    );
  } catch {
    return undefined;
  }
}

export function setDemoToken(token: string): void {
  try {
    localStorage.setItem(KEY, token);
    sessionStorage.setItem(KEY, token);
  } catch {
    /* storage unavailable */
  }
}

export function clearDemoToken(): void {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
