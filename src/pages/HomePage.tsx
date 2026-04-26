import { motion } from "motion/react";
import { UserProfile, FoodItem, Expert } from "../types";
import { Bell, Activity, Droplets, Zap, Star, Utensils, FlaskConical, Brain, Search, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link, useNavigate } from "react-router-dom";
import { getAiHealthAdvice } from "../services/aiAssistant";

import { formatPrice } from "../lib/currency";

export default function HomePage({ user }: { user: UserProfile | null }) {
  const [featuredFood, setFeaturedFood] = useState<FoodItem[]>([]);
  const [generalAdvice, setGeneralAdvice] = useState<string>("جاري تحضير نصيحتك الصحية اليومية...");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const foodSnap = await getDocs(query(collection(db, "menu"), limit(3)));
      setFeaturedFood(foodSnap.docs.map(d => ({ id: d.id, ...d.data() } as FoodItem)));
      
      const advice = await getAiHealthAdvice("قدم نصيحة صحية قصيرة ومحفزة اليوم لزوار تطبيق NY11.");
      setGeneralAdvice(advice);
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col flex-1 pb-32">
      {/* Header */}
      <header className="p-4 flex items-center justify-between sticky top-0 z-10 bg-background-dark/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
            <span className="font-black italic text-sm">NY11</span>
          </div>
          <div>
            <h1 className="text-xs font-bold text-white/40 uppercase tracking-tighter">مرحباً بك</h1>
            <p className="text-sm font-bold">{user?.name || "زائر"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <button className="w-10 h-10 rounded-full glass flex items-center justify-center text-white/60">
              <Bell size={18} />
            </button>
          ) : (
            <Link to="/auth" className="text-xs font-bold text-primary">دخول</Link>
          )}
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Main Hero Banner */}
        <section className="relative h-56 rounded-[2rem] overflow-hidden group shadow-2xl shadow-primary/10">
          <img 
            src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=800" 
            className="absolute inset-0 w-full h-full object-cover brightness-50 group-hover:scale-105 transition-transform duration-1000"
            alt="Healthy Food"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent"></div>
          <div className="absolute inset-0 p-8 flex flex-col justify-end gap-2">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-3 py-1 bg-primary text-black w-fit rounded-full text-[10px] font-black uppercase tracking-widest"
            >
              جديد اليوم
            </motion.div>
            <h2 className="text-3xl font-black text-white leading-none tracking-tighter">صحتك تبدأ<br/><span className="text-primary italic">من اختيارك</span></h2>
          </div>
        </section>

        {/* User Stats or AI Suggestion */}
        {user ? (
          <section className="grid grid-cols-2 gap-4">
            <div className="col-span-2 glass rounded-3xl p-6 border-l-4 border-l-primary">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Sparkles size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">توجيه ذكي مخصص</span>
              </div>
              <p className="text-sm leading-relaxed text-white/80">
                {user.aiInsights || "أكمل ملفك الشخصي لنتمكن من تقديم نصائح مخصصة لهدفك."}
              </p>
            </div>
            <StatCard icon={<Activity size={16} />} title="النشاط" value="4.8k" unit="خطوة" color="amber" />
            <StatCard icon={<Droplets size={16} />} title="الماء" value="2.1" unit="لتر" color="blue" />
          </section>
        ) : (
          <section className="glass rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                <Brain size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold opacity-40 uppercase tracking-widest">نصيحة الفريق الذكي</h3>
                <h4 className="text-xs font-bold">إلهام صحي يومي</h4>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/70 italic">"{generalAdvice}"</p>
          </section>
        )}

        {/* Categories Bento */}
        <section className="grid grid-cols-4 gap-3">
          <CategoryItem to="/menu" icon={<Utensils size={20} />} label="المنيو" />
          <CategoryItem to="/lab" icon={<FlaskConical size={20} />} label="المختبر" />
          <CategoryItem to="/clinic" icon={<Activity size={20} />} label="العيادة" />
          <CategoryItem to="/plan" icon={<Search size={20} />} label="الخطط" />
        </section>

        {/* Quick Menu Preview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black tracking-tight uppercase italic underline decoration-primary/30 decoration-4 underline-offset-4">قائمة مختارة</h2>
            <Link to="/menu" className="text-xs font-bold text-primary">عرض الكل</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
            {featuredFood.map((item) => (
              <Link to="/menu" key={item.id} className="min-w-[200px] glass rounded-3xl overflow-hidden group block">
                <div className="h-28 overflow-hidden">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                </div>
                <div className="p-4">
                  <h4 className="text-xs font-bold truncate">{item.name}</h4>
                  <p className="text-primary font-black text-sm mt-1">{formatPrice(item.price, user)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, title, value, unit, color }: any) {
  const colors: any = {
    amber: "text-amber-400 border-l-amber-400",
    blue: "text-blue-400 border-l-blue-400",
    primary: "text-primary border-l-primary"
  };
  return (
    <div className={`glass rounded-3xl p-5 space-y-2 border-l-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 opacity-70">
        {icon}
        <span className="text-[10px] font-bold uppercase">{title}</span>
      </div>
      <p className="text-xl font-black tracking-tight">{value} <span className="text-[10px] font-normal opacity-50">{unit}</span></p>
    </div>
  );
}

function CategoryItem({ to, icon, label }: any) {
  return (
    <Link to={to} className="glass rounded-2xl aspect-square flex flex-col items-center justify-center gap-2 group hover:border-primary/50 transition-all">
      <div className="text-white/30 group-hover:text-primary transition-colors">{icon}</div>
      <span className="text-[8px] font-bold uppercase tracking-widest text-white/40">{label}</span>
    </Link>
  );
}
