import React from "react";
import { motion } from "motion/react";
import { UserProfile, MenuItem, Expert } from "../types";
import { Bell, Activity, Droplets, Zap, Star, Utensils, FlaskConical, Brain, Search, Sparkles, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link, useNavigate } from "react-router-dom";
import { getAiHealthAdvice } from "../services/aiAssistant";

import { t } from "../lib/translations";
import { formatPrice } from "../lib/currency";

export default function HomePage({ user }: { user: UserProfile | null }) {
  const [featuredFood, setFeaturedFood] = useState<MenuItem[]>([]);
  const [generalAdvice, setGeneralAdvice] = useState<string>("جاري تحضير نصيحتك الصحية اليومية...");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const foodSnap = await getDocs(query(collection(db, "menu"), limit(4)));
      setFeaturedFood(foodSnap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
      
      const CACHE_KEY = "daily_advice";
      const CACHE_TIME_KEY = "daily_advice_timestamp";
      const ONE_DAY = 24 * 60 * 60 * 1000;
      
      const cachedAdvice = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
      const now = Date.now();
      
      if (cachedAdvice && cachedTime && (now - parseInt(cachedTime)) < ONE_DAY) {
        setGeneralAdvice(cachedAdvice);
      } else {
        const advice = await getAiHealthAdvice("قدم نصيحة صحية قصيرة ومحفزة اليوم لزوار تطبيق NY11.");
        setGeneralAdvice(advice);
        localStorage.setItem(CACHE_KEY, advice);
        localStorage.setItem(CACHE_TIME_KEY, now.toString());
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col flex-1 pb-32 overflow-x-hidden">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-float" />
        <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[30%] bg-primary/5 blur-[100px] rounded-full" style={{ animationDelay: '3s' }} />
      </div>

      {/* Modern Header */}
      <header className="p-6 flex items-center justify-between sticky top-0 z-40 bg-background-dark/80 backdrop-blur-2xl border-b border-white/[0.03]">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/40 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
            <div className="w-12 h-12 primary-gradient rounded-2xl flex items-center justify-center text-background-dark shadow-xl relative z-10">
              <span className="font-black italic text-lg tracking-tighter">NY</span>
            </div>
          </div>
          <div>
            <h1 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">NY11 Clinic</h1>
            <p className="text-sm font-black italic tracking-tighter">{user?.name || "GUEST USER"}</p>
          </div>
        </motion.div>
        
        <div className="flex items-center gap-3">
          {user ? (
            <Link to="/profile" className="w-12 h-12 rounded-2xl glass flex items-center justify-center border-white/5 active:scale-95 transition-all">
              <img 
                src={user.profilePic || `https://ui-avatars.com/api/?name=${user.name}&background=8bc63f&color=000`} 
                className="w-8 h-8 rounded-lg object-cover" 
                alt="" 
              />
            </Link>
          ) : (
            <Link to="/auth" className="glass px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary border-primary/20">Login</Link>
          )}
        </div>
      </header>

      <main className="p-6 space-y-10">
        {/* Editorial Hero */}
        <section className="relative">
          <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="relative h-[420px] rounded-[3.5rem] overflow-hidden shadow-2xl group border border-white/10"
          >
            <img 
              src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800" 
              className="absolute inset-0 w-full h-full object-cover brightness-[0.4] group-hover:scale-105 transition-transform duration-[2s]"
              alt="Fitness"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/20 to-transparent" />
            
            <div className="absolute inset-0 p-10 flex flex-col justify-end">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-[1px] bg-primary" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">ELEVATE YOUR LIFE</span>
                </div>
                <h2 className="text-5xl font-black italic tracking-tighter uppercase whitespace-pre-line">
                  FUEL YOUR<br/>
                  <span className="text-glow text-primary italic">POTENTIAL</span>
                </h2>
                <p className="text-[var(--text-muted)] text-xs font-medium max-w-[200px] leading-relaxed">
                  Advanced nutritional science and laboratory precision, tailored for your goals.
                </p>
                <div className="pt-4">
                  <Link to="/menu" className="glass px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-3 group/btn hover:bg-primary hover:text-black transition-all">
                    Explore menu <Utensils size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Quick Insights Bento */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em] px-2">Daily Performance</h3>
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={<Activity size={18} />} title="Activity" value="84" unit="%" color="primary" />
            <StatCard icon={<Sparkles size={18} />} title="Nutrition" value="Goal" unit="" color="primary" />
            
            <div className="col-span-2 glass rounded-[2.5rem] p-8 border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <Brain size={80} />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">AI Intelligent Counsel</span>
                </div>
                <p className="text-lg font-bold leading-tight text-[var(--text-main)] italic max-w-[280px]">
                  "{generalAdvice}"
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Service Grid - Modern Minimal Icons */}
        <section className="grid grid-cols-4 gap-4">
          <CategoryItem to="/menu" icon={<Utensils size={24} />} label="Menu" />
          <CategoryItem to="/lab" icon={<FlaskConical size={24} />} label="Lab" />
          <CategoryItem to="/clinic" icon={<Activity size={24} />} label="Clinic" />
          <CategoryItem to="/plan" icon={<Search size={24} />} label="Track" />
        </section>

        {/* Curation Section */}
        <section className="space-y-6 pt-4">
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="text-2xl font-black italic tracking-tighter uppercase whitespace-pre-line">Chef's<br/><span className="text-primary not-italic">Selection</span></h2>
            </div>
            <Link to="/menu" className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
              <ArrowRight size={20} />
            </Link>
          </div>
          
          <div className="flex gap-6 overflow-x-auto no-scrollbar px-2 -mx-2">
            {featuredFood.map((item, idx) => (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={item.id} 
                className="min-w-[280px] group"
              >
                <Link to={`/menu/${item.id}`} className="block space-y-4">
                  <div className="h-[340px] rounded-[3rem] overflow-hidden relative shadow-xl ">
                    <img 
                      src={item.image} 
                      className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" 
                      alt="" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-6 right-6 glass px-4 py-2 rounded-xl">
                      <span className="text-[10px] font-black text-primary">{formatPrice(item.price, user)}</span>
                    </div>
                  </div>
                  <div className="px-4">
                    <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">{t(item.category)}</span>
                    <h4 className="text-lg font-black tracking-tighter uppercase truncate text-[var(--text-main)]">{t(item.name)}</h4>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, title, value, unit, color }: any) {
  return (
    <div className="glass rounded-[2.5rem] p-6 space-y-4 border-white/5 active:scale-95 transition-all">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black tracking-tighter text-[var(--text-main)]">{value}<span className="text-[10px] font-medium ml-1 opacity-40">{unit}</span></p>
      </div>
    </div>
  );
}

function CategoryItem({ to, icon, label }: any) {
  return (
    <Link to={to} className="group flex flex-col items-center gap-3">
      <div className="w-full aspect-square glass rounded-[2rem] flex items-center justify-center text-[var(--text-muted)] group-hover:text-primary group-hover:border-primary/30 transition-all active:scale-90 shadow-lg px-2">
        {icon}
      </div>
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">{label}</span>
    </Link>
  );
}
