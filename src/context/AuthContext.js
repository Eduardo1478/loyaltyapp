import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { registerPushToken } from '../config/notifications';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  // null  = not yet checked / not applicable
  // true  = business doc exists
  // false = business_owner with no business doc yet
  const [hasBusinessProfile, setHasBusinessProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          const fetchedRole = snap.exists() ? snap.data().role : null;
          setRole(fetchedRole);

          if (fetchedRole === 'business_owner') {
            const bizSnap = await getDocs(
              query(collection(db, 'businesses'), where('ownerId', '==', u.uid))
            );
            setHasBusinessProfile(!bizSnap.empty);
          } else {
            setHasBusinessProfile(null);
          }
        } catch {
          setRole(null);
          setHasBusinessProfile(null);
        }
        setUser(u);
        // Register push token on every login — no-op if already up to date or on simulator
        registerPushToken(u.uid);
      } else {
        setUser(null);
        setRole(null);
        setHasBusinessProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Called after a business owner creates their profile so Navigation re-routes
  // without requiring a sign-out / sign-in cycle.
  async function refreshBusinessProfile() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const bizSnap = await getDocs(
        query(collection(db, 'businesses'), where('ownerId', '==', currentUser.uid))
      );
      setHasBusinessProfile(!bizSnap.empty);
    } catch {
      // Keep existing value on error — dashboard will handle the missing doc
    }
  }

  return (
    <AuthContext.Provider value={{ user, role, hasBusinessProfile, loading, refreshBusinessProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
