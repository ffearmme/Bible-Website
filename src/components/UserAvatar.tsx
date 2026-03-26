"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface UserAvatarProps {
  uid: string;
  initials?: string;
  photoURL?: string;
  name?: string;
  size?: number;
  className?: string;
}

// Simple in-memory cache to avoid redundant fetches
const profileCache = new Map<string, string>();

export default function UserAvatar({ 
  uid, 
  initials, 
  photoURL, 
  name = "User", 
  className = "" 
}: UserAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(photoURL || profileCache.get(uid));
  const [imageLoaded, setImageLoaded] = useState(false);

  const getInitials = (n: string) => {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    const res = (parts[0][0] + parts[1][0]).toUpperCase();
    // Explicitly avoid "NA" to prevent confusion with "Not Available" glitch
    return res === "NA" ? parts[0][0].toUpperCase() : res;
  };

  const finalInitials = (initials && initials.length <= 2 && initials.toUpperCase() !== "NA") 
    ? initials 
    : getInitials(name);

  useEffect(() => {
    // Reset image loaded if url changes
    if (photoURL !== avatarUrl) {
      setImageLoaded(false);
      setAvatarUrl(photoURL);
    }
  }, [photoURL]);

  useEffect(() => {
    if (avatarUrl) return;

    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const fetchedUrl = data.avatar || data.photoURL;
          if (fetchedUrl) {
            setAvatarUrl(fetchedUrl);
            profileCache.set(uid, fetchedUrl);
          }
        }
      } catch (error) {
        console.error("Error fetching user avatar:", error);
      }
    };

    fetchProfile();
  }, [uid, avatarUrl]);

  return (
    <div className={`avatar flex-center ${className}`}>
      {avatarUrl && (
        <img 
          src={avatarUrl} 
          alt="" 
          className={`avatar-img ${imageLoaded ? "loaded" : "loading"}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setAvatarUrl(undefined)} 
          style={{ display: imageLoaded ? "block" : "none" }}
        />
      )}
      {!imageLoaded && <span>{finalInitials}</span>}
    </div>
  );
}
