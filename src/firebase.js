const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim(),
}

const requiredConfigKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
]

function isRealConfigValue(value) {
  return Boolean(value) && !/^(replace-|your-)/i.test(value)
}

export function isCompleteFirebaseConfig(config) {
  return requiredConfigKeys.every((key) => isRealConfigValue(config[key]))
}

export const firebaseAuthConfigured = isCompleteFirebaseConfig(firebaseConfig)

let firebaseClientPromise

async function getFirebaseClient() {
  if (!firebaseAuthConfigured) {
    const error = new Error('Firebase Authentication is not configured.')
    error.code = 'auth/missing-config'
    throw error
  }

  if (!firebaseClientPromise) {
    firebaseClientPromise = Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
    ]).then(async ([appModule, authModule]) => {
      const app = appModule.getApps().length
        ? appModule.getApp()
        : appModule.initializeApp(firebaseConfig)
      const auth = authModule.getAuth(app)
      auth.useDeviceLanguage()
      await authModule.setPersistence(auth, authModule.browserLocalPersistence)

      return { auth, authModule }
    })
  }

  return firebaseClientPromise
}

export async function observeFirebaseUser(onUser, onError) {
  const { auth, authModule } = await getFirebaseClient()
  return authModule.onAuthStateChanged(auth, onUser, onError)
}

export async function signInWithGoogle() {
  const { auth, authModule } = await getFirebaseClient()
  const provider = new authModule.GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return authModule.signInWithPopup(auth, provider)
}

export async function signOutOfFirebase() {
  const { auth, authModule } = await getFirebaseClient()
  return authModule.signOut(auth)
}

export function getAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/popup-closed-by-user':
      return 'The Google sign-in window was closed before sign-in finished.'
    case 'auth/cancelled-popup-request':
      return 'Another sign-in attempt is already open.'
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Allow pop-ups and try again.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Authentication.'
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled for this Firebase project.'
    case 'auth/network-request-failed':
      return 'Google sign-in could not reach the network. Check your connection and try again.'
    case 'auth/too-many-requests':
      return 'Sign-in is temporarily limited after too many attempts. Please try again later.'
    case 'auth/missing-config':
      return 'Google sign-in is not available in this demo yet. Continue to the assignment demo below.'
    default:
      return 'Google sign-in could not be completed. Please try again.'
  }
}

function cleanText(value, maximumLength) {
  return typeof value === 'string' ? value.trim().slice(0, maximumLength) : ''
}

function cleanPictureUrl(value) {
  if (typeof value !== 'string') return ''

  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString().slice(0, 2048) : ''
  } catch {
    return ''
  }
}

export function profileFromFirebaseUser(user) {
  if (!user?.uid) return null

  const email = cleanText(user.email, 254)
  const name = cleanText(user.displayName, 120) || email || 'Google user'

  return {
    id: cleanText(user.uid, 160),
    name,
    email,
    picture: cleanPictureUrl(user.photoURL),
  }
}
