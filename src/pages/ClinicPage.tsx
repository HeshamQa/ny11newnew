import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { Expert, UserProfile, ChatRoom } from "../types";
import { formatPrice } from "../lib/currency";
import { motion } from "motion/react";
import { Star, MessageCircle, Info, Activity, ShieldCheck, Trophy, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ClinicPage({ user }: { user: UserProfile }) {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, "experts"));
      setExperts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expert)));
      setLoading(false);
    };
    fetch();
  }, []);

  const startChat = async (expertId: string, type: "EXPERT" | "AI") => {
    // Check for existing chat
    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef, 
      where("participants", "array-contains", user.uid),
      where("type", "==", type)
    );
    const snap = await getDocs(q);
    
    let chatRoom = snap.docs.find(d => {
        const data = d.data() as ChatRoom;
        return type === "AI" ? true : data.expertId === expertId;
    });

    if (!chatRoom) {
      const newRoom = await addDoc(collection(db, "chats"), {
        participants: [user.uid, expertId].filter(id => id !== "AI"),
        expertId: expertId === "AI" ? null : expertId,
        type: type,
        updatedAt: Date.now(),
        lastMessage: "بدأت الدردشة الآن"
      });
      navigate(`/chat/${newRoom.id}`);
    } else {
      navigate(`/chat/${chatRoom.id}`);
    }
  };

  return (
    <div className="flex flex-col flex-1 pb-32">
      <header className="p-4 pt-8 space-y-2">
        <h1 className="text-2xl font-black italic tracking-tighter">العيادة والاستشارات</h1>
        <p className="text-xs text-white/40">تحدث مع نخبة من المدربين ومدراء المختبرات للحصول على خطة مخصصة.</p>
      </header>

      <main className="p-4 space-y-8">
        {/* AI Banner */}
        <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => startChat("AI", "AI")}
            className="primary-gradient rounded-3xl p-6 flex items-center justify-between overflow-hidden relative group cursor-pointer shadow-xl shadow-primary/20"
        >
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:rotate-12 transition-transform duration-500">
            <Brain size={120} />
          </div>
          <div className="relative z-10 space-y-1">
            <h3 className="text-xl font-black text-background-dark">المساعد الصحي الذكي</h3>
            <p className="text-[10px] text-background-dark/60 font-bold">بواسطة الذكاء الاصطناعي - متوفر 24/7</p>
          </div>
          <div className="bg-background-dark text-primary px-4 py-2 rounded-xl text-[10px] font-bold">دردشة</div>
        </motion.div>

        {/* Categories (Simplified filters) */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 glass px-4 py-2 rounded-full text-[10px] font-bold text-primary border-primary/20 whitespace-nowrap">
                <Trophy size={14} /> مدربون رياضيون
            </div>
            <div className="flex items-center gap-2 glass px-4 py-2 rounded-full text-[10px] font-bold text-white/40 whitespace-nowrap">
                <ShieldCheck size={14} /> مدراء مختبرات
            </div>
            <div className="flex items-center gap-2 glass px-4 py-2 rounded-full text-[10px] font-bold text-white/40 whitespace-nowrap">
                <Activity size={14} /> أخصائيون
            </div>
        </div>

        {/* Experts List */}
        <section className="space-y-4">
            <h2 className="text-sm font-bold px-1">الخبراء المتاحون</h2>
            {loading ? (
                [1, 2, 3].map(i => <div key={i} className="h-28 glass rounded-3xl animate-pulse" />)
            ) : (
                experts.map((expert, idx) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={expert.id}
                        className="glass rounded-3xl p-4 flex gap-4 items-center group border border-white/5"
                    >
                        <div className="w-20 h-24 rounded-2xl overflow-hidden shrink-0 relative">
                            <img src={expert.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={expert.name} />
                            {expert.online && <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full border-2 border-background-dark"></div>}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-bold text-primary uppercase tracking-widest">
                                    {expert.role === "TRAINER" ? "مدرب رياضي" : "مدير مختبر"}
                                </span>
                                <div className="flex items-center gap-1 text-amber-400">
                                    <Star size={10} fill="currentColor" />
                                    <span className="text-[10px] font-bold">{expert.rating}</span>
                                </div>
                            </div>
                            <h3 className="font-bold text-sm">{expert.name}</h3>
                            <p className="text-[10px] text-white/40 leading-tight line-clamp-1">{expert.bio}</p>
                            <div className="flex items-center justify-between pt-2">
                                <p className="text-primary font-black text-xs">{formatPrice(expert.price, user)} <span className="text-[8px] font-normal">/ استشارة</span></p>
                                <button 
                                    onClick={() => startChat(expert.id, "EXPERT")}
                                    className="bg-primary/20 text-primary p-2 rounded-xl hover:bg-primary hover:text-black transition-all active:scale-90"
                                >
                                    <MessageCircle size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))
            )}
        </section>
      </main>
    </div>
  );
}
