const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let servicesPromise;

const getFirebaseServices = async () => {
  if (!isFirebaseConfigured) throw new Error('Firebase is not configured yet.');
  if (!servicesPromise) {
    servicesPromise = Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]).then(([appModule, authModule, firestoreModule]) => {
      const app = appModule.initializeApp(firebaseConfig);
      const auth = authModule.getAuth(app);
      const db = firestoreModule.getFirestore(app);
      const googleProvider = new authModule.GoogleAuthProvider();
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      return { auth, authModule, db, firestoreModule, googleProvider };
    });
  }
  return servicesPromise;
};

export const prepareFirebaseAuth = async () => {
  if (isFirebaseConfigured) await getFirebaseServices();
};

export const observeAuth = (callback) => {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }

  let active = true;
  let unsubscribe = () => {};
  getFirebaseServices()
    .then(({ auth, authModule }) => {
      if (active) unsubscribe = authModule.onAuthStateChanged(auth, callback);
    })
    .catch((error) => {
      console.error('Failed to initialize Firebase', error);
      if (active) callback(null);
    });

  return () => {
    active = false;
    unsubscribe();
  };
};

export const signInWithGoogle = async () => {
  const { auth, authModule, googleProvider } = await getFirebaseServices();
  await authModule.signInWithPopup(auth, googleProvider);
};

export const signInWithEmail = async (email, password) => {
  const { auth, authModule } = await getFirebaseServices();
  await authModule.signInWithEmailAndPassword(auth, email, password);
};

export const createEmailAccount = async (email, password) => {
  const { auth, authModule } = await getFirebaseServices();
  await authModule.createUserWithEmailAndPassword(auth, email, password);
};

export const signOutUser = async () => {
  if (!isFirebaseConfigured) return;
  const { auth, authModule } = await getFirebaseServices();
  await authModule.signOut(auth);
};

export const getUserDiagrams = async (userId) => {
  const { db, firestoreModule } = await getFirebaseServices();
  const diagramsRef = firestoreModule.collection(db, 'users', userId, 'diagrams');
  const diagramsQuery = firestoreModule.query(diagramsRef, firestoreModule.orderBy('timestamp', 'desc'));
  const snapshot = await firestoreModule.getDocs(diagramsQuery);
  return snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
};

export const saveUserDiagram = async (userId, diagram) => {
  const { db, firestoreModule } = await getFirebaseServices();
  const diagramWithStringId = { ...diagram, id: String(diagram.id) };
  const diagramRef = firestoreModule.doc(db, 'users', userId, 'diagrams', diagramWithStringId.id);
  await firestoreModule.setDoc(diagramRef, diagramWithStringId);
};

export const deleteUserDiagram = async (userId, diagramId) => {
  const { db, firestoreModule } = await getFirebaseServices();
  const diagramRef = firestoreModule.doc(db, 'users', userId, 'diagrams', String(diagramId));
  await firestoreModule.deleteDoc(diagramRef);
};
