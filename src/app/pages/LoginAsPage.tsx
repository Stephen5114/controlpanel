import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getCustomerProfile } from "../lib/customer-api";
import { clearCustomerSession, readJwtPayload, saveCustomerSession } from "../lib/customer-session";

function readStringClaim(payload: Record<string, unknown> | null, name: string) {
  const value = payload?.[name];
  return typeof value === "string" ? value : null;
}

export function LoginAsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const token = searchParams.get("token")?.trim();
      if (!token) {
        setError("Missing customer access token.");
        return;
      }

      const payload = readJwtPayload(token);
      const customerId = readStringClaim(payload, "sub") ?? readStringClaim(payload, "nameid");
      const email = readStringClaim(payload, "email") ?? "";

      if (!customerId) {
        setError("This customer access token is invalid.");
        return;
      }

      const session = {
        customerId,
        email,
        token,
        impersonated: readStringClaim(payload, "impersonated") === "true",
        staffEmail: readStringClaim(payload, "staffEmail"),
        staffRole: readStringClaim(payload, "staffRole"),
        impersonationExpiresUtc: typeof payload?.exp === "number" ? new Date(payload.exp * 1000).toISOString() : null,
      };

      try {
        saveCustomerSession(session);
        const profile = await getCustomerProfile(session);
        if (cancelled) return;

        saveCustomerSession({ ...session, email: profile.email });
        navigate("/", { replace: true });
      } catch {
        clearCustomerSession();
        if (!cancelled) {
          setError("This customer access token is invalid or expired.");
          window.history.replaceState(null, "", "/login-as");
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  return (
    <div className="auth-shell">
      <div className="auth-card auth-card--compact">
        <p className="eyebrow">Staff access</p>
        <h1>Opening customer account</h1>
        <p className="page-copy">Validating the short-lived staff access session.</p>
        {error ? <div className="inline-message inline-message--error">{error}</div> : null}
        {error ? (
          <p className="auth-footnote">
            <Link to="/login">Return to customer login</Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
