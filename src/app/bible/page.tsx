"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Globe, Book, ChevronLeft, ChevronRight, MessageSquare, Share2, Search, X, Bookmark, Send, Check, Highlighter } from "lucide-react";
import "./bible.css";
import axios from "axios";
import { useSearchParams, useRouter } from "next/navigation";
import { useSidebar } from "@/components/LayoutWrapper";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  where,
  orderBy,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

interface ChapterContent {
  reference: string;
  rawVerses: any[];
  copyright: string;
}

const BIBLE_METADATA: any = {
  "Genesis": 50, "Exodus": 40, "Leviticus": 27, "Numbers": 36, "Deuteronomy": 34, "Joshua": 24, "Judges": 21, "Ruth": 4, "1 Samuel": 31, "2 Samuel": 24, "1 Kings": 22, "2 Kings": 25, "1 Chronicles": 29, "2 Chronicles": 36, "Ezra": 10, "Nehemiah": 13, "Esther": 10, "Job": 42, "Psalms": 150, "Proverbs": 31, "Ecclesiastes": 12, "Song of Solomon": 8, "Isaiah": 66, "Jeremiah": 52, "Lamentations": 5, "Ezekiel": 48, "Daniel": 12, "Hosea": 14, "Joel": 3, "Amos": 9, "Obadiah": 1, "Jonah": 4, "Micah": 7, "Nahum": 3, "Habakkuk": 3, "Zephaniah": 3, "Haggai": 2, "Zechariah": 14, "Malachi": 4,
  "Matthew": 28, "Mark": 16, "Luke": 24, "John": 21, "Acts": 28, "Romans": 16, "1 Corinthians": 16, "2 Corinthians": 13, "Galatians": 6, "Ephesians": 6, "Philippians": 4, "Colossians": 4, "1 Thessalonians": 5, "2 Thessalonians": 3, "1 Timothy": 6, "2 Timothy": 4, "Titus": 3, "Philemon": 1, "Hebrews": 13, "James": 5, "1 Peter": 5, "2 Peter": 3, "1 John": 5, "2 John": 1, "3 John": 1, "Jude": 1, "Revelation": 22
};

const OLD_TESTAMENT = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi"];
const NEW_TESTAMENT = ["Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"];

interface VerseActionMenuProps {
  showActionMenu: boolean;
  selectedVerses: any[];
  menuPosition: { x: number; y: number };
  isMounted: boolean;
  copySuccess: boolean;
  saveSuccess: boolean;
  isSaved: boolean;
  isAnyHighlighted: boolean;
  handleShare: () => void;
  handleSave: () => void;
  handleHighlight: () => void;
  handlePost: () => void;
  onCancel: () => void;
}

const VerseActionMenu = ({
  showActionMenu,
  selectedVerses,
  menuPosition,
  isMounted,
  copySuccess,
  saveSuccess,
  isSaved,
  isAnyHighlighted,
  handleShare,
  handleSave,
  handleHighlight,
  handlePost,
  onCancel,
}: VerseActionMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -9999, y: -9999 });
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (!showActionMenu || !menuRef.current) return;
    const { width, height } = menuRef.current.getBoundingClientRect();
    const { x: cx, y: cy } = menuPosition;
    const gap = 8;
    const pad = 8;

    // Horizontal: anchor left edge at click, clamp so right edge stays on screen
    let left = cx;
    if (left + width > window.innerWidth - pad) {
      left = window.innerWidth - width - pad;
    }
    if (left < pad) left = pad;

    // Vertical: prefer above the click, fall below if not enough room
    let top: number;
    if (cy - height - gap >= pad) {
      top = cy - height - gap; // above
    } else {
      top = cy + gap; // below
    }

    // Final bottom clamp
    if (top + height > window.innerHeight - pad) {
      top = window.innerHeight - height - pad;
    }

    setPos({ x: left, y: top });
    setReady(true);
  }, [showActionMenu, menuPosition]);

  useEffect(() => {
    if (!showActionMenu) setReady(false);
  }, [showActionMenu]);

  if (!showActionMenu || selectedVerses.length === 0 || !isMounted) return null;

  const style: React.CSSProperties = {
    position: "fixed",
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    zIndex: 1000000,
    opacity: ready ? 1 : 0,
    transition: "opacity 0.12s ease",
  };

  return createPortal(
    <div ref={menuRef} className="verse-action-menu glass-panel" style={style}>
      <div className="menu-inner">
        {selectedVerses.length > 1 && (
          <div className="menu-verse-count">{selectedVerses.length} verses selected</div>
        )}
        <button className="menu-item" onClick={handleShare}>
          {copySuccess ? <Check size={18} className="text-success" /> : <Share2 size={18} />}
          <span>{copySuccess ? "Copied" : "Share"}</span>
        </button>
        <button className="menu-item" onClick={handleSave}>
          {(saveSuccess || isSaved) ? <Check size={18} className="text-accent" /> : <Bookmark size={18} />}
          <span>{saveSuccess ? "Saved!" : isSaved ? "Saved" : "Save"}</span>
        </button>
        <button className="menu-item" onClick={handleHighlight}>
          {isAnyHighlighted ? <Check size={18} className="text-accent" /> : <Highlighter size={18} />}
          <span>{isAnyHighlighted ? "Unhighlight" : "Highlight"}</span>
        </button>
        <button className="menu-item highlight" onClick={handlePost}>
          <Send size={18} />
          <span>Post</span>
        </button>
        <button className="menu-item close" onClick={onCancel}>
          <X size={18} />
          <span>Done</span>
        </button>
      </div>
    </div>,
    document.body
  );
};

function BibleReader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setMinimized } = useSidebar();
  const [openTestament, setOpenTestament] = useState<string | null>(null);
  const [currentTranslation, setCurrentTranslation] = useState("web");
  const [currentBook, setCurrentBook] = useState<string | null>(null);
  const [stagingBook, setStagingBook] = useState<string | null>(null);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [content, setContent] = useState<ChapterContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [popupPosition, setPopupPosition] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedRefs, setSavedRefs] = useState<Set<string>>(new Set());
  const [noteText, setNoteText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [targetVerse, setTargetVerse] = useState<string | null>(null);
  const [highlightedVerses, setHighlightedVerses] = useState<Set<string>>(new Set());
  // verseAnnotations: Map from verse number -> list of posts
  const [verseAnnotations, setVerseAnnotations] = useState<Map<number, any[]>>(new Map());
  const [activeAnnotation, setActiveAnnotation] = useState<{ verse: number; posts: any[] } | null>(null);

  const { user, userProfile } = useAuth();

  useEffect(() => {
    setIsMounted(true);
    
    // Check search params
    const b = searchParams.get("book");
    const c = searchParams.get("chapter");
    const v = searchParams.get("verse");

    if (b || c || v) {
      if (b) {
        setCurrentBook(b);
        setStagingBook(b);
      }
      if (c) setCurrentChapter(parseInt(c));
      if (v) setTargetVerse(v);

      // Clear the query params from the URL so they don't stick around
      router.replace('/bible', { scroll: false });
    }
  }, [searchParams, router]);

  // Load saved refs
  useEffect(() => {
    if (!user) {
      try {
        const saved = JSON.parse(localStorage.getItem("userSaved") || "[]");
        setSavedRefs(new Set(saved.map((s: any) => s.source)));
      } catch {}
    } else {
      // Listen to Firestore for saved items
      const savedRef = collection(db, "users", user.uid, "saved_items");
      const unsub = onSnapshot(savedRef, (snapshot) => {
        const refs = new Set(snapshot.docs.map(doc => doc.data().source));
        setSavedRefs(refs);
      }, (error) => {
        console.error("Bible Saved items listener error:", error);
      });
      return () => unsub();
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [user]);

  // Load highlights
  useEffect(() => {
    if (!user) {
      try {
        const saved = JSON.parse(localStorage.getItem("userHighlights") || "[]");
        setHighlightedVerses(new Set(saved));
      } catch {}
    } else {
      // Listen to Firestore for highlights
      const highlightsRef = collection(db, "users", user.uid, "highlights");
      const unsub = onSnapshot(highlightsRef, (snapshot) => {
        const h = new Set(snapshot.docs.map(doc => doc.id)); 
        setHighlightedVerses(h);
      }, (error) => {
        console.error("Bible Highlights listener error:", error);
      });
      return () => unsub();
    }
  }, [user]);

  // Fetch community posts for the current chapter and build verseAnnotations map
  useEffect(() => {
    const prefix = `${currentBook} ${currentChapter}:`;
    const q = query(
      collection(db, "posts"),
      where("scripture.reference", ">=", prefix),
      where("scripture.reference", "<", prefix + "\uFFFF"),
      orderBy("scripture.reference")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const map = new Map<number, any[]>();
      snapshot.docs.forEach((d) => {
        const post = { id: d.id, ...d.data() };
        const ref: string = (post as any).scripture?.reference || "";
        // Parse verse number from e.g. "John 3:16" or "John 3:16-18"
        const match = ref.match(/:([\d]+)/);
        if (match) {
          const verseNum = parseInt(match[1], 10);
          if (!map.has(verseNum)) map.set(verseNum, []);
          map.get(verseNum)!.push(post);
        }
      });
      setVerseAnnotations(map);
    }, (err) => {
      console.error("Annotation listener error:", err);
    });
    return () => unsub();
  }, [currentBook, currentChapter]);

  const clearSelection = () => {
    setSelectedVerses([]);
    setShowActionMenu(false);
    setShowSidebar(false);
    setMinimized(false);
  };

  const toggleVerse = (v: any, e?: React.MouseEvent) => {
    const alreadySelected = selectedVerses.some((s) => s.verse === v.verse);
    const next = alreadySelected
      ? selectedVerses.filter((s) => s.verse !== v.verse)
      : [...selectedVerses, v];

    setSelectedVerses(next);

    if (next.length === 0) {
      setShowActionMenu(false);
      return;
    }

    setShowActionMenu(true);
    setShowSidebar(false);

    if (e) {
      setMenuPosition({ x: e.clientX, y: e.clientY });
      if (window.innerWidth > 768) {
        setPopupPosition(e.pageY - 120);
      }
    }
  };

  const handleShare = async () => {
    if (selectedVerses.length === 0) return;
    const sorted = [...selectedVerses].sort((a, b) => a.verse - b.verse);
    const ref =
      sorted.length === 1
        ? `${currentBook} ${currentChapter}:${sorted[0].verse}`
        : `${currentBook} ${currentChapter}:${sorted[0].verse}-${sorted[sorted.length - 1].verse}`;
    const verseText = sorted.map((v) => v.text.trim()).join(" ");
    const textToCopy = `${ref}\n"${verseText}"\nShared from Bible Website`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "Bible Verse", text: textToCopy, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(textToCopy);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  const handleSave = async () => {
    if (selectedVerses.length === 0) return;

    const sorted = [...selectedVerses].sort((a, b) => a.verse - b.verse);
    const ref =
      sorted.length === 1
        ? `${currentBook} ${currentChapter}:${sorted[0].verse}`
        : `${currentBook} ${currentChapter}:${sorted[0].verse}-${sorted[sorted.length - 1].verse}`;

    if (!user) {
      // Guest logic (localStorage)
      try {
        const existing = JSON.parse(localStorage.getItem("userSaved") || "[]");
        if (savedRefs.has(ref)) {
          const updated = existing.filter((s: any) => s.source !== ref);
          localStorage.setItem("userSaved", JSON.stringify(updated));
          setSavedRefs(new Set(updated.map((s: any) => s.source)));
        } else {
          const content = sorted.map((v) => v.text.trim()).join(" ");
          const newItem = { id: Date.now(), tag: "Saved Scripture", date: "Just now", content, source: ref, type: "scripture" };
          const updated = [newItem, ...existing.filter((s: any) => s.source !== ref)];
          localStorage.setItem("userSaved", JSON.stringify(updated));
          setSavedRefs(new Set(updated.map((s: any) => s.source)));
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
        }
      } catch (e) {
        console.error("Failed to save/unsave verse locally", e);
      }
      return;
    }

    // Authenticated logic (Firestore)
    try {
      const savedRef = collection(db, "users", user.uid, "saved_items");
      if (savedRefs.has(ref)) {
        // Find the doc with this ref and delete it
        const q = query(savedRef, where("source", "==", ref));
        const snapshot = await getDocs(q);
        snapshot.forEach(async (d) => {
          await deleteDoc(doc(db, "users", user.uid, "saved_items", d.id));
        });
      } else {
        // Add new saved item
        const content = sorted.map((v) => v.text.trim()).join(" ");
        await addDoc(savedRef, {
          tag: "Saved Scripture",
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          content,
          source: ref,
          type: "scripture",
          createdAt: serverTimestamp(),
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (e) {
      console.error("Failed to sync save to Firestore", e);
    }
  };

  const handleHighlight = async () => {
    if (selectedVerses.length === 0) return;

    const currentHighlights = new Set(highlightedVerses);
    const selectedRefs = selectedVerses.map(v => `${currentBook}-${currentChapter}-${v.verse}`);
    const areAnyHighlighted = selectedRefs.some(ref => highlightedVerses.has(ref));

    if (!user) {
      // Guest logic (localStorage)
      try {
        if (areAnyHighlighted) {
          // Unhighlight all if any are highlighted? 
          // Or only the highlighted ones? 
          // User said "until they unhighlight it" on the menu.
          // Let's toggle individually? 
          // Re-reading user request: "click highlight and it highlights the text forever (until they unhighlight it)"
          // If any is highlighted, then it should probably say "Unhighlight" or something.
          // Let's do: if ANY are highlighted, remove ALL selected from highlights.
          selectedRefs.forEach(ref => currentHighlights.delete(ref));
        } else {
          selectedRefs.forEach(ref => currentHighlights.add(ref));
        }
        localStorage.setItem("userHighlights", JSON.stringify(Array.from(currentHighlights)));
        setHighlightedVerses(new Set(currentHighlights));
      } catch (e) {
        console.error("Failed to update highlights locally", e);
      }
      return;
    }

    // Authenticated logic (Firestore)
    try {
      if (areAnyHighlighted) {
        // Find existing ones and delete
        for (const ref of selectedRefs) {
          if (highlightedVerses.has(ref)) {
            await deleteDoc(doc(db, "users", user.uid, "highlights", ref));
          }
        }
      } else {
        // Add new ones
        for (const v of selectedVerses) {
          const ref = `${currentBook}-${currentChapter}-${v.verse}`;
          await setDoc(doc(db, "users", user.uid, "highlights", ref), {
            book: currentBook,
            chapter: currentChapter,
            verse: v.verse,
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (e) {
      console.error("Failed to sync highlights to Firestore", e);
    }
  };

  const handlePostToExplore = async () => {
    if (!user || !sidebarRef || !noteText.trim()) return;
    setIsPosting(true);
    try {
      const postData = {
        uid: user.uid,
        userName: userProfile?.name || user.displayName || "Scholar",
        userHandle: userProfile?.handle || "@user",
        userInitials: userProfile?.name ? userProfile.name.split(/\s+/).filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : "U",
        scripture: {
          reference: sidebarRef,
          text: sidebarText.replace(/"/g, '')
        },
        content: noteText.trim(),
        createdAt: serverTimestamp(),
        likes: 0,
        comments: 0
      };

      // Add to global posts
      await addDoc(collection(db, "posts"), postData);
      
      // Also add to user's reflections for their profile
      await addDoc(collection(db, "users", user.uid, "reflections"), {
        tag: "Reflection",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        title: sidebarRef,
        text: noteText.trim(),
        createdAt: serverTimestamp()
      });

      setNoteText("");
      setShowSidebar(false);
      setMinimized(false);
      alert("Posted to Explore!");
    } catch (e) {
      console.error("Error posting to Explore:", e);
      alert("Failed to post. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  const handlePost = () => {
    setShowActionMenu(false);
    setShowSidebar(true);
    setMinimized(true);
  };

  const handlePrevChapter = () => {
    clearSelection();
    if (currentChapter > 1) setCurrentChapter(currentChapter - 1);
  };

  const handleNextChapter = () => {
    clearSelection();
    const maxChapters = currentBook ? BIBLE_METADATA[currentBook] || 50 : 50;
    if (currentChapter < maxChapters) setCurrentChapter(currentChapter + 1);
  };

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "auto";
  }, [mobileNavOpen]);

  useEffect(() => {
    async function fetchBible() {
      if (!currentBook) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      clearSelection();
      try {
        const url = `https://bible-api.com/${currentBook}+${currentChapter}?translation=${currentTranslation}`;
        const res = await axios.get(url);
        setContent({
          reference: res.data.reference,
          rawVerses: res.data.verses,
          copyright: `Translation: ${res.data.translation_name}`,
        });
      } catch (err: any) {
        setError("Unable to find that chapter.");
      } finally {
        setLoading(false);
        setMobileNavOpen(false);
      }
    }
    fetchBible();
    // window.scrollTo({ top: 0, behavior: "smooth" }); - Removed to allow verse-specific scroll
  }, [currentTranslation, currentBook, currentChapter]);

  // Handle scrolling to verse
  useEffect(() => {
    if (!loading && content && targetVerse) {
      const v = targetVerse;
      setTimeout(() => {
        const element = document.getElementById(`v-${v}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // Optionally highlight it briefly
          element.classList.add("highlight-pulse");
          setTimeout(() => element.classList.remove("highlight-pulse"), 2000);
        }
      }, 300); // Small delay to ensure render
      setTargetVerse(null); // Clear local target so it doesn't re-scroll
    } else if (!loading && content && !targetVerse && !searchParams.get("verse")) {
      // Only scroll to top if we weren't just handling a target verse
      // This prevents competing with the auto-scroll
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [loading, content, targetVerse, searchParams]);

  const RenderBookList = (books: string[], title: string) => {
    const isExpanded = openTestament === title;
    const filteredBooks = books.filter((b) =>
      b.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filteredBooks.length === 0 && searchQuery) return null;
    return (
      <div className="testament-section">
        <button
          className={`testament-tab flex-between ${isExpanded ? "active" : ""}`}
          onClick={() => {
            const next = isExpanded ? null : title;
            setOpenTestament(next);
            // On mobile, if we switch testaments, we might want to scroll?
          }}
        >
          <span className="testament-title">{title}</span>
          <ChevronDown
            size={14}
            style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "0.2s" }}
          />
        </button>
        {isExpanded && (
          <ul className="book-list">
            {filteredBooks.map((b) => (
              <li key={b} className={stagingBook === b ? "selected-book-item" : ""}>
                <button
                  className={`book-btn ${stagingBook === b ? "active" : ""} ${currentBook === b ? "current" : ""}`}
                  onClick={() => setStagingBook(b)}
                >
                  {b}
                  {currentBook === b && <div className="dot-indicator" />}
                </button>
                {stagingBook === b && (
                  <div className="chapter-grid animate-fade-in">
                    {[...Array(BIBLE_METADATA[b] || 20)].map((_, i) => (
                      <button
                        key={i + 1}
                        className={`chapter-pill ${currentBook === b && currentChapter === i + 1 ? "active" : ""}`}
                        onClick={() => { setCurrentBook(b); setCurrentChapter(i + 1); }}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  // Pre-compute sidebar verse data
  const sortedSelected = [...selectedVerses].sort((a, b) => a.verse - b.verse);
  const sidebarRef =
    sortedSelected.length === 0
      ? ""
      : sortedSelected.length === 1
      ? `${currentBook} ${currentChapter}:${sortedSelected[0].verse}`
      : `${currentBook} ${currentChapter}:${sortedSelected[0].verse}-${sortedSelected[sortedSelected.length - 1].verse}`;
  const sidebarText = sortedSelected.map((v) => `"${v.text.trim()}"`).join("\n");

  // Check if current selection is already saved
  const currentRef =
    sortedSelected.length === 0
      ? ""
      : sortedSelected.length === 1
      ? `${currentBook} ${currentChapter}:${sortedSelected[0].verse}`
      : `${currentBook} ${currentChapter}:${sortedSelected[0].verse}-${sortedSelected[sortedSelected.length - 1].verse}`;
  const isSaved = currentRef !== "" && savedRefs.has(currentRef);

  const selectedVerseRefs = selectedVerses.map(v => `${currentBook}-${currentChapter}-${v.verse}`);
  const isAnyHighlighted = selectedVerseRefs.some(ref => highlightedVerses.has(ref));

  return (
    <div className={`bible-container animate-fade-in ${mobileNavOpen ? "nav-focused" : ""} ${showSidebar ? "with-notes" : ""}`}>
      <div className={`bible-navigator glass-panel ${mobileNavOpen ? "mobile-open" : ""}`}>
        <div className="navigator-header">
          <div className="flex-between" style={{ marginBottom: "1rem" }}>
            <h2 className="heading-2 flex-center" style={{ gap: "0.5rem", margin: 0 }}>
              <Globe size={18} /> Version
            </h2>
            <button className="close-panel-btn" onClick={() => setMobileNavOpen(false)} title="Close Navigation">
              <X size={24} />
            </button>
          </div>
          <select
            className="translation-select"
            value={currentTranslation}
            onChange={(e) => setCurrentTranslation(e.target.value)}
          >
            <option value="web">World English Bible (WEB)</option>
            <option value="kjv">King James Version (KJV)</option>
          </select>
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search books..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value && !openTestament) setOpenTestament("New Testament");
              }}
            />
          </div>
        </div>
        <div className="navigator-content">
          {RenderBookList(OLD_TESTAMENT, "Old Testament")}
          {RenderBookList(NEW_TESTAMENT, "New Testament")}
        </div>
      </div>

      <div className="bible-reader-main-wrapper" style={{ flex: 1, position: "relative", display: "flex", alignItems: "flex-start" }}>
        <div className={`bible-reader ${showSidebar ? "with-notes" : ""} ${mobileNavOpen ? "nav-focused" : ""}`}>
          {loading ? (
            <div className="flex-center" style={{ height: "60vh", flexDirection: "column", gap: "1rem" }}>
              <div className="spinner"></div>
              <p className="text-muted">Loading {currentBook} {currentChapter}...</p>
            </div>
          ) : !currentBook ? (
            <div className="bible-welcome-screen animate-fade-in">
              <div className="welcome-inner">
                <div className="welcome-icon-ring">
                  <Book size={48} className="text-accent" />
                </div>
                <h1 className="heading-1">Explore the Word</h1>
                <p className="text-muted">Select a book from the navigator to begin reading and sharing reflections with the community.</p>
                <button 
                  className="post-button mobile-only" 
                  style={{ marginTop: "1rem" }}
                  onClick={() => setMobileNavOpen(true)}
                >
                  Browse Books
                </button>
              </div>
            </div>
          ) : error ? (
            <div className="flex-center" style={{ height: "60vh", flexDirection: "column", textAlign: "center", padding: "2rem" }}>
              <p className="text-muted">{error}</p>
              <button className="post-button" style={{ marginTop: "1rem" }} onClick={() => setCurrentChapter(1)}>
                Return to Chapter 1
              </button>
            </div>
          ) : (
            <>
              <header
                className={`reader-header ${isScrolled ? "scrolled" : ""}`}
                onClick={() => { if (window.innerWidth < 768) setMobileNavOpen(true); }}
              >
                <button
                  className="arrow-nav-btn prev-btn"
                  onClick={(e) => { e.stopPropagation(); handlePrevChapter(); }}
                  disabled={currentChapter === 1}
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="header-labels">
                  <div className="mobile-header-indicator">Tap to change book ▾</div>
                  <h1 className="heading-1">{content?.reference}</h1>
                  <p className="text-muted">{content?.copyright}</p>
                </div>
                <button
                  className="arrow-nav-btn next-btn"
                  onClick={(e) => { e.stopPropagation(); handleNextChapter(); }}
                  disabled={!currentBook || currentChapter >= (BIBLE_METADATA[currentBook as string] || 50)}
                >
                  <ChevronRight size={24} />
                </button>
              </header>

              <div className="reader-content-wrapper">
                <div className="reader-content">
                  <div className="chapter-text-api">
                    {content?.rawVerses?.map((v: any) => {
                      const annotationPosts = verseAnnotations.get(v.verse) || [];
                      return (
                        <span
                          key={v.verse}
                          className="verse-row"
                        >
                          <span
                            id={`v-${v.verse}`}
                            className={`verse-selectable ${selectedVerses.some((s) => s.verse === v.verse) ? "active" : ""} ${highlightedVerses.has(`${currentBook}-${currentChapter}-${v.verse}`) ? "highlighted" : ""}`}
                            onClick={(e) => toggleVerse(v, e)}
                          >
                            <sup className="v">{v.verse}</sup>
                            <span className="v-text">{v.text}</span>
                          </span>
                          {annotationPosts.length > 0 && (
                            <span className="verse-annotation-col">
                              <button
                                className="verse-annotation-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveAnnotation({ verse: v.verse, posts: annotationPosts });
                                }}
                                title={`${annotationPosts.length} reflection${annotationPosts.length > 1 ? 's' : ''} on this verse`}
                              >
                                <MessageSquare size={13} fill="currentColor" />
                                {annotationPosts.length > 1 && (
                                  <span className="annotation-count-badge">{annotationPosts.length}</span>
                                )}
                              </button>
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Desktop arrows removed from here as they are now in the header */}

        <aside
          className={`notes-sidebar glass-panel ${showSidebar && selectedVerses.length > 0 ? "open" : ""}`}
          style={isMounted && window.innerWidth > 768 ? { top: `${popupPosition}px` } : {}}
        >
          {showSidebar && selectedVerses.length > 0 && (
            <>
              {isMounted && window.innerWidth < 768 && (
                <button
                  className="close-panel-btn"
                  style={{ position: "absolute", top: "1.25rem", right: "1.25rem", zIndex: 10 }}
                  onClick={() => { setShowSidebar(false); setMinimized(false); }}
                >
                  <X size={24} />
                </button>
              )}
              <div className="notes-panel-content animate-fade-in">
                <div className="verse-preview">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span className="scripture-ref">{sidebarRef}</span>
                    <Share2 size={18} className="text-muted" style={{ cursor: "pointer" }} />
                  </div>
                  <p className="scripture-text">{sidebarText}</p>
                </div>
                <div className="notes-input-section">
                  <textarea 
                    placeholder="Write a note about this verse..." 
                    className="notes-textarea"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  ></textarea>
                  <button 
                    className="post-button" 
                    onClick={handlePostToExplore}
                    disabled={isPosting || !noteText.trim() || !user}
                  >
                    {isPosting ? "Posting..." : "Post to Explore"}
                  </button>
                </div>
                <div className="community-preview">
                  <h3 className="section-title">Community Highlights</h3>
                  <div className="empty-community">
                    <MessageSquare size={32} style={{ opacity: 0.1, marginBottom: "1rem" }} />
                    <p className="text-muted">Be the first to share a reflection on this verse.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      <VerseActionMenu
        showActionMenu={showActionMenu}
        selectedVerses={selectedVerses}
        menuPosition={menuPosition}
        isMounted={isMounted}
        copySuccess={copySuccess}
        saveSuccess={saveSuccess}
        isSaved={isSaved}
        isAnyHighlighted={isAnyHighlighted}
        handleShare={handleShare}
        handleSave={handleSave}
        handleHighlight={handleHighlight}
        handlePost={handlePost}
        onCancel={clearSelection}
      />

      {/* Annotation expand panel */}
      {activeAnnotation && isMounted && createPortal(
        <div
          className="annotation-expand-overlay"
          onClick={() => setActiveAnnotation(null)}
        >
          <div
            className="annotation-expand-panel glass-panel animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="annotation-panel-header">
              <span className="annotation-panel-ref">
                {currentBook} {currentChapter}:{activeAnnotation.verse} — Community Reflections
              </span>
              <button
                className="annotation-panel-close"
                onClick={() => setActiveAnnotation(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="annotation-panel-list">
              {activeAnnotation.posts.map((post: any) => (
                <div key={post.id} className="annotation-panel-item">
                  <div className="annotation-panel-author">
                    <span className="annotation-panel-name">{post.userName}</span>
                    <span className="annotation-panel-handle">{post.userHandle}</span>
                  </div>
                  <p className="annotation-panel-content">{post.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

import { Suspense } from "react";

export default function BiblePage() {
  return (
    <Suspense fallback={<div className="profile-loading">Loading reader...</div>}>
      <BibleReader />
    </Suspense>
  );
}
