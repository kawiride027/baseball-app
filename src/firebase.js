import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDqNRPsS3J_14pPDLMq1hf9phKWNDifmsE",
  authDomain: "baseball-app-2625c.firebaseapp.com",
  projectId: "baseball-app-2625c",
  storageBucket: "baseball-app-2625c.firebasestorage.app",
  messagingSenderId: "81583618810",
  appId: "1:81583618810:web:b7b883920101a5700ba743",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Enable offline persistence so the app works without wifi
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open — only one can use offline persistence
    console.warn('Firestore persistence failed: multiple tabs open')
  } else if (err.code === 'unimplemented') {
    // Browser doesn't support offline persistence
    console.warn('Firestore persistence not available in this browser')
  }
})

export { db }
