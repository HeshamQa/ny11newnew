import React, { useState, useEffect } from "react";
import { UserProfile, FoodItem } from "../types";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Utensils, Brain, Sparkles, ChevronLeft, Plus, Trash2, ShoppingBag } from "lucide-react";
import { getAiHealthAdvice } from "../services/aiAssistant";

export default function PlanPage({ user }: { user: UserProfile }) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [menu, setMenu] = useState<FoodItem[]>([]);

  useEffect(() => {
    const fetchMenu = async () => {
      const snap = await getDocs(collection(db, "menu"));
      setMenu(snap.docs.map(d => ({ id: d.id, ...d.data() } as FoodItem)));
    };
    fetchMenu();
  }, []);

  const generatePlan = async () => {
    setLoading(true);
    const menuNames = menu.map(m => m.name).join(", ");
    const prompt = `المستخدم عمره ${user.age} وهدفه ${user.goal}. 
    الرجاء تصميم جدول غذائي ليوم واحد (فطور، غداء، عشاء) حصراً من هذه الوجبات المتاحة في مطعمنا: [${menuNames}]. 
    نسق الإجابة كـ JSON بهذا الشكل: 
    { "breakfast": "اسم الوجبة", "lunch": "اسم الوجبة", "dinner": "اسم الوجبة", "reason": "لماذا هذا الجدول مناسب لهدفه؟" }`;

    try {
      const response = await getAiHealthAdvice(prompt);
      // Try to parse JSON from AI response
      const jsonStr = response.match(/\{.*\}/s)?.[0];
      if (jsonStr) {
        setPlan(JSON.parse(jsonStr));
      } else {
        // Fallback if AI doesn't return clean JSON
        setPlan({ error: "تعذر تحليل الجدول، يرجى المحاولة مرة أخرى." });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 pb-32">
      <header className="p-6 pt-12 space-y-2">
        <h1 className="text-3xl font-black italic tracking-tighter">جدولك الغذائي الذكي</h1>
        <p className="text-xs text-white/40 uppercase tracking-widest font-bold">AI Personalized Meal Plan</p>
      </header>

      <main className="p-4 space-y-8">
        {!plan && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="primary-gradient p-8 rounded-[2.5rem] text-background-dark text-center space-y-6 shadow-2xl shadow-primary/20"
          >
            <div className="w-20 h-20 bg-background-dark/10 rounded-3xl flex items-center justify-center mx-auto">
              <Brain size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black">صمم يومك بذكاء</h2>
              <p className="text-xs font-bold leading-relaxed opacity-70">سيقوم الـ AI باختيار أفضل 3 وجبات من المنيو الخاص بنا بناءً على هدفك: {user.goal === "LOSE_WEIGHT" ? "تخفيف الوزن" : "زيادة الوزن"}</p>
            </div>
            <button 
              onClick={generatePlan}
              disabled={loading}
              className="w-full bg-background-dark text-white py-5 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "جاري التصميم..." : "توليد الجدول الآن"}
              <Sparkles size={18} />
            </button>
          </motion.div>
        )}

        {plan && !plan.error && (
          <div className="space-y-6">
            <div className="glass rounded-3xl p-6 border-l-4 border-l-primary">
                <div className="flex items-center gap-2 text-primary mb-2">
                    <Sparkles size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">توجيه ذكي</span>
                </div>
                <p className="text-xs leading-relaxed text-white/70 italic">{plan.reason}</p>
            </div>

            <div className="space-y-4">
              <MealRow icon="🌅" label="الفطور" meal={plan.breakfast} menu={menu} />
              <MealRow icon="☀️" label="الغداء" meal={plan.lunch} menu={menu} />
              <MealRow icon="🌙" label="العشاء" meal={plan.dinner} menu={menu} />
            </div>

            <button 
              onClick={() => setPlan(null)}
              className="w-full py-4 text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-white transition-colors"
            >
              إعادة تصميم الجدول
            </button>
          </div>
        )}

        {plan?.error && (
            <div className="text-center py-20 text-red-400 font-bold">{plan.error}</div>
        )}
      </main>
    </div>
  );
}

function MealRow({ icon, label, meal, menu }: any) {
    const item = menu.find((m: any) => m.name === meal);
    return (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-3xl p-4 flex items-center gap-4 border border-white/5"
        >
            <div className="text-2xl w-12 h-12 glass rounded-2xl flex items-center justify-center">{icon}</div>
            <div className="flex-1">
                <p className="text-[10px] font-bold text-primary uppercase">{label}</p>
                <h4 className="text-sm font-bold truncate">{meal}</h4>
                {item && <p className="text-[10px] text-white/30">{item.calories} سعرة</p>}
            </div>
            {item && (
                <button className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-black transition-colors">
                    <ShoppingBag size={16} />
                </button>
            )}
        </motion.div>
    );
}
