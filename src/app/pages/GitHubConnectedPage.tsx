import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export function GitHubConnectedPage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");
  const login = searchParams.get("login");
  const error = searchParams.get("error");

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage(
        { type: "github-oauth-result", status, login, error },
        window.location.origin,
      );
      window.close();
    }
  }, [status, login, error]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Inter, sans-serif", color: "#334155" }}>
      {status === "success" ? (
        <>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <p style={{ fontWeight: 600 }}>GitHub connected as <strong>{login}</strong></p>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>You can close this window.</p>
        </>
      ) : (
        <>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✗</div>
          <p style={{ fontWeight: 600 }}>Connection failed</p>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>{error ?? "Unknown error"}</p>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>You can close this window.</p>
        </>
      )}
    </div>
  );
}
