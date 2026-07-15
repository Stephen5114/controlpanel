import { useEffect, useRef, useState } from "react";
import { getGoogleAuthConfig } from "../lib/api-auth";

type GoogleCredentialResponse = { credential?: string };

type GoogleAccountsId = {
  initialize(config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void;
  renderButton(element: HTMLElement, options: Record<string, string | number>): void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

let googleScriptPromise: Promise<void> | null = null;
let initializedGoogleClientId: string | null = null;
let activeCredentialCallback: ((response: GoogleCredentialResponse) => void) | null = null;

function loadGoogleIdentityScript() {
  if (window.google?.accounts.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    const script = existing ?? document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      googleScriptPromise = null;
      reject(new Error("Google sign-in could not be loaded."));
    };
    if (!existing) document.head.appendChild(script);
  });

  return googleScriptPromise;
}

type Props = {
  locale: string;
  dividerLabel: string;
  onCredential: (credential: string) => void;
  onError: (message: string) => void;
};

export function GoogleSignInButton({ locale, dividerLabel, onCredential, onError }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const credentialHandlerRef = useRef(onCredential);
  const errorHandlerRef = useRef(onError);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    credentialHandlerRef.current = onCredential;
    errorHandlerRef.current = onError;
  }, [onCredential, onError]);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const config = await getGoogleAuthConfig();
        if (cancelled || !config.enabled || !config.clientId) return;

        await loadGoogleIdentityScript();
        if (cancelled || !window.google?.accounts.id || !buttonRef.current) return;

        setEnabled(true);
        buttonRef.current.replaceChildren();
        activeCredentialCallback = (response) => {
          if (response.credential) credentialHandlerRef.current(response.credential);
          else errorHandlerRef.current("Google sign-in did not return a credential.");
        };
        if (initializedGoogleClientId !== config.clientId) {
          window.google.accounts.id.initialize({
            client_id: config.clientId,
            callback: (response) => activeCredentialCallback?.(response),
          });
          initializedGoogleClientId = config.clientId;
        }
        const localeCode = locale.toLowerCase();
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: Math.min(384, buttonRef.current.clientWidth || 384),
          locale: localeCode === "zh" ? "zh_CN" : localeCode,
        });
      } catch (error) {
        if (!cancelled) {
          errorHandlerRef.current(error instanceof Error ? error.message : "Google sign-in could not be loaded.");
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
      buttonRef.current?.replaceChildren();
    };
  }, [locale]);

  return (
    <>
      <div className={enabled ? "google-sign-in" : "google-sign-in google-sign-in--loading"} ref={buttonRef} />
      {enabled ? <div className="auth-divider"><span>{dividerLabel}</span></div> : null}
    </>
  );
}
