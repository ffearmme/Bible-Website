"use client";

import { Heart, MessageCircle, Share2, MoreHorizontal, MessageSquare } from "lucide-react";
import "./explore.css";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";

export default function ExplorePage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Listen to following to show Follow/Unfollow state
    if (user) {
      const followingRef = collection(db, "users", user.uid, "following");
      const unsubFollowing = onSnapshot(followingRef, (snapshot) => {
        setFollowingIds(new Set(snapshot.docs.map(doc => doc.id)));
      }, (error) => {
        console.error("Explore Following listener error:", error);
      });
      return () => unsubFollowing();
    }
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().createdAt?.toDate() 
          ? new Date(doc.data().createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : "Just now"
      }));
      setPosts(items);
      setLoading(false);
    }, (error) => {
      console.error("Explore Posts listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLike = async (postId: string, currentLikes: number) => {
    if (!user) return;
    try {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        likes: currentLikes + 1
      });
    } catch (e) {
      console.error("Error liking post:", e);
    }
  };

  const handleFollow = async (targetUid: string) => {
    if (!user || user.uid === targetUid) return;
    try {
      const isFollowing = followingIds.has(targetUid);
      if (isFollowing) {
        // Unfollow
        await deleteDoc(doc(db, "users", user.uid, "following", targetUid));
        await deleteDoc(doc(db, "users", targetUid, "followers", user.uid));
      } else {
        // Follow
        await setDoc(doc(db, "users", user.uid, "following", targetUid), { followedAt: serverTimestamp() });
        await setDoc(doc(db, "users", targetUid, "followers", user.uid), { followedAt: serverTimestamp() });
      }
    } catch (e) {
      console.error("Error following/unfollowing:", e);
    }
  };

  return (
    <div className="explore-container animate-fade-in">
      <header className="page-header flex-between">
        <h1 className="heading-1">Explore</h1>
      </header>
      
      <div className="feed-container">
        {loading ? (
          <div className="empty-state glass-panel">
            <p className="text-muted">Loading reflections...</p>
          </div>
        ) : posts.length > 0 ? (
          posts.map(post => (
            <article key={post.id} className="post-card glass-panel card-hover">
              <div className="post-header flex-between">
                <div className="post-user flex-center">
                  <UserAvatar 
                    uid={post.uid} 
                    initials={post.userInitials} 
                    photoURL={post.userPhoto} 
                    name={post.userName} 
                  />
                  <div className="user-info">
                    <span className="user-name">{post.userName}</span>
                    <span className="user-handle">{post.userHandle} • {post.time}</span>
                  </div>
                </div>
                <div className="post-header-actions">
                  {user && user.uid !== post.uid && (
                    <button 
                      className={`follow-btn-small ${followingIds.has(post.uid) ? 'following' : ''}`}
                      onClick={() => handleFollow(post.uid)}
                    >
                      {followingIds.has(post.uid) ? 'Following' : 'Follow'}
                    </button>
                  )}
                  <button className="icon-button"><MoreHorizontal size={20} /></button>
                </div>
              </div>
              
              {post.scripture && (
                <div className="post-scripture">
                  {post.scripture.reference && <span className="scripture-ref">{post.scripture.reference}</span>}
                  {post.scripture.text && <p className="scripture-text">"{post.scripture.text}"</p>}
                </div>
              )}
              
              <p className="post-content">{post.content}</p>
              
              <div className="post-actions">
                <button className="action-btn" onClick={() => handleLike(post.id, post.likes)}>
                  <Heart size={18} /> <span>{post.likes}</span>
                </button>
                <button className="action-btn">
                  <MessageCircle size={18} /> <span>{post.comments}</span>
                </button>
                <button className="action-btn">
                  <Share2 size={18} /> <span>Share</span>
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state glass-panel animate-fade-in">
            <div className="empty-icon-wrapper">
              <MessageSquare size={64} className="empty-icon" />
            </div>
            <div className="empty-text-group">
              <h2 className="heading-2">The Silence of Study</h2>
              <p className="text-muted">
                Our global study community is currently quiet. 
                Be the first to share a profound reflection directly from the Bible reader!
              </p>
            </div>
            <button className="cta-button" onClick={() => router.push('/bible')}>
              Go to Bible
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
