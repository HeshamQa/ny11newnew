import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { ArrowMirror, X, Trash2, ShoppingBag, Plus, Minus, CreditCard, ChevronLeft } from "lucide-react";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../lib/currency";
import { db } from "../lib/firebase";
import { collection, addDoc, doc, updateDoc, increment } from "firebase/firestore";

export default function CartPage({ user }: { user: UserProfile | null }) {
    const navigate = useNavigate();
    const { items, total, removeFromCart, updateQuantity, clearCart } = useCart();
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        if (!user) {
            navigate("/auth");
            return;
        }

        if (user.walletBalance < total) {
            alert("رصيد المحفظة غير كافٍ!");
            return;
        }

        setLoading(true);
        try {
            // Deduct from wallet
            await updateDoc(doc(db, "users", user.uid), {
                walletBalance: increment(-total)
            });

            // Create Order
            await addDoc(collection(db, "orders"), {
                userId: user.uid,
                userName: user.name,
                items: items,
                total: total,
                timestamp: Date.now(),
                status: "PAID"
            });

            // Create Transaction Record
            await addDoc(collection(db, "transactions"), {
                userId: user.uid,
                amount: total,
                type: "PURCHASE",
                description: `شراء ${items.length} منتجات`,
                timestamp: Date.now()
            });

            clearCart();
            alert("تمت عملية الشراء بنجاح!");
            navigate("/");
        } catch (error) {
            console.error("Checkout error:", error);
            alert("فشلت عملية الدفع");
        }
        setLoading(false);
    };

    if (items.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
                <div className="w-24 h-24 glass rounded-[2.5rem] flex items-center justify-center text-white/10">
                    <ShoppingBag size={48} />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold">سلة المشتريات فارغة</h2>
                    <p className="text-white/40 text-xs mt-1">ابدأ بإضافة بعض الوجبات أو التحاليل</p>
                </div>
                <button 
                    onClick={() => navigate("/menu")}
                    className="primary-gradient text-background-dark px-10 py-4 rounded-2xl font-bold text-sm shadow-xl"
                >
                    تصفح المنيو
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col pt-12 pb-32">
            <div className="px-6 flex items-center justify-between mb-8">
                <button onClick={() => navigate(-1)} className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-white/40">
                    <ChevronLeft size={20} />
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-black italic tracking-tighter uppercase">سلة المشتريات</h1>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{items.length} منتجات</p>
                </div>
                <div className="w-12" />
            </div>

            <div className="px-6 space-y-4 flex-1 overflow-y-auto no-scrollbar pb-12">
                <AnimatePresence>
                    {items.map((item) => (
                        <motion.div 
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="glass rounded-3xl p-4 flex gap-4 items-center border-white/5"
                        >
                            <div className="w-20 h-20 rounded-2xl overflow-hidden glass shrink-0">
                                {item.image ? (
                                    <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                                        <ShoppingBag size={24} />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-sm truncate pr-2">{item.name}</h3>
                                    <button onClick={() => removeFromCart(item.id)} className="text-white/20 hover:text-red-500 transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>
                                <p className="text-[10px] font-bold text-primary mt-1">{formatPrice(item.price, user, item.currency)}</p>
                                
                                <div className="flex items-center gap-3 mt-3">
                                    <div className="flex items-center glass rounded-xl border-white/10 px-1">
                                        <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white"><Minus size={14} /></button>
                                        <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white"><Plus size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="px-6 pb-6 pt-4 space-y-4 bg-background-dark/80 backdrop-blur-xl border-t border-white/5">
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-white/30 px-2 uppercase font-bold tracking-widest">
                        <span>المجموع الفرعي</span>
                        <span>{formatPrice(total, user)}</span>
                    </div>
                </div>

                <button 
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full primary-gradient text-background-dark py-6 rounded-3xl font-black flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all disabled:opacity-50"
                >
                    {loading ? (
                        <span className="animate-pulse">جاري الدفع...</span>
                    ) : (
                        <>
                            <CreditCard size={20} />
                            إتمام الشراء • {formatPrice(total, user)}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
