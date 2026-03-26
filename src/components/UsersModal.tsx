"use client";

import { useState, useEffect } from "react";
import { X, User, ArrowRight, CheckCircle } from "lucide-react";
import "./UsersModal.css";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import UserAvatar from "./UserAvatar";
import Link from "next/link";

interface UserProfile {
  uid: string;
  name: string;
  handle: string;
  avatar?: string;
  role?: string;
  verified?: boolean;
}

interface UsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'followers' | 'following';
  targetUid: string;
  title: string;
}

export default function UsersModal({ isOpen, onClose, type, targetUid, title }: UsersModalProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const subColRef = collection(db, "users", targetUid, type);
        const snapshot = await getDocs(subColRef);
        const uids = snapshot.docs.map(doc => doc.id);

        if (uids.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }

        const userDetails: UserProfile[] = [];
        // Fetch each user profile one by one to avoid potential query limits
        // and reuse cache in UserAvatar if needed (though that's for images)
        for (const uid of uids) {
          try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              userDetails.push({
                uid,
                name: data.name || "User",
                handle: data.handle || `@user${uid.slice(0, 4)}`,
                avatar: data.avatar || data.photoURL,
                role: data.role,
                verified: data.verified
              });
            }
          } catch (e) {
            console.error(`Error fetching profile for ${uid}:`, e);
          }
        }

        setUsers(userDetails);
      } catch (error) {
        console.error("Error fetching users list:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, type, targetUid]);

  if (!isOpen) return null;

  return (
    <div className="users-modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="users-modal-content animate-fade-in glass-panel">
        <div className="users-modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="users-modal-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <span>Fetching community...</span>
            </div>
          ) : users.length > 0 ? (
            <div className="users-list">
              {users.map((user) => (
                <Link key={user.uid} href={`/profile/${user.uid}`} className="user-item" onClick={onClose}>
                  <UserAvatar 
                    uid={user.uid} 
                    photoURL={user.avatar} 
                    name={user.name} 
                    className="small" 
                  />
                  <div className="user-details">
                    <div className="user-list-name-row" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="user-name">{user.name}</span>
                      {user.verified && <CheckCircle className="verified-badge" size={14} style={{ color: 'var(--accent-primary)' }} />}
                    </div>
                    <span className="user-handle">{user.handle}</span>
                    {user.role && <span className="user-role-badge">{user.role}</span>}
                  </div>
                  <ArrowRight size={16} style={{ marginLeft: 'auto', opacity: 0.3 }} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <User size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
              <p>No {type} yet found here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
