import { useState, useEffect } from "react";
import { UserProfile, ChatRoom, LabTest } from "../types";
import { formatPrice } from "../lib/currency";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, getDoc, addDoc } from "firebase/firestore";
import { motion } from "motion/react";
import { MessageSquare, Wallet, FlaskConical, Plus, ChevronLeft, Microscope } from "lucide-react";
import { Link } from "react-router-dom";

export default function LabManagerDashboard({ user }: { user: UserProfile }) {
  const [activeChats, setActiveChats] = useState<any[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [managerUser, setManagerUser] = useState<UserProfile>(user);

  useEffect(() => {
    const fetchData = async () => {
      // Refresh current user for wallet
      const uSnap = await getDoc(doc(db, "users", user.uid));
      if (uSnap.exists()) setManagerUser(uSnap.data() as UserProfile);

      // Fetch Chats
      const q = query(
        collection(db, "chats"),
        where("expertId", "==", user.uid),
        orderBy("updatedAt", "desc")
      );
      const chatSnap = await getDocs(q);
      
      const chatData = await Promise.all(chatSnap.docs.map(async d => {
          const data = d.data();
          const userId = data.participants.find((p: string) => p !== user.uid);
          const userSnap = await getDoc(doc(db, "users", userId!));
          return { 
              id: d.id, 
              ...data, 
              userName: userSnap.exists() ? userSnap.data().name : "Unknown User",
              userImg: userSnap.exists() ? userSnap.data().profilePic : null
          };
      }));
      
      // Fetch Lab Tests
      const testSnap = await getDocs(collection(db, "labs"));
      
      setActiveChats(chatData);
      setLabTests(testSnap.docs.map(d => ({ id: d.id, ...d.data() } as LabTest)));
      setLoading(false);
    };
    fetchData();
  }, [user.uid]);

  return (
    <div className="flex flex-col flex-1 pb-32">
      <header className="p-4 pt-12 space-y-4">
        <h1 className="text-3xl font-black italic tracking-tighter">لوحة مدير المختبر</h1>
        
        <div className="primary-gradient p-6 rounded-3xl text-background-dark flex items-center justify-between shadow-xl shadow-primary/20">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">رصيد المختبر</p>
                <p className="text-3xl font-black">{formatPrice(managerUser.walletBalance, managerUser)}</p>
            </div>
            <div className="w-14 h-14 bg-background-dark/10 rounded-2xl flex items-center justify-center">
                <FlaskConical size={28} />
            </div>
        </div>
      </header>

      <main className="p-4 space-y-10">
        <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <MessageSquare size={18} className="text-primary" /> استفسارات المختبر
                </h2>
                <span className="text-[8px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">{activeChats.length} جديدة</span>
            </div>

            <div className="space-y-3">
                {loading ? (
                    <div className="h-24 glass rounded-3xl animate-pulse" />
                ) : activeChats.length > 0 ? (
                    activeChats.map((chat) => (
                        <Link to={`/chat/${chat.id}`} key={chat.id} className="glass rounded-3xl p-4 flex items-center justify-between group border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl glass p-0.5 relative">
                                    <div className="w-full h-full bg-white/5 rounded-[14px] flex items-center justify-center text-white/20">
                                        <Microscope size={20} />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary border-2 border-background-dark rounded-full"></div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm tracking-tight">{chat.userName}</h4>
                                    <p className="text-[10px] text-white/40 mt-1 line-clamp-1">{chat.lastMessage}</p>
                                </div>
                            </div>
                            <ChevronLeft size={16} className="text-white/20 group-hover:text-primary" />
                        </Link>
                    ))
                ) : (
                    <div className="text-center py-10 glass rounded-3xl text-white/20 font-bold uppercase tracking-widest text-[10px]">
                        لا تـوجـد رسـائـل
                    </div>
                )}
            </div>
        </section>

        <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-bold tracking-tight">إدارة الفحوصات</h2>
                <button className="bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 border border-primary/20">
                    <Plus size={12} /> إضافة فحص
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {labTests.map(test => (
                    <div key={test.id} className="glass rounded-2xl p-4 space-y-2 border border-white/5">
                        <h4 className="text-xs font-bold truncate tracking-tight">{test.name}</h4>
                        <p className="text-primary font-black text-xs">{test.price} ر.س</p>
                        <div className="flex gap-2 pt-1">
                            <button className="flex-1 py-2 bg-white/5 rounded-lg text-[8px] font-bold uppercase">تعديل</button>
                            <button className="flex-1 py-2 bg-red-500/10 text-red-500 rounded-lg text-[8px] font-bold uppercase">حذف</button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
      </main>
    </div>
  );
}
