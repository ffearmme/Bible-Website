"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User 
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  userProfile: any | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  userProfile: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          // Fetch or create profile in Firestore
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const profileData = docSnap.data();
            
            // Auto-correct old placeholder date if present
            if (profileData.joinedDate === "January 1274") {
              const actualDate = user.metadata.creationTime 
                ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                : new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
              
              await setDoc(docRef, { joinedDate: actualDate }, { merge: true });
              profileData.joinedDate = actualDate;
            }
            
            setUserProfile(profileData);
          } else {
            // Create initial profile if it doesn't exist
            const initialProfile = {
              name: user.displayName || "New User",
              handle: `@${user.displayName?.toLowerCase().replace(/\s+/g, "") || "user"}`,
              role: "Scholar",
              bio: "Welcome to my profile!",
              avatar: user.photoURL || "",
              banner: "",
              joinedDate: user.metadata.creationTime 
                ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                : new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
              stats: {
                posts: 0,
                following: 0,
                followers: 0,
              },
              verified: false,
            };
            await setDoc(docRef, initialProfile);
            setUserProfile(initialProfile);
          }
        } catch (error) {
          console.error("Firestore initialization error:", error);
          // Fallback to local profile or empty if Firestore is blocked
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, userProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
