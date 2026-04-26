import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, orderBy, onSnapshot, addDoc, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { ChatMessage, ChatRoom, UserProfile, Expert } from "../types";
import { formatPrice } from "../lib/currency";
import { motion, AnimatePresence } from "motion/react";
import { Send, ChevronRight, MoreVertical, Paperclip, Bot, User, Trophy, FlaskConical, DollarSign } from "lucide-react";
import { getAiHealthAdvice } from "../services/aiAssistant";

export default function ChatPage({ user }: { user: UserProfile }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [expert, setExpert] = useState<Expert | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;

    const unsubRoom = onSnapshot(doc(db, "chats", id), async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ChatRoom;
        setRoom({ id: snap.id, ...data });
        
        if (data.type === "EXPERT" && data.expertId) {
          const expertSnap = await getDoc(doc(db, "experts", data.expertId));
          if (expertSnap.exists()) {
            setExpert({ id: expertSnap.id, ...expertSnap.data() } as Expert);
          }
        }
      }
    });

    const q = query(collection(db, "chats", id, "messages"), orderBy("timestamp", "asc"));
    const unsubMsg = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    });

    return () => {
      unsubRoom();
      unsubMsg();
    };
  }, [id]);

  const sendMessage = async () => {
    if (!text.trim() || !id || !room) return;
    
    const msgText = text;
    setText("");

    const msgData = {
      senderId: user.uid,
      text: msgText,
      timestamp: Date.now(),
      type: "TEXT" as const
    };

    await addDoc(collection(db, "chats", id, "messages"), msgData);
    await updateDoc(doc(db, "chats", id), {
        lastMessage: msgText,
        updatedAt: Date.now()
    });

    if (room.type === "AI") {
        setIsAiLoading(true);
        const history = messages.map(m => ({
            role: m.senderId === user.uid ? "user" : "model",
            parts: [{ text: m.text }]
        }));
        const aiResponse = await getAiHealthAdvice(msgText, history);
        
        await addDoc(collection(db, "chats", id, "messages"), {
            senderId: "AI",
            text: aiResponse,
            timestamp: Date.now(),
            type: "TEXT"
        });
        
        await updateDoc(doc(db, "chats", id), {
            lastMessage: aiResponse,
            updatedAt: Date.now()
        });
        setIsAiLoading(false);
    }
  };

  const sendQuote = async () => {
    const amount = prompt("أدخل قيمة عرض السعر (ريال):");
    if (!amount || isNaN(parseFloat(amount))) return;
    
    if (!id || !room) return;

    const baseAmount = parseFloat(amount);
    const quoteMsg = `تم إرسال عرض سعر بقيمة ${formatPrice(baseAmount, user)}.`;
    
    await addDoc(collection(db, "chats", id, "messages"), {
      senderId: user.uid,
      text: quoteMsg,
      timestamp: Date.now(),
      type: "QUOTE",
      quoteAmount: baseAmount
    });

    await updateDoc(doc(db, "chats", id), {
        lastMessage: quoteMsg,
        updatedAt: Date.now()
    });
  };

  const acceptQuote = async (msgId: string, amount: number) => {
    if (user.walletBalance < amount) {
        alert("رصيد محفظتك غير كافٍ");
        return;
    }
    
    if (!confirm("هل تريد قبول عرض السعر هذا؟ سيتم خصم المبلغ من محفظتك.")) return;

    try {
        setLoading(true);
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { walletBalance: user.walletBalance - amount });
        
        if (room?.expertId) {
            const expertRef = doc(db, "users", room.expertId);
            const expertSnap = await getDoc(expertRef);
            if (expertSnap.exists()) {
                await updateDoc(expertRef, { walletBalance: (expertSnap.data().walletBalance || 0) + amount });
            }
        }

        await updateDoc(doc(db, "chats", id!, "messages", msgId), { type: "TEXT", text: "تم قبول عرض السعر بنجاح ✅" });
        alert("تم الدفع بنجاح");
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  if (!room) return <div className="p-8 text-center opacity-30">جارِ التحميل...</div>;

  return (
    <div className="flex flex-col h-screen bg-[#0a0c10] relative z-[60]">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-white/5 glass sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center">
            <ChevronRight size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden glass p-0.5 relative">
              {room.type === "AI" ? (
                <div className="w-full h-full bg-primary flex items-center justify-center text-background-dark">
                  <Bot size={20} />
                </div>
              ) : (
                <img src={expert?.image} className="w-full h-full object-cover rounded-[10px]" alt="" />
              )}
              {expert?.online && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary border-2 border-background-dark rounded-full"></div>}
            </div>
            <div>
              <h1 className="text-sm font-bold">{room.type === "AI" ? "المساعد الصحي الذكي" : expert?.name}</h1>
              <p className="text-[10px] text-primary">{room.type === "AI" ? "متصل دائماً" : (expert?.role === "TRAINER" ? "مدرب لياقة" : "مدير مختبر")}</p>
            </div>
          </div>
        </div>
        <button className="w-10 h-10 rounded-xl glass flex items-center justify-center text-white/40">
          <MoreVertical size={18} />
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              key={m.id}
              className={`flex ${m.senderId === user.uid ? "justify-start" : "justify-end"}`}
            >
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                m.senderId === user.uid 
                  ? "bg-primary text-black rounded-tr-none font-medium" 
                  : "glass text-white rounded-tl-none border border-white/5"
              }`}>
                {m.type === "QUOTE" ? (
                    <div className="space-y-3">
                        <p className="font-bold flex items-center gap-2"><DollarSign size={14}/> عرض سعر مخصص</p>
                        <p className="text-xl font-black">{formatPrice(m.quoteAmount || 0, user)}</p>
                        {m.senderId !== user.uid && (
                            <button 
                                onClick={() => acceptQuote(m.id, m.quoteAmount || 0)}
                                className="w-full bg-primary text-black py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-primary/20"
                            >
                                قبول والدفع الآن
                            </button>
                        )}
                    </div>
                ) : m.text}
                <p className={`text-[8px] mt-1 opacity-40 ${m.senderId === user.uid ? "text-black" : "text-white"}`}>
                    {new Date(m.timestamp).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </motion.div>
          ))}
          {isAiLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
                <div className="glass p-4 rounded-2xl rounded-tl-none">
                    <div className="flex gap-1">
                        <div className="w-1 h-1 bg-primary rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-75"></div>
                        <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-150"></div>
                    </div>
                </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Input */}
      <footer className="p-4 pb-8 space-y-4 bg-background-dark/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
            {(user.role === "TRAINER" || user.role === "LAB_MANAGER") && room.type === "EXPERT" && (
                <button 
                    onClick={sendQuote}
                    className="w-14 h-14 glass text-primary rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all border border-primary/20"
                    title="ارسال عرض سعر"
                >
                    <DollarSign size={20} />
                </button>
            )}
            <div className="flex-1 glass rounded-2xl flex items-center px-4 py-1 border border-white/5 focus-within:border-primary/50 transition-all">
                <input 
                    type="text" 
                    placeholder="اكتب رسالتك هنا..." 
                    className="bg-transparent border-none focus:ring-0 text-sm flex-1 py-4"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button className="text-white/20 hover:text-primary transition-colors">
                    <Paperclip size={18} />
                </button>
            </div>
            <button 
                onClick={sendMessage}
                className="w-14 h-14 bg-primary text-black rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all"
            >
                <Send size={20} className="transform rotate-180" />
            </button>
        </div>
      </footer>
    </div>
  );
}
