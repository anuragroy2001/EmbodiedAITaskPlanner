const ROBOT_TYPE_COOKIE = "robotType";

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|;\\s*)" + encodeURIComponent(name) + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(
  name: string,
  value: string,
  options?: { maxAge?: number; path?: string }
): void {
  if (typeof document === "undefined") return;
  let cookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);
  if (options?.maxAge != null) cookie += "; max-age=" + options.maxAge;
  cookie += "; path=" + (options?.path ?? "/");
  document.cookie = cookie;
}

export { ROBOT_TYPE_COOKIE };
