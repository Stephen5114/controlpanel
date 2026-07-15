// Referral attribution capture: ?ref= URL param wins, otherwise the
// cross-subdomain cookie set by hostvibecoding.com (/r/CODE links).

export const REFERRAL_COOKIE_NAME = "vibe-hosting-ref";

const CODE_PATTERN = /^[A-Za-z0-9]{4,16}$/;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  for (const part of document.cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

export function getReferralCode(): { code: string; source: "link_param" | "cookie" } | null {
  if (typeof window !== "undefined") {
    const param = new URLSearchParams(window.location.search).get("ref");
    if (param && CODE_PATTERN.test(param.trim())) {
      return { code: param.trim().toUpperCase(), source: "link_param" };
    }
  }

  const cookie = readCookie(REFERRAL_COOKIE_NAME);
  if (cookie && CODE_PATTERN.test(cookie.trim())) {
    return { code: cookie.trim().toUpperCase(), source: "cookie" };
  }

  return null;
}
