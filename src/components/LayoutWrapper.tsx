"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import React, { createContext, useContext, useState } from "react";
import NewPostModal from "@/components/NewPostModal";
import { Plus } from "lucide-react";

interface SidebarContextType {
  minimized: boolean;
  setMinimized: (val: boolean) => void;
  isNewPostModalOpen: boolean;
  setIsNewPostModalOpen: (val: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  minimized: false,
  setMinimized: () => {},
  isNewPostModalOpen: false,
  setIsNewPostModalOpen: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

import { AuthProvider, useAuth } from "@/context/AuthContext";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [minimized, setMinimized] = useState(false);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);

  return (
    <AuthProvider>
      <SidebarContext.Provider value={{ minimized, setMinimized, isNewPostModalOpen, setIsNewPostModalOpen }}>
        <LayoutContent>{children}</LayoutContent>
      </SidebarContext.Provider>
    </AuthProvider>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { minimized, isNewPostModalOpen, setIsNewPostModalOpen } = useSidebar();
  const { user, login } = useAuth();
  
  return (
    <div className="app-container">
      <Sidebar minimized={minimized} />
      <main className="main-content">
        {children}
      </main>
      
      {/* Mobile FAB */}
      <button 
        className="mobile-post-fab"
        onClick={() => {
          if (!user) {
            if (confirm("Please sign in to share a reflection.")) {
              login();
            }
            return;
          }
          setIsNewPostModalOpen(true);
        }}
        aria-label="New Post"
      >
        <Plus size={28} />
      </button>

      <NewPostModal 
        isOpen={isNewPostModalOpen} 
        onClose={() => setIsNewPostModalOpen(false)} 
      />
    </div>
  );
}
