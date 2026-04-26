import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { MenuItem, UserProfile } from "../types";
import { motion } from "motion/react";
import { ArrowRight, Share2, Info, ShoppingBag, Flame, Zap, Droplets, Clock } from "lucide-react";
import { formatPrice } from "../lib/currency";
import { useCart } from "../context/CartContext";

export default function MenuItemPage({ user }: { user: UserProfile | null }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [item, setItem] = useState<MenuItem | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchItem = async () => {
            if (!id) return;
            const snap = await getDoc(doc(db, "menu", id));
            if (snap.exists()) {
                setItem({ id: snap.id, ...snap.data() } as MenuItem);
            }
            setLoading(false);
        };
        fetchItem();
    }, [id]);

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        alert("تم نسخ الرابط!");
    };

    if (loading) return <div className="p-8 text-center"><Info className="animate-spin mx-auto mb-2 text-primary" /> جاري التحميل...</div>;
    if (!item) return <div className="p-8 text-center text-white/40">المنتج غير موجود</div>;

    return (
        <div className="flex-1 flex flex-col pt-12 pb-32">
            <div className="px-6 flex items-center justify-between mb-8">
                <button onClick={() => navigate(-1)} className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-colors">
                    <ArrowRight size={20} />
                </button>
                <div className="text-center">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{item.category}</span>
                    <h1 className="text-xl font-black">{item.name}</h1>
                </div>
                <button onClick={handleShare} className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-colors">
                    <Share2 size={20} />
                </button>
            </div>

            <div className="px-6 space-y-8">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl border border-white/5 bg-white/5 relative"
                >
                    <img src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600"} className="w-full h-full object-cover" alt={item.name} />
                    <div className="absolute top-6 left-6 glass px-5 py-3 rounded-2xl flex flex-col items-center">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">السعر</p>
                      <p className="text-lg font-black text-primary">{formatPrice(item.price, user, item.currency)}</p>
                    </div>
                </motion.div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="glass rounded-3xl p-4 text-center border-white/5">
                        <Flame size={20} className="mx-auto mb-2 text-orange-500" />
                        <p className="text-lg font-black">{item.calories}</p>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">سعرة</p>
                    </div>
                    <div className="glass rounded-3xl p-4 text-center border-white/5">
                        <Zap size={20} className="mx-auto mb-2 text-blue-500" />
                        <p className="text-lg font-black">{item.protein}g</p>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">بروتين</p>
                    </div>
                    <div className="glass rounded-3xl p-4 text-center border-white/5">
                        <Droplets size={20} className="mx-auto mb-2 text-primary" />
                        <p className="text-lg font-black">{item.carbs}g</p>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">كارب</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Info size={18} className="text-primary"/> معلومات الوجبة
                    </h2>
                    <p className="text-white/60 leading-relaxed text-sm">
                        {item.description}
                    </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <div className="flex items-center gap-1"><Clock size={14}/> وقت التحضير: 15-20 دقيقة</div>
                  </div>
                </div>
            </div>

            <div className="fixed bottom-24 left-0 right-0 px-6 max-w-md mx-auto pointer-events-none">
              <button 
                onClick={() => addToCart(item, "MENU")}
                className="w-full primary-gradient text-background-dark py-6 rounded-[2.5rem] font-bold flex items-center justify-center gap-3 shadow-2xl pointer-events-auto active:scale-95 transition-all"
              >
                <ShoppingBag size={20} />
                أضف إلى السلة • {formatPrice(item.price, user, item.currency)}
              </button>
            </div>
        </div>
    );
}
