import { useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { FoodItem, UserProfile } from "../types";
import { formatPrice } from "../lib/currency";
import { motion } from "motion/react";
import { Search, Filter, ShoppingCart, Info, Activity, Zap } from "lucide-react";

export default function MenuPage({ user }: { user?: UserProfile | null }) {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");

  useEffect(() => {
    const fetchItems = async () => {
      const snap = await getDocs(collection(db, "menu"));
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as FoodItem)));
      setLoading(false);
    };
    fetchItems();
  }, []);

  const categories = ["الكل", "سلطات", "وجبات رئيسية", "فطور", "مشروبات"];
  const filtered = items.filter(item => 
    (selectedCategory === "الكل" || item.category === selectedCategory) &&
    (item.name.includes(search) || (item.description && item.description.includes(search)))
  );

  return (
    <div className="flex flex-col flex-1 pb-32">
      <header className="p-4 pt-8 space-y-4">
        <h1 className="text-2xl font-black italic tracking-tighter">قائمة الطعام الصحية</h1>
        
        <div className="flex gap-2">
          <div className="flex-1 glass rounded-2xl px-4 py-3 flex items-center gap-3">
            <Search size={18} className="text-white/30" />
            <input 
              type="text" 
              placeholder="ابحث عن وجبتك..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-primary">
            <Filter size={18} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat ? "bg-primary text-black" : "glass text-white/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <main className="p-4 grid gap-6">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-48 glass rounded-3xl animate-pulse" />)
        ) : filtered.length > 0 ? (
          filtered.map((item, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={item.id}
              className="glass rounded-3xl overflow-hidden group border border-white/5"
            >
              <div className="relative h-48">
                <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
                <div className="absolute top-4 left-4 glass px-3 py-1 rounded-full flex items-center gap-2">
                  <Zap size={12} className="text-primary" />
                  <span className="text-[10px] font-bold">{item.calories} سعرة</span>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-primary font-bold uppercase tracking-widest">{item.category}</span>
                    <h3 className="text-lg font-bold">{item.name}</h3>
                  </div>
                  <p className="text-xl font-black text-primary">{formatPrice(item.price, user || null)}</p>
                </div>
                <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{item.description}</p>
                
                <div className="flex gap-4 pt-2 border-t border-white/5">
                  <div className="text-center">
                    <p className="text-[10px] text-white/30 font-bold uppercase">بروتين</p>
                    <p className="text-xs font-bold">{item.protein}ج</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-white/30 font-bold uppercase">كارب</p>
                    <p className="text-xs font-bold">{item.carbs}ج</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-white/30 font-bold uppercase">دهون</p>
                    <p className="text-xs font-bold">{item.fats}ج</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button className="flex-1 bg-primary text-black font-extrabold py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform">
                    <ShoppingCart size={16} />
                    أضف للطلب
                  </button>
                  <button className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-white/50">
                    <Info size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 text-white/30">لا توجد نتائج مطابقة</div>
        )}
      </main>
    </div>
  );
}
