import { useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { MenuItem, UserProfile } from "../types";
import { formatPrice } from "../lib/currency";
import { motion } from "motion/react";
import { Search, Filter, ShoppingBag, Info, Activity, Zap, Plus, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function MenuPage({ user }: { user?: UserProfile | null }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchItems = async () => {
      const snap = await getDocs(collection(db, "menu"));
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
      setLoading(false);
    };
    fetchItems();
  }, []);

  const categories = [
    { id: "ALL", ar: "الكل", en: "ALL" },
    { id: "سلطات", ar: "سلطات", en: "SALADS" },
    { id: "وجبات رئيسية", ar: "وجبات رئيسية", en: "MEALS" },
    { id: "فطور", ar: "فطور", en: "BREAKFAST" },
    { id: "مشروبات", ar: "مشروبات", en: "DRINKS" }
  ];

  const filtered = items.filter(item => 
    (selectedCategory === "ALL" || item.category === selectedCategory) &&
    (item.name.includes(search) || (item.description && item.description.includes(search)))
  );

  return (
    <div className="flex flex-col flex-1 pb-40 overflow-x-hidden">
      <header className="p-6 pt-10 space-y-8">
        <div className="space-y-1">
          <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">GASTRONOMY</h2>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase whitespace-pre-line text-[var(--text-main)]">
            DIETARY<br/>
            <span className="text-primary not-italic">EXCELLENCE</span>
          </h1>
        </div>
        
        <div className="flex gap-3">
          <div className="flex-1 glass rounded-2xl px-5 py-4 flex items-center gap-4 border-white/5">
            <Search size={18} className="text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Find your fuel..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full font-bold placeholder:text-[var(--text-muted)] text-[var(--text-main)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="w-14 h-14 glass rounded-2xl flex items-center justify-center text-[var(--text-muted)] hover:text-primary transition-colors border-white/5">
            <Filter size={18} />
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-2 px-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-8 py-3 rounded-2xl text-[10px] font-black tracking-widest whitespace-nowrap transition-all border ${
                selectedCategory === cat.id 
                  ? "bg-primary text-black border-primary shadow-lg shadow-primary/20" 
                  : "glass text-[var(--text-muted)] border-white/5"
              }`}
            >
              {cat.en}
            </button>
          ))}
        </div>
      </header>

      <main className="px-6 grid gap-8">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-64 glass rounded-[3rem] animate-pulse" />)
        ) : filtered.length > 0 ? (
          filtered.map((item, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              key={item.id}
              className="group"
            >
              <div className="glass rounded-[3.5rem] overflow-hidden border-white/[0.03] shadow-2xl relative">
                <Link to={`/menu/${item.id}`} className="block relative h-64 overflow-hidden">
                  <img src={item.image} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000" alt={item.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  <div className="absolute top-6 left-6 glass px-5 py-2 rounded-2xl flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-black tracking-widest uppercase">{item.calories} KCAL</span>
                  </div>
                </Link>

                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-start">
                    <Link to={`/menu/${item.id}`} className="flex-1 space-y-1">
                      <span className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">{item.category}</span>
                      <h3 className="text-xl font-black tracking-tighter uppercase mb-1 text-[var(--text-main)]">{item.name}</h3>
                      <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed line-clamp-1">{item.description}</p>
                    </Link>
                  </div>

                  <div className="grid grid-cols-3 gap-4 py-4 border-y border-white/[0.03]">
                    <MacroItem label="Protein" value={item.protein} unit="g" />
                    <MacroItem label="Carbs" value={item.carbs} unit="g" />
                    <MacroItem label="Fats" value={item.fats} unit="g" />
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button 
                      onClick={() => addToCart(item, "MENU")}
                      className="flex-1 primary-gradient text-background-dark font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 text-sm shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase tracking-widest"
                    >
                      <ShoppingBag size={18} />
                      Order Now
                    </button>
                    <Link to={`/menu/${item.id}`} className="w-16 h-16 glass rounded-[2rem] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                      <ArrowRight size={20} />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-40">
             <Info className="mx-auto text-white/10 mb-4" size={48} />
             <p className="text-white/20 font-black tracking-widest text-[10px] uppercase">No Match Found</p>
          </div>
        )}
      </main>
    </div>
  );
}

function MacroItem({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">{label}</p>
      <p className="text-sm font-black tracking-tighter uppercase text-[var(--text-main)]">{value}<span className="text-[10px] font-medium ml-0.5 opacity-30">{unit}</span></p>
    </div>
  );
}
