import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, getDoc, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserProfile, ChatRoom } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, ChevronLeft, Bot, Search, Brain, FlaskConical, User, Trash2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function InboxPage({ user }: { user: UserProfile }) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let q;
    
    if (user.role === "TRAINER" || user.role === "LAB_MANAGER") {
        // Experts see chats where they are the designated expert
        q = query(
            collection(db, "chats"),
            where("expertId", "==", user.uid)
        );
    } else {
        // Users see chats where they are participants
        q = query(
            collection(db, "chats"),
            where("participants", "array-contains", user.uid)
        );
    }

    const unsub = onSnapshot(q, async (snap) => {
      const chatList = await Promise.all(snap.docs.map(async d => {
        const data = d.data() as ChatRoom;
        let otherPartyName = "Unknown";
        let otherPartyImg = null;
        let otherPartyRole = "";

        if (data.type === "AI") {
            otherPartyName = "المساعد الذكي";
            otherPartyRole = "AI Assistant";
        } else {
            const otherPartyId = data.participants.find(p => p !== user.uid) || data.expertId;
            if (otherPartyId && otherPartyId !== user.uid) {
                const partySnap = await getDoc(doc(db, "users", otherPartyId));
                if (partySnap.exists()) {
                    const pData = partySnap.data();
                    otherPartyName = pData.name;
                    otherPartyImg = pData.profilePic || pData.image;
                    otherPartyRole = pData.role === "TRAINER" ? "مدرب لياقة" : pData.role === "LAB_MANAGER" ? "مدير مختبر" : "عضو";
                }
            }
        }

        return {
          id: d.id,
          ...data,
          otherPartyName,
          otherPartyImg,
          otherPartyRole
        };
      }));
      
      chatList.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setChats(chatList);
      setLoading(false);
    }, (err) => {
        console.error("Error fetching chats:", err);
        setLoading(false);
    });

    return () => unsub();
  }, [user.uid, user.role]);

  const filteredChats = chats.filter(c => 
    c.otherPartyName.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 pb-32 overflow-x-hidden">
      <header className="p-6 pt-12 space-y-6">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">COMMS CENTER</h2>
                <h1 className="text-4xl font-black italic tracking-tighter uppercase text-[var(--text-main)]">
                    بريد<br/>
                    <span className="text-primary not-italic">الرسائل</span>
                </h1>
            </div>
            <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center text-primary shadow-xl">
                <MessageSquare size={28} />
            </div>
        </div>

        <div className="glass rounded-2xl px-5 py-4 flex items-center gap-4 border-white/5">
            <Search size={18} className="text-[var(--text-muted)]" />
            <input 
                type="text" 
                placeholder="ابحث في المحادثات..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-full font-bold placeholder:text-[var(--text-muted)] text-[var(--text-main)]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>
      </header>

      <main className="px-6 space-y-4">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-24 glass rounded-[2rem] animate-pulse" />)
        ) : filteredChats.length > 0 ? (
          <AnimatePresence>
            {filteredChats.map((chat, idx) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="glass rounded-[2rem] p-5 flex items-center gap-5 border-white/5 active:scale-95 transition-all cursor-pointer group"
              >
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl glass p-0.5 overflow-hidden">
                    {chat.type === "AI" ? (
                        <div className="w-full h-full primary-gradient flex items-center justify-center text-background-dark">
                            <Brain size={32} />
                        </div>
                    ) : (
                        <img 
                            src={chat.otherPartyImg || `https://ui-avatars.com/api/?name=${chat.otherPartyName}&background=8bc63f&color=000`} 
                            className="w-full h-full object-cover rounded-[14px]" 
                            alt="" 
                        />
                    )}
                  </div>
                  {chat.type !== "AI" && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary border-4 border-background-dark rounded-full"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-black text-sm tracking-tight text-[var(--text-main)] uppercase truncate pr-2">
                        {chat.otherPartyName}
                    </h3>
                    <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase">
                        {new Date(chat.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">{chat.otherPartyRole}</p>
                  <p className="text-xs text-[var(--text-muted)] font-medium truncate opacity-60">
                    {chat.lastMessage || "بدأت المحادثة الآن"}
                  </p>
                </div>

                <ChevronLeft size={16} className="text-white/10 group-hover:text-primary transition-colors transform translate-x-2" />
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="text-center py-20 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/5">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-5" />
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">لا توجد رسائل حالياً</p>
          </div>
        )}
      </main>

      {user.role === "USER" && (
        <div className="fixed bottom-32 left-8 z-[100]">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/clinic")}
            className="w-16 h-16 primary-gradient rounded-3xl flex items-center justify-center text-background-dark shadow-2xl shadow-primary/40 group overflow-hidden"
          >
            <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
          </motion.button>
          <p className="text-center text-[9px] font-black text-primary mt-2 uppercase tracking-widest">استشارة</p>
        </div>
      )}
    </div>
  );
}
