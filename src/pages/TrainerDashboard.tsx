import { useState, useEffect } from "react";
import { UserProfile, ChatRoom } from "../types";
import { formatPrice } from "../lib/currency";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { motion } from "motion/react";
import { MessageSquare, Wallet, Trophy, User, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function TrainerDashboard({ user }: { user: UserProfile }) {
  const [activeChats, setActiveChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trainerUser, setTrainerUser] = useState<UserProfile>(user);

  useEffect(() => {
    const fetch = async () => {
      // Refresh current trainer state for wallet
      const tSnap = await getDoc(doc(db, "users", user.uid));
      if (tSnap.exists()) setTrainerUser(tSnap.data() as UserProfile);

      const q = query(
        collection(db, "chats"),
        where("expertId", "==", user.uid)
      );
      const snap = await getDocs(q);
      
      const chatData = await Promise.all(snap.docs.map(async d => {
          const data = d.data() as ChatRoom;
          const userId = data.participants.find((p: string) => p !== user.uid);
          const userSnap = await getDoc(doc(db, "users", userId!));
          return { 
              ...data, 
              id: d.id, 
              userName: userSnap.exists() ? userSnap.data().name : "Unknown User",
              userImg: userSnap.exists() ? userSnap.data().profilePic : null
          };
      }));
      
      setActiveChats(chatData.sort((a, b) => b.updatedAt - a.updatedAt));
      setLoading(false);
    };
    fetch();
  }, [user.uid]);

  return (
    <div className="flex flex-col flex-1 pb-32">
      <header className="p-4 pt-12 space-y-4">
        <h1 className="text-3xl font-black italic tracking-tighter">لوحة تحكم المدرب</h1>
        
        <div className="primary-gradient p-6 rounded-3xl text-background-dark flex items-center justify-between shadow-xl shadow-primary/20">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">رصيدك الكلي</p>
                <p className="text-3xl font-black">{formatPrice(trainerUser.walletBalance, trainerUser)}</p>
            </div>
            <div className="w-14 h-14 bg-background-dark/10 rounded-2xl flex items-center justify-center">
                <Trophy size={28} />
            </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <h2 className="text-xl font-bold tracking-tight px-1 flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" /> الرسائل القادمة
        </h2>

        <div className="space-y-4">
            {loading ? (
                [1, 2].map(i => <div key={i} className="h-24 glass rounded-3xl animate-pulse" />)
            ) : activeChats.length > 0 ? (
                activeChats.map((chat) => (
                    <Link to={`/chat/${chat.id}`} key={chat.id} className="glass rounded-3xl p-4 flex items-center justify-between group hover:border-primary/30 transition-all border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl glass p-0.5 relative">
                                <img src={chat.userImg || `https://ui-avatars.com/api/?name=${chat.userName}`} className="w-full h-full object-cover rounded-[14px]" alt="" />
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary border-2 border-background-dark rounded-full"></div>
                            </div>
                            <div>
                                <h4 className="font-bold text-sm tracking-tight">{chat.userName}</h4>
                                <p className="text-[10px] text-white/40 mt-1 line-clamp-1">{chat.lastMessage}</p>
                            </div>
                        </div>
                        <ChevronLeft size={16} className="text-white/20 group-hover:text-primary transition-colors" />
                    </Link>
                ))
            ) : (
                <div className="text-center py-20 text-white/20 border-2 border-dashed border-white/5 rounded-3xl text-xs font-bold uppercase tracking-widest">
                    لا تـوجـد رسـائـل حـالـيـاً
                </div>
            )}
        </div>

        {/* Action Suggestion */}
        <div className="glass p-6 rounded-3xl space-y-3">
            <h3 className="text-sm font-bold text-primary">نصيحة للمدرب:</h3>
            <p className="text-xs text-white/60 leading-relaxed">قم بالرد السريع على استفسارات المشتركين وإرسال عرض سعر (كوتة) مخصص لجلسات التدريب لزيادة دخلك في المحفظة.</p>
        </div>
      </main>
    </div>
  );
}
