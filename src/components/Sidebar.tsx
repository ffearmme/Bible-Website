"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Book, User, Flame, Plus } from "lucide-react";
import "./Sidebar.css";
import { useSidebar } from "./LayoutWrapper";
import { useAuth } from "@/context/AuthContext";
import UserAvatar from "./UserAvatar";

interface SidebarProps {
  minimized?: boolean;
}

export default function Sidebar({ minimized = false }: SidebarProps) {
  const pathname = usePathname();
  const { setIsNewPostModalOpen } = useSidebar();
  const { user, userProfile, login } = useAuth();

  const navItems = [
    { name: "Explore", href: "/", icon: Compass },
    { name: "Bible", href: "/bible", icon: Book },
    { name: "Profile", href: "/profile", icon: User },
  ];

  const handleNewPost = () => {
    if (!user) {
      if (confirm("Please sign in to share a reflection.")) {
        login();
      }
      return;
    }
    setIsNewPostModalOpen(true);
  };

  return (
    <aside className={`app-sidebar glass-panel ${minimized ? "minimized" : ""}`}>
      <div className="sidebar-header">
        <Flame className="brand-icon" />
        {!minimized && <span className="brand-name">Logos</span>}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const isProfile = item.href === "/profile";
          const showAvatar = isProfile && user;
          
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`nav-link ${isActive ? "active" : ""}`}
              title={minimized ? item.name : ""}
            >
              {showAvatar ? (
                <UserAvatar 
                  uid={user.uid} 
                  initials={userProfile?.name?.split(/\s+/).filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || "U"}
                  photoURL={userProfile?.avatar || user.photoURL || ""}
                  name={userProfile?.name || user.displayName || "User"}
                  className="sidebar-avatar"
                />
              ) : (
                <item.icon className="nav-icon" />
              )}
              {!minimized && <span className="nav-label">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {minimized ? (
           <button 
             className="post-button-circle" 
             onClick={handleNewPost}
             title="New Post"
           >
             <Plus size={24} />
           </button>
        ) : (
           <button 
             className="post-button" 
             onClick={handleNewPost}
           >
             New Post
           </button>
        )}
      </div>
    </aside>
  );
}
