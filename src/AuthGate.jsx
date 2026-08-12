import { useCallback, useEffect, useRef, useState } from "react";

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client'
const GOOGLE_SCRIPT_ID = 'google-identity-services'
const PROFILE_STORAGE_KEY = 'sequence-builder.google-profile'

let googleIdentityPromise;

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google.accounts.id);
  }

  if (googleIdentityPromise) {
    return googleIdentityPromise;
  }

  googleIdentityPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    const script = existingScript ?? document.createElement("script");

    const handleLoad = () => {
      if (window.google?.accounts?.id) {
        resolve(window.google.accounts.id);
        return;
      }

      reject(new Error("Google Identity Services loaded without its browser API."));
    };
    const handleError = () => {
      reject(new Error("Google Identity Services could not be loaded."));
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existingScript) {
      script.id = GOOGLE_SCRIPT_ID;
      script.src = GOOGLE_IDENTITY_SCRIPT;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }).catch((error) => {
    googleIdentityPromise = undefined;
    throw error;
  });

  return googleIdentityPromise;
}

function cleanText(value, maximumLength) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function cleanPictureUrl(value) {
  if (typeof value !== "string") return "";

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString().slice(0, 2048) : "";
  } catch {
    return "";
  }
}

function sanitizeProfile(value) {
  if (!value || typeof value !== "object") return null;

  const id = cleanText(value.sub ?? value.id, 160);
  const email = cleanText(value.email, 254);
  const name = cleanText(value.name, 120);

  if (!id || (!email && !name)) return null;

  return {
    id,
    name: name || email,
    email,
    givenName: cleanText(value.given_name ?? value.givenName, 80),
    familyName: cleanText(value.family_name ?? value.familyName, 80),
    picture: cleanPictureUrl(value.picture),
  };
}

function decodeGoogleProfile(credential) {
  if (typeof credential !== "string") return null;

  const encodedPayload = credential.split(".")[1];
  if (!encodedPayload) return null;

  try {
    const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));

    return sanitizeProfile(payload);
  } catch {
    return null;
  }
}

function readStoredProfile() {
  if (typeof window === "undefined") return null;

  try {
    const storedValue = window.sessionStorage.getItem(PROFILE_STORAGE_KEY);
    return storedValue ? sanitizeProfile(JSON.parse(storedValue)) : null;
  } catch {
    return null;
  }
}

function storeProfile(profile) {
  try {
    window.sessionStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // The in-memory session still works when browser storage is unavailable.
  }
}

function clearStoredProfile() {
  try {
    window.sessionStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // There is nothing else to clear when browser storage is unavailable.
  }
}

export default function AuthGate({ children }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const googleButtonRef = useRef(null);
  const [profile, setProfile] = useState(readStoredProfile);
  const [authMode, setAuthMode] = useState(() => profile ? "google" : null);
  const [scriptState, setScriptState] = useState(clientId ? "loading" : "unconfigured");
  const [authError, setAuthError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  const handleGoogleCredential = useCallback((response) => {
    const nextProfile = decodeGoogleProfile(response?.credential);

    if (!nextProfile) {
      setAuthError("Google returned an unreadable profile. Please try again.");
      return;
    }

    // The short-lived credential is deliberately never put in state or storage.
    storeProfile(nextProfile);
    setProfile(nextProfile);
    setAuthMode("google");
    setAuthError("");
  }, []);

  useEffect(() => {
    if (!clientId) return undefined;

    let active = true;
    setScriptState("loading");
    setAuthError("");

    loadGoogleIdentityServices()
      .then((googleIdentity) => {
        if (!active) return;

        googleIdentity.initialize({
          client_id: clientId,
          callback: handleGoogleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleButtonRef.current) {
          googleButtonRef.current.replaceChildren();
          googleIdentity.renderButton(googleButtonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            shape: "rectangular",
            text: "continue_with",
            width: 300,
          });
        }

        setScriptState("ready");
      })
      .catch(() => {
        if (!active) return;
        setScriptState("error");
        setAuthError("Google sign-in is temporarily unavailable. Please retry.");
      });

    return () => {
      active = false;
    };
  }, [clientId, handleGoogleCredential, loadAttempt]);

  const signOut = useCallback(() => {
    window.google?.accounts?.id?.disableAutoSelect();
    clearStoredProfile();
    setProfile(null);
    setAuthMode(null);
    setAuthError("");
  }, []);

  if (authMode) {
    if (typeof children === "function") {
      return children({
        profile,
        authMode,
        isGuest: authMode === "guest",
        signOut,
      });
    }

    return children;
  }

  return (
    <main className="auth-gate">
      <section className="auth-gate__card" aria-labelledby="auth-gate-title">
        <div className="auth-gate__mark" aria-hidden="true">S</div>
        <p className="auth-gate__eyebrow">Sequence workspace</p>
        <h1 id="auth-gate-title">Sign in to build your sequence</h1>
        <p className="auth-gate__intro">
          Continue with Google to open the workflow editor for this browser session.
        </p>

        {clientId ? (
          <div className="auth-gate__google">
            <div ref={googleButtonRef} />
            {scriptState === "loading" ? (
              <p className="auth-gate__status" role="status">Loading secure Google sign-in…</p>
            ) : null}
            {scriptState === "error" ? (
              <button
                className="auth-gate__retry"
                onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                type="button"
              >
                Retry Google sign-in
              </button>
            ) : null}
          </div>
        ) : (
          <div className="auth-gate__demo-option">
            <p>
              Google sign-in is not configured in this review build. You can still inspect the
              assignment without creating an account.
            </p>
            <button
              className="auth-gate__demo-button"
              onClick={() => setAuthMode("guest")}
              type="button"
            >
              Preview the demo
            </button>
            <small>This is guest-only demo access, not a simulated sign-in.</small>
          </div>
        )}

        {authError ? <p className="auth-gate__error" role="alert">{authError}</p> : null}

        <p className="auth-gate__security-note">
          This frontend decodes basic profile details for display only. In production, the Google
          credential must be verified by a trusted backend before granting access.
        </p>
      </section>
    </main>
  );
}
