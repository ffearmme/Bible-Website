"use client";

import { useState, useEffect, use } from "react";
import { CheckCircle, Calendar, MessageSquare, Plus, LogIn, ChevronLeft } from "lucide-react";
import "../profile.css";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import UsersModal from "@/components/UsersModal";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp 
} from "firebase/firestore";
import Link from "next/link";

const DEFAULT_PROFILE = {
  name: "Bible Scholar",
  handle: "@scholar",
  role: "Bible Student",
  bio: "Exploring the Word of God.",
  location: "World",
  joinedDate: "January 2024",
  verified: false,
  avatar: "",
  banner: ""
};

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: profileUid } = use(params);
  const router = useRouter();
  const { user, login } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [reflections, setReflections] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Stats Modal State
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'followers' | 'following'>('followers');
  const [modalTitle, setModalTitle] = useState("");

  useEffect(() => {
    if (!profileUid) return;

    // Fetch User Profile
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "users", profileUid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        } else {
          setProfile(DEFAULT_PROFILE);
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
        setProfile(DEFAULT_PROFILE);
      }
    };

    fetchProfile();

    // Listen to Reflections (Public ones)
    const reflectionsRef = collection(db, "users", profileUid, "reflections");
    const unsubReflections = onSnapshot(reflectionsRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReflections(items);
    });

    // Listen to Followers
    const followersRef = collection(db, "users", profileUid, "followers");
    const unsubFollowers = onSnapshot(followersRef, (snapshot) => {
      setFollowerCount(snapshot.size);
      if (user) {
        setIsFollowing(snapshot.docs.some(doc => doc.id === user.uid));
      }
    });

    // Listen to Following
    const followingRef = collection(db, "users", profileUid, "following");
    const unsubFollowing = onSnapshot(followingRef, (snapshot) => {
      setFollowingCount(snapshot.size);
      setLoading(false);
    });

    return () => {
      unsubReflections();
      unsubFollowers();
      unsubFollowing();
    };
  }, [profileUid, user]);

  const handleFollow = async () => {
    if (!user) {
      login();
      return;
    }
    if (user.uid === profileUid) return;

    try {
      if (isFollowing) {
        await deleteDoc(doc(db, "users", user.uid, "following", profileUid));
        await deleteDoc(doc(db, "users", profileUid, "followers", user.uid));
      } else {
        await setDoc(doc(db, "users", user.uid, "following", profileUid), { followedAt: serverTimestamp() });
        await setDoc(doc(db, "users", profileUid, "followers", user.uid), { followedAt: serverTimestamp() });
      }
    } catch (e) {
      console.error("Error following/unfollowing:", e);
    }
  };

  const openUsersModal = (type: 'followers' | 'following') => {
    setModalType(type);
    setModalTitle(type === 'followers' ? `${profile?.name}'s Followers` : `${profile?.name} Follows`);
    setIsUsersModalOpen(true);
  };

  if (loading) {
    return <div className="profile-loading">Fetching profile...</div>;
  }

  const isOwnProfile = user?.uid === profileUid;
  if (isOwnProfile) {
    // Redirect to main profile page if it's the current user's profile
    router.replace('/profile');
    return null;
  }

  return (
    <div className="profile-container animate-fade-in">
      <div className="profile-header glass-panel">
        <div className="profile-header-top-nav" style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10 }}>
          <button onClick={() => router.back()} className="back-button glass-panel" style={{ padding: '0.5rem', borderRadius: '50%', color: 'white' }}>
            <ChevronLeft size={24} />
          </button>
        </div>
        <div 
          className="profile-banner" 
          style={profile?.banner ? { backgroundImage: `url(${profile.banner})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        ></div>
        <div className="profile-info-section">
          <div className="profile-avatar-wrapper">
            <UserAvatar 
              uid={profileUid} 
              photoURL={profile?.avatar} 
              name={profile?.name} 
              className="profile-avatar" 
            />
            <div className="profile-actions-row">
              <button 
                className={`follow-button ${isFollowing ? 'following' : ''}`}
                onClick={handleFollow}
                style={{
                  padding: '0.6rem 1.5rem',
                  borderRadius: '20px',
                  fontWeight: '700',
                  background: isFollowing ? 'transparent' : 'var(--accent-primary)',
                  color: isFollowing ? 'var(--text-primary)' : 'black',
                  border: isFollowing ? '1px solid var(--border-strong)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          </div>

          <div className="profile-meta">
            <div className="profile-name-row">
              <h1 className="profile-name">{profile?.name || "Unknown User"}</h1>
              {profile?.verified && <CheckCircle className="verified-badge" size={20} />}
            </div>
            <div className="profile-handle-row">
              <span className="profile-handle">{profile?.handle}</span>
              <span className="role-pill">{profile?.role}</span>
            </div>
            <p className="profile-bio">{profile?.bio}</p>
            
            <div className="profile-details">
              <div className="detail-item">
                <Calendar size={16} />
                <span>Joined {profile?.joinedDate}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-stats-row border-top">
          <div className="stat-item">
            <span className="stat-value">{reflections.length}</span>
            <span className="stat-label">Posts</span>
          </div>
          <div className="stat-item" onClick={() => openUsersModal('following')}>
            <span className="stat-value">{followingCount}</span>
            <span className="stat-label">Following</span>
          </div>
          <div className="stat-item" onClick={() => openUsersModal('followers')}>
            <span className="stat-value">{followerCount}</span>
            <span className="stat-label">Followers</span>
          </div>
        </div>
      </div>

      <UsersModal 
        isOpen={isUsersModalOpen} 
        onClose={() => setIsUsersModalOpen(false)} 
        type={modalType} 
        targetUid={profileUid} 
        title={modalTitle} 
      />

      <div className="profile-tabs-wrapper">
        <div className="profile-tabs">
          <button className="tab-item active">
            <MessageSquare size={18} />
            <span>Reflections</span>
          </button>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-feed animate-fade-in">
          {reflections.length > 0 ? reflections.map(r => (
            <div key={r.id} className="feed-item glass-panel">
              <div className="feed-item-header">
                <div className="header-meta">
                  <span className="reflection-tag">{r.tag}</span>
                  <span className="feed-item-date">{r.date || "Memory"}</span>
                </div>
              </div>
              <h3 className="reflection-title">{r.title}</h3>
              <p className="feed-item-text">{r.text}</p>
            </div>
          )) : (
            <div className="empty-state glass-panel">
              <p className="text-muted">No reflections yet from {profile?.name}.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
