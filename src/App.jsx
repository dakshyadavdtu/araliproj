import AuthGate from './AuthGate.jsx'
import Builder from './Builder.jsx'

export default function App() {
  return (
    <AuthGate>
      {({ profile, authMode, signOut }) => (
        <Builder
          accountId={profile.id}
          account={{
            ...profile,
            isGuest: authMode === 'guest',
            name: authMode === 'guest' ? 'Guest reviewer' : profile.name,
          }}
          onLeave={signOut}
        />
      )}
    </AuthGate>
  )
}
