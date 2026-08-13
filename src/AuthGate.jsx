import {
  ArrowRight,
  CalendarClock,
  Check,
  GitBranch,
  Mail,
  Send,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  firebaseAuthConfigured,
  getAuthErrorMessage,
  observeFirebaseUser,
  profileFromFirebaseUser,
  signInWithGoogle,
  signOutOfFirebase,
} from './firebase.js'

const GUEST_SESSION_KEY = 'arali.sequence-builder.guest'
const guestProfile = {
  id: 'guest-reviewer',
  name: 'Guest reviewer',
  email: '',
  picture: '',
}

function readGuestSession() {
  try {
    return window.sessionStorage.getItem(GUEST_SESSION_KEY) === 'active'
  } catch {
    return false
  }
}

function setGuestSession(active) {
  try {
    if (active) window.sessionStorage.setItem(GUEST_SESSION_KEY, 'active')
    else window.sessionStorage.removeItem(GUEST_SESSION_KEY)
  } catch {
    // Guest review still works in memory when session storage is unavailable.
  }
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="google-logo" viewBox="0 0 24 24">
      <path d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 4.98-.9 6.63-2.42l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.39 13.87A6.02 6.02 0 0 1 6.08 12c0-.65.11-1.28.31-1.87V7.51H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.49l3.35-2.62Z" fill="#FBBC05" />
      <path d="M12 6c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.62C7.18 7.76 9.39 6 12 6Z" fill="#EA4335" />
    </svg>
  )
}

const previewSteps = [
  [CalendarClock, 'Scheduler', 'Every weekday at 9:00 AM', 'scheduler'],
  [UserPlus, 'Enrollment', 'Enroll Alex Morgan', 'enrollment'],
  [GitBranch, 'Exit condition', 'Leave when they reply', 'exit'],
  [Mail, 'Send email', 'Send “Welcome to Acme”', 'email'],
]

function ProductPreview() {
  return (
    <div aria-hidden="true" className="auth-preview">
      <div className="auth-preview__top">
        <span>Welcome sequence</span>
        <span className="auth-preview__ready"><Check size={12} /> Ready</span>
      </div>
      <div className="auth-preview__flow">
        {previewSteps.map(([Icon, label, summary, type], index) => (
          <div className="auth-preview__step-wrap" key={label}>
            <div className="auth-preview__step" data-node-type={type}>
              <span><Icon size={16} /></span>
              <div><small>{label}</small><strong>{summary}</strong></div>
              <Check size={14} />
            </div>
            {index < previewSteps.length - 1 && <span className="auth-preview__line" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function AuthScreen({ busy, error, onGoogleSignIn, onGuest }) {
  return (
    <main className="auth-gate">
      <section className="auth-showcase" aria-label="Sequence Builder overview">
        <div className="auth-brand">
          <span className="brand-mark"><Send size={18} /></span>
          <span><small>Workspace</small><strong>Sequences</strong></span>
        </div>
        <div className="auth-showcase__copy">
          <p className="eyebrow">Workflow sequence builder</p>
          <h2>Turn a thoughtful follow-up into a clear, dependable flow.</h2>
          <p>
            Build an outreach sequence step by step, keep every setting understandable,
            and catch incomplete work before it is ready to run.
          </p>
        </div>
        <ProductPreview />
        <div className="auth-proof">
          <span><Check size={14} /> Guided setup</span>
          <span><Check size={14} /> Local drafts</span>
          <span><Check size={14} /> Clear validation</span>
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-card">
          <span className="auth-card__icon"><ShieldCheck size={22} /></span>
          <p className="auth-card__eyebrow">Secure workspace</p>
          <h1 id="auth-title">Welcome to Sequences</h1>
          <p className="auth-card__intro">
            Continue with your Google account, or enter as a guest without signing in.
          </p>

          <button
            className="google-auth-button"
            disabled={busy}
            onClick={onGoogleSignIn}
            type="button"
          >
            {busy ? <span className="button-spinner" /> : <GoogleLogo />}
            <span>{busy ? 'Connecting to Google…' : 'Continue with Google'}</span>
          </button>

          {!firebaseAuthConfigured && (
            <div className="auth-config-note" role="note">
              <strong>Google sign-in setup is pending</strong>
              <span>You can enter as a guest and explore the complete workflow below.</span>
            </div>
          )}

          {error && <p className="auth-error" role="alert">{error}</p>}

          <div className="auth-divider"><span>or</span></div>

          <button className="guest-auth-button" disabled={busy} onClick={onGuest} type="button">
            Enter as guest <ArrowRight size={16} />
          </button>

          <p className="auth-privacy">
            <ShieldCheck size={14} /> Google sessions are managed by Firebase Authentication.
            Guest mode stores only the sequence draft in this browser.
          </p>
        </div>
      </section>
    </main>
  )
}

export default function AuthGate({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [guest, setGuest] = useState(readGuestSession)
  const [checkingSession, setCheckingSession] = useState(firebaseAuthConfigured)
  const [signingIn, setSigningIn] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (!firebaseAuthConfigured) return undefined

    let active = true
    let unsubscribe

    observeFirebaseUser(
      (user) => {
        if (!active) return
        setFirebaseUser(user)
        setCheckingSession(false)
        if (user) {
          setGuest(false)
          setGuestSession(false)
        }
      },
      (error) => {
        if (!active) return
        setAuthError(getAuthErrorMessage(error))
        setCheckingSession(false)
      },
    ).then((stopObserving) => {
      if (active) unsubscribe = stopObserving
      else stopObserving()
    }).catch((error) => {
      if (!active) return
      setAuthError(getAuthErrorMessage(error))
      setCheckingSession(false)
    })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [])

  const startGoogleSignIn = useCallback(async () => {
    setAuthError('')

    if (!firebaseAuthConfigured) {
      setAuthError(getAuthErrorMessage({ code: 'auth/missing-config' }))
      return
    }

    setSigningIn(true)
    try {
      const result = await signInWithGoogle()
      setFirebaseUser(result.user)
      setGuest(false)
      setGuestSession(false)
    } catch (error) {
      setAuthError(getAuthErrorMessage(error))
    } finally {
      setSigningIn(false)
    }
  }, [])

  const continueAsGuest = useCallback(() => {
    setGuestSession(true)
    setGuest(true)
    setAuthError('')
  }, [])

  const leaveWorkspace = useCallback(async () => {
    setAuthError('')
    if (firebaseUser && firebaseAuthConfigured) {
      try {
        await signOutOfFirebase()
      } catch (error) {
        setAuthError(getAuthErrorMessage(error))
        return
      }
    }
    setFirebaseUser(null)
    setGuest(false)
    setGuestSession(false)
  }, [firebaseUser])

  const firebaseProfile = profileFromFirebaseUser(firebaseUser)
  const profile = firebaseProfile || (guest ? guestProfile : null)
  const authMode = firebaseProfile ? 'firebase' : guest ? 'guest' : null

  if (profile && authMode) {
    return typeof children === 'function'
      ? children({ profile, authMode, isGuest: authMode === 'guest', signOut: leaveWorkspace })
      : children
  }

  return (
    <AuthScreen
      busy={checkingSession || signingIn}
      error={authError}
      onGoogleSignIn={startGoogleSignIn}
      onGuest={continueAsGuest}
    />
  )
}
