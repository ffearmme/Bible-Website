"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle, Calendar, MessageSquare, Users, Bookmark, X, Image as ImageIcon, Trash2, LogIn, LogOut } from "lucide-react";
import "./profile.css";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";

const DEFAULT_PROFILE = {
  name: "Dr. Thomas Aquinas",
  handle: "@taquinas",
  role: "Systematic Theologian",
  bio: "Exploring the intersection of reason and faith. Scholar of the Word and the World. Seeking truth in all things.",
  location: "Vatican City",
  joinedDate: "January 1274",
  stats: {
    posts: 42,
    following: 128,
    followers: "12.4K"
  },
  verified: true,
  avatar: "",
  banner: ""
};
export default function ProfilePage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading, login, logout } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(DEFAULT_PROFILE);
  const [activeTab, setActiveTab] = useState("posts");
  const [reflections, setReflections] = useState<any[]>([]);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Sync data from Firestore
  useEffect(() => {
    if (!user) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

    // Listen to Reflections
    const reflectionsRef = collection(db, "users", user.uid, "reflections");
    const unsubReflections = onSnapshot(reflectionsRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReflections(items);
    }, (error) => {
      console.error("Reflections listener error:", error);
    });

    // Listen to Saved Items
    const savedRef = collection(db, "users", user.uid, "saved_items");
    const unsubSaved = onSnapshot(savedRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedItems(items);
      setDataLoading(false);
    }, (error) => {
      console.error("Saved items listener error:", error);
      setDataLoading(false);
    });

    // Listen to Followers
    const followersRef = collection(db, "users", user.uid, "followers");
    const unsubFollowers = onSnapshot(followersRef, (snapshot) => {
      setFollowerCount(snapshot.size);
    }, (error) => {
      console.error("Followers listener error:", error);
    });

    // Listen to Following
    const followingRef = collection(db, "users", user.uid, "following");
    const unsubFollowing = onSnapshot(followingRef, (snapshot) => {
      setFollowingCount(snapshot.size);
    }, (error) => {
      console.error("Following listener error:", error);
    });

    return () => {
      unsubReflections();
      unsubSaved();
      unsubFollowers();
      unsubFollowing();
    };
  }, [user]);

  const profile = userProfile || DEFAULT_PROFILE;

  const deleteReflection = async (id: string | number) => {
    if (!user) {
      const updated = reflections.filter(r => r.id !== id);
      setReflections(updated);
      localStorage.setItem("userReflections", JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, "users", user.uid, "reflections", id.toString()));
    } catch (e) {
      console.error("Error deleting reflection:", e);
    }
  };

  const unsaveItem = async (id: string | number) => {
    if (!user) {
      const updated = savedItems.filter(s => s.id !== id);
      setSavedItems(updated);
      localStorage.setItem("userSaved", JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, "users", user.uid, "saved_items", id.toString()));
    } catch (e) {
      console.error("Error unsaving item:", e);
    }
  };

  const [error, setError] = useState<string | null>(null);

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64, type === 'banner' ? 1000 : 400, type === 'banner' ? 300 : 400);
        setEditForm(prev => ({ ...prev, [type]: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!user) {
      localStorage.setItem("userProfile", JSON.stringify(editForm));
      setIsEditModalOpen(false);
      return;
    }
    
    try {
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, editForm);
      setIsEditModalOpen(false);
    } catch (e: any) {
      console.error("Error updating profile:", e);
      if (e.message?.includes("longer than")) {
        setError("Image size exceeds limit. Try a smaller file.");
      } else {
        setError(`Error: ${e.code || "unknown"}`);
      }
    }
  };

  const getInitials = (name: string) => {
    if (!name || name.trim() === "") return "U";
    const initials = name.split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return (initials && initials !== "NA") ? initials : initials || "U";
  };

  const goToBible = (source: string) => {
    try {
      // source is "John 1:1" or "1 Samuel 1:1" or "Genesis 1:1-5"
      // Last space separates book from chapter:verse
      const lastSpaceIndex = source.lastIndexOf(' ');
      if (lastSpaceIndex === -1) return;

      const book = source.substring(0, lastSpaceIndex);
      const rest = source.substring(lastSpaceIndex + 1);
      const [chapter, verses] = rest.split(':');
      if (!chapter || !verses) return;

      const [startVerse] = verses.split('-');
      
      router.push(`/bible?book=${encodeURIComponent(book)}&chapter=${chapter}&verse=${startVerse}`);
    } catch (e) {
      console.error("Failed to parse source for navigation:", e);
    }
  };

  if (authLoading) {
    return <div className="profile-loading">Loading account...</div>;
  }

  if (!user) {
    return (
      <div className="profile-container flex-center" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="login-prompt glass-panel animate-fade-in" style={{ padding: '3rem', textAlign: 'center', maxWidth: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="login-icon-wrapper" style={{ background: 'var(--accent-glow)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
            <LogIn size={40} className="text-accent" />
          </div>
          <h2 className="heading-1" style={{ marginBottom: '1rem', fontSize: '1.75rem' }}>Your Biblical Journey</h2>
          <p className="text-muted" style={{ marginBottom: '2.5rem', lineHeight: '1.6' }}>
            Join our community of scholars to sync your saved verses, share reflections, and track your study progress across all your devices.
          </p>
          <button className="login-button large" onClick={login} style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '1rem', fontWeight: '600', background: 'white', color: 'black', border: 'none', cursor: 'pointer' }}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/smartlock/google.svg" alt="" style={{ width: '20px' }} />
            <span>Sign In with Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container animate-fade-in">
      <div className="profile-header glass-panel">
        <div 
          className="profile-banner" 
          style={profile.banner ? { backgroundImage: `url(${profile.banner})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        ></div>
        <div className="profile-info-section">
          <div className="profile-avatar-wrapper">
            <UserAvatar 
              uid={user.uid} 
              photoURL={profile.avatar} 
              name={profile.name} 
              className="profile-avatar" 
            />
            <div className="profile-actions-row">
              {user ? (
                <>
                  <button 
                    className="edit-profile-button"
                    onClick={() => {
                      setEditForm({ ...profile });
                      setIsEditModalOpen(true);
                    }}
                  >
                    Edit Profile
                  </button>
                  <button className="logout-button" onClick={logout} title="Sign Out">
                    <LogOut size={18} />
                  </button>
                </>
              ) : (
                <button className="login-button" onClick={login}>
                  <LogIn size={18} />
                  <span>Sign In with Google</span>
                </button>
              )}
            </div>
          </div>

          <div className="profile-meta">
            <div className="profile-name-row">
              <h1 className="profile-name">{profile.name}</h1>
              {profile.verified && <CheckCircle className="verified-badge" size={20} />}
            </div>
            <div className="profile-handle-row">
              <span className="profile-handle">{profile.handle}</span>
              <span className="role-pill">{profile.role}</span>
            </div>
            <p className="profile-bio">{profile.bio}</p>
            
            <div className="profile-details">
              <div className="detail-item">
                <Calendar size={16} />
                <span>Joined {profile.joinedDate}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-stats-row border-top">
          <div className="stat-item">
            <span className="stat-value">{reflections.length}</span>
            <span className="stat-label">Posts</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{followingCount}</span>
            <span className="stat-label">Following</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{followerCount}</span>
            <span className="stat-label">Followers</span>
          </div>
        </div>
      </div>

      <div className="profile-tabs-wrapper">
        <div className="profile-tabs">
          <button 
            className={`tab-item ${activeTab === "posts" ? "active" : ""}`}
            onClick={() => setActiveTab("posts")}
          >
            <MessageSquare size={18} />
            <span>Posts</span>
          </button>
          <button 
            className={`tab-item ${activeTab === "saved" ? "active" : ""}`}
            onClick={() => setActiveTab("saved")}
          >
            <Bookmark size={18} />
            <span>Saved</span>
          </button>
        </div>
      </div>

      <div className="profile-content">
        {(activeTab === "posts" || activeTab === "reflections") && (
          <div className="profile-feed animate-fade-in">
            {reflections.length > 0 ? reflections.map(r => (
              <div key={r.id} className="feed-item glass-panel">
                <div className="feed-item-header">
                  <div className="header-meta">
                    <span className="reflection-tag">{r.tag}</span>
                    <span className="feed-item-date">{r.date}</span>
                  </div>
                  <button className="delete-action" onClick={() => deleteReflection(r.id)} title="Delete reflection">
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3 className="reflection-title">{r.title}</h3>
                <p className="feed-item-text">{r.text}</p>
                <div className="feed-item-footer">
                  <button className="feed-action">Read more</button>
                </div>
              </div>
            )) : (
              <div className="empty-state glass-panel">
                <p className="text-muted">No posts yet from {profile.name}.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "saved" && (
          <div className="profile-feed animate-fade-in">
            {savedItems.length > 0 ? savedItems.map(s => (
              <div key={s.id} className="feed-item glass-panel">
                <div className="feed-item-header">
                  <div className="header-meta">
                    <span className="saved-tag">{s.tag}</span>
                    <span className="feed-item-date">{s.date}</span>
                  </div>
                  <button className="delete-action" onClick={() => unsaveItem(s.id)} title="Unsave item">
                    <Trash2 size={16} />
                  </button>
                </div>
                {s.type === "scripture" ? (
                  <p className="scripture-quote">"{s.content}" — {s.source}</p>
                ) : (
                  <p className="feed-item-text">"{s.content}" — {s.source}</p>
                )}
                <div className="feed-item-footer">
                  <button 
                    className="feed-action"
                    onClick={() => s.type === "scripture" ? goToBible(s.source) : null}
                  >
                    {s.type === "scripture" ? "Go to Bible" : "View Context"}
                  </button>
                </div>
              </div>
            )) : (
              <div className="empty-state glass-panel">
                <p className="text-muted">No items saved yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <div className="modal-header">
              <div className="modal-header-left">
                <button className="close-button" onClick={() => setIsEditModalOpen(false)}>
                  <X size={20} />
                </button>
                <h2 className="modal-title">Edit Profile</h2>
              </div>
              <button className="save-button" onClick={handleSave}>Save</button>
            </div>

            <div className="modal-body">
              {error && (
                <div className="modal-error-badge">
                  <span>{error}</span>
                </div>
              )}
              <input 
                type="file" 
                ref={bannerInputRef} 
                style={{ display: 'none' }} 
                accept="image/*"
                onChange={(e) => handleImageChange(e, 'banner')}
              />
              <div 
                className="edit-banner-preview"
                style={editForm.banner ? { backgroundImage: `url(${editForm.banner})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              >
                <button className="change-banner-button" onClick={() => bannerInputRef.current?.click()}>
                  <ImageIcon size={24} />
                </button>
              </div>
              
              <div className="edit-avatar-preview">
                <input 
                  type="file" 
                  ref={avatarInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, 'avatar')}
                />
                <div className="edit-avatar">
                  {editForm.avatar ? (
                    <img src={editForm.avatar} alt="Preview" className="avatar-img" />
                  ) : (
                    <span className="avatar-initials">{getInitials(editForm.name)}</span>
                  )}
                </div>
                <button className="change-avatar-button" onClick={() => avatarInputRef.current?.click()}>
                  <ImageIcon size={20} />
                </button>
              </div>

              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  placeholder="Your scholarly name"
                />
              </div>

              <div className="form-group">
                <label>Handle</label>
                <input 
                  type="text" 
                  value={editForm.handle} 
                  onChange={(e) => setEditForm({...editForm, handle: e.target.value})}
                  placeholder="@handle"
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <input 
                  type="text" 
                  value={editForm.role} 
                  onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                  placeholder="e.g. Systematic Theologian"
                />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea 
                  value={editForm.bio} 
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                  placeholder="Tell us about your studies..."
                  rows={4}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
