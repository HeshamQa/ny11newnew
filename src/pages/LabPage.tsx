import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { LabTest, UserProfile, ChatRoom } from "../types";
import { formatPrice } from "../lib/currency";
import { motion } from "motion/react";
import { FlaskConical, Search, Dna, Microscope, HeartPulse, ChevronLeft, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LabPage({ user }: { user?: UserProfile | null }) {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, "labs"));
      setTests(snap.docs.map(d => ({ id: d.id, ...d.data() } as LabTest)));
      setLoading(false);
    };
    fetch();
  }, []);

  const startLabChat = async () => {
    if (!user) return navigate("/auth");

    setLoading(true);
    try {
      // Find a Lab Manager
      const managersQuery = query(collection(db, "users"), where("role", "==", "LAB_MANAGER"));
      const managerSnap = await getDocs(managersQuery);
      
      if (managerSnap.empty) {
        alert("عذراً، مدير المختبر غير متاح حالياً. يرجى المحاولة لاحقاً.");
        setLoading(false);
        return;
      }

      const managerId = managerSnap.docs[0].id;

      // Check for existing chat
      const chatsRef = collection(db, "chats");
      const q = query(
        chatsRef, 
        where("participants", "array-contains", user.uid),
        where("expertId", "==", managerId)
      );
      const snap = await getDocs(q);
      
      const chatRoom = snap.docs[0];

      if (!chatRoom) {
        const newRoom = await addDoc(collection(db, "chats"), {
          participants: [user.uid, managerId],
          expertId: managerId,
          type: "EXPERT",
          updatedAt: Date.now(),
          lastMessage: "بدأت الدردشة مع المختبر"
        });
        navigate(`/chat/${newRoom.id}`);
      } else {
        navigate(`/chat/${chatRoom.id}`);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col flex-1 pb-32">
      <header className="p-4 pt-8 bg-gradient-to-b from-primary/10 to-transparent">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-background-dark shadow-lg shadow-primary/20 rotate-12">
              <FlaskConical size={24} className="-rotate-12" />
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase underline decoration-primary decoration-4 underline-offset-4">المختبر الصحي</h1>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Lab & Diagnostics</p>
            </div>
          </div>
          <button 
            onClick={startLabChat}
            className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-primary shadow-xl border border-primary/20 hover:scale-110 transition-all active:scale-95"
          >
            <MessageCircle size={24} />
          </button>
        </div>

        <div className="glass rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-primary">لماذا التحاليل الطبية؟</h2>
          <p className="text-xs text-white/60 leading-relaxed">تساعدك التحاليل في فهم جسمك بشكل أدق وتصميم خطة غذائية ورياضية تناسب احتياجاتك البيولوجية وليست مجرد خطة عامة.</p>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <div className="grid grid-cols-3 gap-2">
          <Category icon={<Dna size={18} />} label="هرمونات" />
          <Category icon={<Microscope size={18} />} label="فيتامينات" />
          <Category icon={<HeartPulse size={18} />} label="شامل" />
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-sm px-1">الفحوصات المتاحة</h3>
          {loading ? (
            [1, 2].map(i => <div key={i} className="h-24 glass rounded-3xl animate-pulse" />)
          ) : (
            tests.map((test, idx) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={test.id}
                className="glass rounded-3xl p-4 flex items-center justify-between group border border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                    {test.image ? (
                        <img src={test.image} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <Microscope size={24} />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm tracking-tight">{test.name}</h4>
                    <p className="text-[10px] text-white/40 mt-1">{test.category} • نتائج خلال 24 ساعة</p>
                  </div>
                </div>
                <div className="text-left flex flex-col items-end gap-2">
                  <p className="font-black text-primary text-sm">{formatPrice(test.price, user || null)}</p>
                  <div className="flex items-center gap-2">
                    <button 
                        onClick={startLabChat}
                        className="p-2 glass text-white/40 rounded-xl hover:text-primary transition-colors"
                    >
                        <MessageCircle size={14} />
                    </button>
                    <button className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-tighter hover:gap-2 transition-all">
                        احجز <ChevronLeft size={10} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function Category({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="glass rounded-2xl p-4 flex flex-col items-center gap-2 text-white/50 hover:text-primary transition-colors hover:border-primary/50">
      <div className="opacity-50 group-hover:opacity-100">{icon}</div>
      <span className="text-[8px] font-bold tracking-widest uppercase">{label}</span>
    </button>
  );
}
