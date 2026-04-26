export const firebaseConfig = {
  apiKey: "AIzaSyDqprWRx0xnOpnPB00Kc8ftEW4Nq24U7hU",
  authDomain: "matchflow-27524298-12d64.firebaseapp.com",
  databaseURL: "https://matchflow-27524298-12d64-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "matchflow-27524298-12d64",
  storageBucket: "matchflow-27524298-12d64.firebasestorage.app",
  messagingSenderId: "469500415820",
  appId: "1:469500415820:web:f3882b3f9b4d8ffb20c9e9"
};

export const isFirebaseConfigValid = () => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId
  );
};
