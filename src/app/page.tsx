"use client";

import { Heart, MessageCircle, Share2, MoreHorizontal, MessageSquare, Pin, Trash2, Edit3, ExternalLink, EyeOff, Bookmark, Link as LinkIcon, Users } from "lucide-react";
import "./explore.css";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, setDoc, deleteDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";

export default function ExplorePage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

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
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) {
      window.addEventListener("click", handleClickOutside);
    }
    return () => window.removeEventListener("click", handleClickOutside);
  }, [activeMenuId]);

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

  const handleLike = async (postId: string, currentLikes: number, likedBy: string[] = []) => {
    if (!user) return;
    const isLiked = likedBy.includes(user.uid);
    try {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        likes: isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1,
        likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (e) {
      console.error("Error liking post:", e);
    }
  };

  const handleShare = async (post: any) => {
    const textToCopy = `${post.userName} shared a reflection:\n\n${post.scripture ? `"${post.scripture.text}" (${post.scripture.reference})\n\n` : ""}${post.content}\n\nShared from Bible Website`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Bible Reflection", text: textToCopy, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(textToCopy);
        setCopySuccess(post.id);
        setTimeout(() => setCopySuccess(null), 2000);
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const handleGoToBible = (ref?: string) => {
    if (!ref) return;
    const match = ref.match(/^(.+?)\s+(\d+):(\d+)/);
    if (match) {
      const book = match[1];
      const chapter = match[2];
      const verse = match[3];
      router.push(`/bible?book=${encodeURIComponent(book)}&chapter=${chapter}&verse=${verse}`);
    } else {
      router.push('/bible');
    }
  };

  const handleSaveReflection = async (post: any) => {
    if (!user) return;
    try {
      const savedRef = collection(db, "users", user.uid, "saved_items");
      await addDoc(savedRef, {
        tag: "Saved Reflection",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        content: post.content,
        source: post.scripture?.reference || "General Reflection",
        type: "reflection",
        postId: post.id,
        createdAt: serverTimestamp(),
      });
      alert("Reflection saved to your study journal!");
    } catch (e) {
      console.error("Error saving reflection:", e);
    }
  };


  const handleCrossReference = (ref?: string) => {
    if (!ref) return;
    const count = posts.filter(p => p.scripture?.reference === ref).length;
    if (count > 1) {
      alert(`There are ${count - 1} other reflections on ${ref} in the community!`);
    } else {
      alert(`This is currently the only community reflection on ${ref}.`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this reflection?")) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
    } catch (e) {
      console.error("Error deleting post:", e);
    }
  };

  const handlePinPost = async (postId: string, currentPinned: boolean) => {
    try {
      await updateDoc(doc(db, "posts", postId), {
        pinned: !currentPinned
      });
    } catch (e) {
      console.error("Error pinning post:", e);
    }
  };

  const handleToggleComments = async (postId: string, isDisabled: boolean) => {
    try {
      await updateDoc(doc(db, "posts", postId), {
        commentsDisabled: !isDisabled
      });
    } catch (e) {
      console.error("Error toggling comments:", e);
    }
  };

  const handleStartEdit = (post: any) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
    setActiveMenuId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingPostId || !editContent.trim()) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "posts", editingPostId), {
        content: editContent.trim(),
        updatedAt: serverTimestamp()
      });
      setEditingPostId(null);
    } catch (e) {
      console.error("Error updating post:", e);
    } finally {
      setIsUpdating(false);
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
                <Link href={`/profile/${post.uid}`} className="post-user flex-center" style={{ textDecoration: 'none', cursor: 'pointer' }}>
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
                </Link>
                  <div className="post-header-actions">
                    {post.pinned && <div className="pinned-badge"><Pin size={14} fill="currentColor" /> Pinned</div>}
                    {user && user.uid !== post.uid && (
                      <button 
                        className={`follow-btn-small ${followingIds.has(post.uid) ? 'following' : ''}`}
                        onClick={() => handleFollow(post.uid)}
                      >
                        {followingIds.has(post.uid) ? 'Following' : 'Follow'}
                      </button>
                    )}
                    <div className="menu-container">
                      <button 
                        className="icon-button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === post.id ? null : post.id);
                        }}
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      
                      {activeMenuId === post.id && (
                        <div className="post-dropdown-menu glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()}>
                          <button className="menu-item" onClick={() => { handleGoToBible(post.scripture?.reference); setActiveMenuId(null); }}>
                            <ExternalLink size={16} /> Go to Bible
                          </button>
                          <button className="menu-item" onClick={() => { handleSaveReflection(post); setActiveMenuId(null); }}>
                            <Bookmark size={16} /> Save Reflection
                          </button>
                          <button className="menu-item" onClick={() => { handleCrossReference(post.scripture?.reference); setActiveMenuId(null); }}>
                            <Users size={16} /> Cross-Reference
                          </button>
                          
                          {user && user.uid === post.uid && (
                            <>
                              <div className="menu-divider" />
                              <button className="menu-item" onClick={() => handleStartEdit(post)}>
                                <Edit3 size={16} /> Edit
                              </button>
                              <button className="menu-item" onClick={() => { handlePinPost(post.id, post.pinned); setActiveMenuId(null); }}>
                                <Pin size={16} /> {post.pinned ? "Unpin from Profile" : "Pin to Profile"}
                              </button>
                              <button className="menu-item" onClick={() => { handleToggleComments(post.id, post.commentsDisabled); setActiveMenuId(null); }}>
                                {post.commentsDisabled ? <MessageCircle size={16} /> : <EyeOff size={16} />}
                                {post.commentsDisabled ? "Enable Comments" : "Disable Comments"}
                              </button>
                              <button className="menu-item danger" onClick={() => { handleDeletePost(post.id); setActiveMenuId(null); }}>
                                <Trash2 size={16} /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
              </div>
              
              {post.scripture && (
                <div className="post-scripture">
                  {post.scripture.reference && <span className="scripture-ref">{post.scripture.reference}</span>}
                  {post.scripture.text && <p className="scripture-text">"{post.scripture.text}"</p>}
                </div>
              )}
              
              {editingPostId === post.id ? (
                <div className="edit-post-container">
                  <textarea 
                    className="edit-textarea"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    autoFocus
                  />
                  <div className="edit-actions">
                    <button className="btn-text" onClick={() => setEditingPostId(null)}>Cancel</button>
                    <button className="btn-primary" onClick={handleSaveEdit} disabled={isUpdating}>{isUpdating ? "Saving..." : "Save Changes"}</button>
                  </div>
                </div>
              ) : (
                <p className="post-content">{post.content}</p>
              )}
              
              <div className="post-actions">
                <button 
                  className={`action-btn ${user && post.likedBy?.includes(user.uid) ? 'active' : ''}`} 
                  onClick={() => handleLike(post.id, post.likes, post.likedBy)}
                >
                  <Heart size={18} fill={user && post.likedBy?.includes(user.uid) ? "currentColor" : "none"} /> 
                  <span>{post.likes}</span>
                </button>
                {!post.commentsDisabled && (
                  <button className="action-btn" onClick={() => toggleComments(post.id)}>
                    <MessageCircle size={18} /> <span>{post.comments}</span>
                  </button>
                )}
                <button className="action-btn" onClick={() => handleShare(post)}>
                  <Share2 size={18} className={copySuccess === post.id ? "text-success" : ""} /> 
                  <span>{copySuccess === post.id ? "Copied!" : "Share"}</span>
                </button>
              </div>

              {expandedComments.has(post.id) && !post.commentsDisabled && (
                <CommentSection 
                  postId={post.id} 
                  user={user} 
                  userProfile={userProfile}
                  commentCount={post.comments} 
                />
              )}
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

function CommentSection({ postId, user, userProfile, commentCount }: { postId: string, user: any, userProfile: any, commentCount: number }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().createdAt?.toDate() ? new Date(doc.data().createdAt.toDate()).toLocaleDateString() : "Just now"
      })));
    }, (error) => {
      console.error("Comments listener error:", error);
    });
    return () => unsubscribe();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const commentData = {
        uid: user.uid,
        userName: userProfile?.name || user.displayName || "Scholar",
        userHandle: userProfile?.handle || "@user",
        userPhoto: userProfile?.avatar || user.photoURL || "",
        content: newComment.trim(),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "posts", postId, "comments"), commentData);
      await updateDoc(doc(db, "posts", postId), {
        comments: commentCount + 1
      });
      setNewComment("");
    } catch (err) {
      console.error("Error adding comment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="comments-section animate-fade-in">
      <div className="comments-list">
        {comments.map(comment => (
          <div key={comment.id} className="comment-item">
            <UserAvatar 
              uid={comment.uid} 
              photoURL={comment.userPhoto} 
              name={comment.userName}
              className="comment-avatar"
            />
            <div className="comment-content-wrapper">
              <div className="comment-header">
                <span className="comment-user">{comment.userName}</span>
                <span className="comment-time">{comment.time}</span>
              </div>
              <p className="comment-text">{comment.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="no-comments-text">No reflections yet. Be the first to share your thoughts!</p>
        )}
      </div>

      {user && (
        <form className="comment-composer" onSubmit={handleSubmit}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a reflection..."
            rows={2}
          />
          <button 
            type="submit" 
            className="comment-submit-btn"
            disabled={isSubmitting || !newComment.trim()}
          >
            {isSubmitting ? "..." : "Post"}
          </button>
        </form>
      )}
    </div>
  );
}
