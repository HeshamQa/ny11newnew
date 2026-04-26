import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { LabTest, UserProfile } from "../types";
import { motion } from "motion/react";
import { ArrowRight, Share2, Info, ShoppingBag, FlaskConical, FileText, CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import { formatPrice } from "../lib/currency";
import { useCart } from "../context/CartContext";

export default function LabTestPage({ user }: { user: UserProfile | null }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [test, setTest] = useState<LabTest | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTest = async () => {
            if (!id) return;
            const snap = await getDoc(doc(db, "labs", id));
            if (snap.exists()) {
                setTest({ id: snap.id, ...snap.data() } as LabTest);
            }
            setLoading(false);
        };
        fetchTest();
    }, [id]);

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        alert("تم نسخ الرابط!");
    };

    if (loading) return <div className="p-8 text-center"><Info className="animate-spin mx-auto mb-2 text-primary" /> جاري التحميل...</div>;
    if (!test) return <div className="p-8 text-center text-white/40">التحليل غير موجود</div>;

    return (
        <div className="flex-1 flex flex-col pt-12 pb-32">
            <div className="px-6 flex items-center justify-between mb-8">
                <button onClick={() => navigate(-1)} className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-colors">
                    <ArrowRight size={20} />
                </button>
                <div className="text-center">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{test.category}</span>
                    <h1 className="text-xl font-black italic tracking-tighter uppercase whitespace-pre-line">{test.name}</h1>
                </div>
                <button onClick={handleShare} className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-colors">
                    <Share2 size={20} />
                </button>
            </div>

            <div className="px-6 space-y-8">
                <div className="glass rounded-[3rem] p-8 border-white/5 relative overflow-hidden bg-gradient-to-br from-primary/10 to-transparent">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -mr-16 -mt-16" />
                    <FlaskConical className="text-primary mb-6" size={48} />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-3xl font-black text-primary">{formatPrice(test.price, user, test.currency)}</p>
                        <div className="flex items-center gap-2 glass px-3 py-1 rounded-lg">
                          <Clock size={14} className="text-primary" />
                          <span className="text-[10px] font-bold">24-48 ساعة</span>
                        </div>
                      </div>
                      <p className="text-white/60 leading-relaxed text-sm">
                          {test.description}
                      </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-sm font-black uppercase tracking-widest text-white/40 px-2">ماذا يشمل هذا التحليل؟</h2>
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="glass rounded-2xl p-4 flex items-center gap-3 border-white/5">
                          <CheckCircle2 className="text-primary" size={18} />
                          <span className="text-sm font-medium">خطوة فحص رقم {i} المتعلقة بنوع التحليل</span>
                        </div>
                      ))}
                    </div>
                </div>

                <div className="glass rounded-3xl p-6 space-y-4 border-white/5">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="text-primary" size={24} />
                    <div>
                      <p className="font-bold text-sm">أمان وخصوصية تامة</p>
                      <p className="text-[10px] text-white/30 lowercase">نتائجك مشفرة ولا تظهر إلا لك ولطبيبك</p>
                    </div>
                  </div>
                </div>
            </div>

            <div className="fixed bottom-24 left-0 right-0 px-6 max-w-md mx-auto pointer-events-none">
              <button 
                onClick={() => addToCart(test, "LAB")}
                className="w-full primary-gradient text-background-dark py-6 rounded-[2.5rem] font-bold flex items-center justify-center gap-3 shadow-2xl pointer-events-auto active:scale-95 transition-all"
              >
                <ShoppingBag size={20} />
                أضف إلى السلة • {formatPrice(test.price, user, test.currency)}
              </button>
            </div>
        </div>
    );
}
