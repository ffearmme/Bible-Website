"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Image as ImageIcon, Smile, Paperclip, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import "./NewPostModal.css";

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewPostModal({ isOpen, onClose }: NewPostModalProps) {
  const { user, userProfile } = useAuth();
  const [content, setContent] = useState("");
  const [scriptureRef, setScriptureRef] = useState("");
  const [scriptureText, setScriptureText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showScriptureInput, setShowScriptureInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePost = async () => {
    if (!user || !content.trim()) return;
    setIsPosting(true);

    try {
      const postData = {
        uid: user.uid,
        userName: userProfile?.name || user.displayName || "Scholar",
        userHandle: userProfile?.handle || "@user",
        userInitials: userProfile?.name 
          ? userProfile.name.split(/\s+/).filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() 
          : "U",
        content: content.trim(),
        createdAt: serverTimestamp(),
        likes: 0,
        comments: 0
      } as any;

      if (scriptureRef.trim() || scriptureText.trim()) {
        postData.scripture = {
          reference: scriptureRef.trim() || "Scripture",
          text: scriptureText.trim()
        };
      }

      await addDoc(collection(db, "posts"), postData);

      // Reset form
      setContent("");
      setScriptureRef("");
      setScriptureText("");
      setShowScriptureInput(false);
      onClose();
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to share your reflection. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="new-post-modal-overlay" onClick={onClose}>
      <div 
        className="new-post-modal-content glass-panel animate-fade-in" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="new-post-header">
          <div className="new-post-header-left">
            <button className="close-modal-icon" onClick={onClose}>
              <X size={24} />
            </button>
            <h2 className="new-post-modal-title">New Reflection</h2>
          </div>
          <button 
            className="post-submit-btn" 
            onClick={handlePost}
            disabled={!content.trim() || isPosting}
          >
            {isPosting ? "Posting..." : "Share"}
          </button>
        </div>

        <div className="new-post-body">
          <div className="user-post-info">
            <div className="user-post-avatar">
              {userProfile?.avatar ? (
                <img src={userProfile.avatar} alt={userProfile.name} />
              ) : (
                <span>{getInitials(userProfile?.name || user?.displayName || "U")}</span>
              )}
            </div>
            <span className="user-display-name">{userProfile?.name || user?.displayName || "Scholar"}</span>
          </div>

          <textarea
            ref={textareaRef}
            className="new-post-textarea"
            placeholder="What profound reflection is on your heart today?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {showScriptureInput ? (
            <div className="scripture-attachment-input animate-fade-in">
              <div className="flex-between">
                <label>Attached Scripture</label>
                <X 
                  size={16} 
                  style={{ cursor: "pointer", opacity: 0.6 }} 
                  onClick={() => setShowScriptureInput(false)} 
                />
              </div>
              <input 
                className="scripture-ref-field"
                placeholder="e.g., Romans 12:2"
                value={scriptureRef}
                onChange={(e) => setScriptureRef(e.target.value)}
              />
              <textarea 
                className="scripture-text-field"
                placeholder="The divine words..."
                value={scriptureText}
                onChange={(e) => setScriptureText(e.target.value)}
              />
            </div>
          ) : (
            <div className="post-extra-actions">
               <button 
                  className="action-btn" 
                  onClick={() => setShowScriptureInput(true)}
                  style={{ gap: "0.5rem" }}
               >
                 <Paperclip size={18} />
                 <span>Attach Scripture</span>
               </button>
            </div>
          )}
        </div>

        <div className="new-post-footer">
          <button className="post-cancel-btn" onClick={onClose}>Cancel</button>
          <button 
            className="post-submit-btn" 
            onClick={handlePost}
            disabled={!content.trim() || isPosting}
          >
            {isPosting ? "Posting..." : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}
