// Molndatabas: Firestore i användarens Firebase-projekt.
// Webb-configen är publik per design – åtkomsten styrs av Firestore-reglerna.
import { initializeApp } from 'firebase/app'
import {
  getFirestore, collection, doc, setDoc, getDocs, query, orderBy, limit,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCbhJNsZAe1FJytUebXIaK6ps7nnfTe6v0',
  authDomain: 'hejy-5dac4.firebaseapp.com',
  projectId: 'hejy-5dac4',
  storageBucket: 'hejy-5dac4.firebasestorage.app',
  messagingSenderId: '221085059468',
  appId: '1:221085059468:web:8e4bc02a858562bc3b6ea9',
}

const app = initializeApp(firebaseConfig)
const fsdb = getFirestore(app)

// En sparad omgång = ett dokument i samlingen "omgangar"
export async function saveRoundToCloud(payload) {
  await setDoc(doc(fsdb, 'omgangar', payload.id), payload)
}

export async function loadRoundsFromCloud() {
  const snap = await getDocs(
    query(collection(fsdb, 'omgangar'), orderBy('savedAt', 'desc'), limit(200)),
  )
  return snap.docs.map((d) => d.data())
}
