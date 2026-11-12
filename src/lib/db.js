// Molndatabas: Firestore i användarens Firebase-projekt.
// Tre samlingar: "stryktipset" och "europatipset" (en sparad omgång per dokument)
// samt "nille" (Nilles rader och utfall). Webb-configen är publik per design –
// åtkomsten styrs av Firestore-reglerna.
import { initializeApp } from 'firebase/app'
import {
  getFirestore, collection, doc, setDoc, getDocs, query, orderBy, limit,
} from 'firebase/firestore'
import { flattenRounds } from './model.js'

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

export async function saveDocTo(col, payload) {
  await setDoc(doc(fsdb, col, payload.id), payload)
}

export async function loadCol(col) {
  const snap = await getDocs(query(collection(fsdb, col), orderBy('savedAt', 'desc'), limit(300)))
  return snap.docs.map((d) => d.data())
}

// Historiken som modellen räknar på: alla sparade matcher per spelform.
export async function loadAllHistory() {
  const [stryk, euro] = await Promise.all([loadCol('stryktipset'), loadCol('europatipset')])
  return {
    stryktipset: flattenRounds(stryk, 'stryktipset'),
    europatipset: flattenRounds(euro, 'europatipset'),
    rounds: { stryktipset: stryk, europatipset: euro },
  }
}
