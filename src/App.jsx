import AuthGate from './AuthGate.jsx'

export default function App() {
  return (
    <AuthGate>
      {({ profile, authMode, signOut }) => (
        <main className="auth-gate">
          <section className="auth-gate__card">
            <p className="auth-gate__eyebrow">Sequence workspace</p>
            <h1>{authMode === 'guest' ? 'Demo access is ready' : `Welcome, ${profile.name}`}</h1>
            <p className="auth-gate__intro">Your workflow workspace is ready for this browser session.</p>
            <button className="auth-gate__retry" onClick={signOut} type="button">
              {authMode === 'guest' ? 'Exit demo' : 'Sign out'}
            </button>
          </section>
        </main>
      )}
    </AuthGate>
  )
}
