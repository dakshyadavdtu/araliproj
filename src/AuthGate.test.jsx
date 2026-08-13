// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const firebaseMocks = vi.hoisted(() => ({
  observeFirebaseUser: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOutOfFirebase: vi.fn(),
}))

vi.mock('./firebase.js', () => ({
  firebaseAuthConfigured: true,
  getAuthErrorMessage: (error) => error?.code === 'auth/popup-blocked'
    ? 'Your browser blocked the Google sign-in window. Allow pop-ups and try again.'
    : 'Google sign-in could not be completed. Please try again.',
  observeFirebaseUser: firebaseMocks.observeFirebaseUser,
  profileFromFirebaseUser: (user) => user?.uid ? ({
    id: user.uid,
    name: user.displayName || user.email || 'Google user',
    email: user.email || '',
    picture: user.photoURL || '',
  }) : null,
  signInWithGoogle: firebaseMocks.signInWithGoogle,
  signOutOfFirebase: firebaseMocks.signOutOfFirebase,
}))

import AuthGate from './AuthGate.jsx'

function renderAuthGate() {
  return render(
    <AuthGate>
      {({ profile, signOut }) => (
        <main>
          <h1>Signed in as {profile.name}</h1>
          <button onClick={signOut} type="button">Sign out</button>
        </main>
      )}
    </AuthGate>,
  )
}

beforeEach(() => {
  firebaseMocks.observeFirebaseUser.mockImplementation(async (onUser) => {
    onUser(null)
    return vi.fn()
  })
  firebaseMocks.signInWithGoogle.mockResolvedValue({
    user: {
      uid: 'firebase-user-1',
      displayName: 'Alex Morgan',
      email: 'alex@example.com',
      photoURL: 'https://example.com/alex.jpg',
    },
  })
  firebaseMocks.signOutOfFirebase.mockResolvedValue()
})

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.clearAllMocks()
})

describe('Firebase Google authentication', () => {
  it('signs in with Google and signs out through Firebase', async () => {
    const user = userEvent.setup()
    renderAuthGate()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect(await screen.findByRole('heading', { name: 'Signed in as Alex Morgan' })).toBeInTheDocument()
    expect(firebaseMocks.signInWithGoogle).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(firebaseMocks.signOutOfFirebase).toHaveBeenCalledOnce()
    expect(await screen.findByRole('heading', { name: 'Welcome to Sequences' })).toBeInTheDocument()
  })

  it('shows a useful Firebase sign-in error', async () => {
    const user = userEvent.setup()
    firebaseMocks.signInWithGoogle.mockRejectedValueOnce({ code: 'auth/popup-blocked' })
    renderAuthGate()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('browser blocked the Google sign-in window')
  })
})
