import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const useFirebase = (firebaseConfig, initialAuthToken) => {
    const [dbInstance, setDbInstance] = useState(null);
    const [userId, setUserId] = useState('...');

    useEffect(() => {
        const initFirebase = async () => {
            try {
                const app = initializeApp(firebaseConfig);
                const auth = getAuth(app);
                const db = getFirestore(app);
                
                setDbInstance(db);

                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        setUserId(user.uid);
                    } else if (initialAuthToken) {
                        const userCred = await signInWithCustomToken(auth, initialAuthToken);
                        setUserId(userCred.user.uid);
                    } else {
                        const userCred = await signInAnonymously(auth);
                        setUserId(userCred.user.uid);
                    }
                });
            } catch (err) {
                console.error("Firebase Initialization Error:", err);
                setUserId('auth-failed-' + (crypto.randomUUID ? crypto.randomUUID() : 'default'));
            }
        };

        if (Object.keys(firebaseConfig).length > 0) {
            initFirebase();
        } else {
            setUserId('mock-user-id-12345');
        }
    }, [firebaseConfig, initialAuthToken]);

    return { dbInstance, userId };
};

export default useFirebase;