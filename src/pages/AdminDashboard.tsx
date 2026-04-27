import React, { useState, useEffect } from "react";
import { UserProfile, MenuItem, LabTest } from "../types";
import { db } from "../lib/firebase";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, getDoc, setDoc, query, where } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Edit2, Trash2, Wallet, Users, Utensils, FlaskConical, DollarSign, ArrowLeftRight, LayoutDashboard, FileText, ChevronRight, X, Save, Brain, Image as ImageIcon, Loader2 } from "lucide-react";
import { UserRole } from "../types";
import { uploadImage } from "../services/imageService";
import { formatPrice } from "../lib/currency";

import { t } from "../lib/translations";

type AdminTab = "DASHBOARD" | "MENU" | "LABS" | "USERS" | "FINANCE" | "CONTENT" | "KNOWLEDGE";

export default function AdminDashboard({ user }: { user: UserProfile }) {
  const [tab, setTab] = useState<AdminTab>("DASHBOARD");
  const [items, setItems] = useState<any[]>([]);
  const [experts, setExperts] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Finance states
  const [transferTarget, setTransferTarget] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferCurrency, setTransferCurrency] = useState<"JOD" | "USD">("JOD");

  useEffect(() => {
    fetchTabContent();
    if (tab === "FINANCE") fetchExperts();
  }, [tab]);

  const fetchTabContent = async () => {
    setLoading(true);
    let snap;
    try {
        if (tab === "MENU") snap = await getDocs(collection(db, "menu"));
        else if (tab === "LABS") snap = await getDocs(collection(db, "labs"));
        else if (tab === "USERS") snap = await getDocs(collection(db, "users"));
        else if (tab === "FINANCE") snap = await getDocs(collection(db, "payments"));
        else if (tab === "CONTENT") snap = await getDocs(collection(db, "content"));
        else if (tab === "KNOWLEDGE") snap = await getDocs(collection(db, "knowledge_base"));
        
        if (snap) {
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
    } catch (err) {
        console.error(err);
    }
    setLoading(false);
  };

  const fetchExperts = async () => {
    const q = query(collection(db, "users"), where("role", "in", ["TRAINER", "LAB_MANAGER"]));
    const snap = await getDocs(q);
    setExperts(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
  };

  const handleSave = async (data: any) => {
    setLoading(true);
    try {
        const collectionName = tab === "MENU" ? "menu" : tab === "LABS" ? "labs" : tab === "CONTENT" ? "content" : tab === "KNOWLEDGE" ? "knowledge_base" : "users";
        if (editingItem?.id || editingItem?.uid) {
            const id = editingItem.id || editingItem.uid;
            await updateDoc(doc(db, collectionName, id), data);
        } else {
            await addDoc(collection(db, collectionName), { ...data, createdAt: Date.now() });
        }
        setEditingItem(null);
        setIsAdding(false);
        fetchTabContent();
    } catch (err) {
        console.error(err);
    }
    setLoading(false);
  };

  const changeUserRole = async (userId: string, newRole: UserRole) => {
    setLoading(true);
    try {
        await updateDoc(doc(db, "users", userId), { role: newRole });
        fetchTabContent();
    } catch (err) {
        console.error(err);
    }
    setLoading(false);
  };

  const handleTransfer = async () => {
    if (!transferTarget || !transferAmount) return;
    setLoading(true);
    try {
        const amount = parseFloat(transferAmount);
        const expertRef = doc(db, "users", transferTarget);
        const expertSnap = await getDoc(expertRef);
        
        if (expertSnap.exists()) {
            const currentBalance = expertSnap.data().walletBalance || 0;
            await updateDoc(expertRef, { walletBalance: currentBalance + amount });
            
            // Log payment
            await addDoc(collection(db, "payments"), {
                targetUid: transferTarget,
                targetName: expertSnap.data().name,
                amount: amount,
                currency: transferCurrency,
                type: "TRANSFER",
                timestamp: Date.now()
            });
            
            setTransferAmount("");
            alert("تم التحويل بنجاح");
            fetchTabContent();
        }
    } catch (err) {
        console.error(err);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    setLoading(true);
    try {
        const collectionName = tab === "MENU" ? "menu" : tab === "LABS" ? "labs" : tab === "CONTENT" ? "content" : tab === "KNOWLEDGE" ? "knowledge_base" : "users";
        await deleteDoc(doc(db, collectionName, id));
        fetchTabContent();
    } catch (err) {
        console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col flex-1 pb-32 min-h-screen bg-[#0a0c10]">
      <AnimatePresence>
        {(editingItem || isAdding) && (
            <DetailView 
                item={editingItem || {}} 
                type={tab} 
                onClose={() => { setEditingItem(null); setIsAdding(false); }} 
                onSave={handleSave}
            />
        )}
      </AnimatePresence>

      <header className="p-4 pt-12 space-y-4 sticky top-0 bg-[#0a0c10]/80 backdrop-blur-xl z-30">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black italic tracking-tighter">لوحة التحكم</h1>
            <div className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center text-primary">
                <LayoutDashboard size={20} />
            </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          <TabButton active={tab === "DASHBOARD"} onClick={() => setTab("DASHBOARD")} icon={<LayoutDashboard size={14} />} label="الرئيسية" />
          <TabButton active={tab === "USERS"} onClick={() => setTab("USERS")} icon={<Users size={14} />} label="الحسابات" />
          <TabButton active={tab === "MENU"} onClick={() => setTab("MENU")} icon={<Utensils size={14} />} label="المحتوى الغذائي" />
          <TabButton active={tab === "LABS"} onClick={() => setTab("LABS")} icon={<FlaskConical size={14} />} label="المختبر" />
          <TabButton active={tab === "CONTENT"} onClick={() => setTab("CONTENT")} icon={<FileText size={14} />} label="النصائح والإعلانات" />
          <TabButton active={tab === "KNOWLEDGE"} onClick={() => setTab("KNOWLEDGE")} icon={<Brain size={14} />} label="تدريب المساعد" />
          <TabButton active={tab === "FINANCE"} onClick={() => setTab("FINANCE")} icon={<DollarSign size={14} />} label="المالية" />
        </div>
      </header>

      <main className="p-4 space-y-6 flex-1">
        {tab === "DASHBOARD" && <StatsSection />}

        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black tracking-tight uppercase italic underline decoration-primary/30 decoration-4 underline-offset-4">
                {tab === "MENU" ? "قائمة الوجبات" : 
                 tab === "LABS" ? "قائمة التحاليل" : 
                 tab === "CONTENT" ? "المحتوى الترويجي" :
                 tab === "KNOWLEDGE" ? "قاعدة بيانات الـ AI" :
                 tab === "USERS" ? "إدارة الأعضاء" : 
                 tab === "DASHBOARD" ? "نظرة عامة" : "حركات الدفع"}
            </h2>
            {["MENU", "LABS", "CONTENT", "KNOWLEDGE"].includes(tab) && (
                <button 
                  onClick={() => setIsAdding(true)}
                  className="bg-primary text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                >
                    <Plus size={16} /> إضافة جديد
                </button>
            )}
        </div>

        <section className="space-y-3">
            {loading ? (
                [1, 2, 3].map(i => <div key={i} className="h-24 glass rounded-3xl animate-pulse" />)
            ) : items.length > 0 ? (
                items.map((item, idx) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: idx * 0.05 }}
                        key={item.id || item.uid} 
                        className="glass rounded-3xl p-4 flex items-center justify-between group border border-white/5 hover:border-primary/20 transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                {item.image ? (
                                    <img src={item.image} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <Users className="text-white/20" size={20} />
                                )}
                            </div>
                            <div>
                                <h4 className="text-xs font-black truncate max-w-[150px]">{t(item.name || item.email || item.title || item.question)}</h4>
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                    {tab === "KNOWLEDGE" ? "سؤال وجواب للمساعد" : tab === "USERS" ? (
                                        <select 
                                            value={item.role} 
                                            onChange={(e) => changeUserRole(item.uid, e.target.value as UserRole)}
                                            className="bg-transparent border-none p-0 focus:ring-0 text-primary"
                                        >
                                            <option value="USER" className="bg-background-dark">مستخدم</option>
                                            <option value="ADMIN" className="bg-background-dark">ادمن</option>
                                            <option value="TRAINER" className="bg-background-dark">مدرب</option>
                                            <option value="LAB_MANAGER" className="bg-background-dark">مدير مختبر</option>
                                        </select>
                                    ) : (item.category || item.type || formatPrice(item.price || 0, user, item.currency))}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {tab !== "FINANCE" && tab !== "USERS" && (
                                <button 
                                    onClick={() => setEditingItem(item)}
                                    className="p-2 text-white/40 hover:text-primary transition-colors"
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}
                            {tab !== "FINANCE" && (
                                <button 
                                    onClick={() => handleDelete(item.id || item.uid)}
                                    className="p-2 text-red-500/20 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </motion.div>
                ))
            ) : tab !== "DASHBOARD" && tab !== "FINANCE" && (
                <div className="text-center py-20 text-white/20 border-4 border-dashed border-white/5 rounded-[3rem]">
                    <Plus size={40} className="mx-auto mb-4 opacity-10" />
                    <p className="text-xs font-bold uppercase tracking-widest">لا توجد سجلات</p>
                </div>
            )}
        </section>

        {tab === "FINANCE" && (
            <section className="space-y-4 pt-4">
                <div className="primary-gradient p-6 rounded-[2.5rem] text-background-dark space-y-4 shadow-xl shadow-primary/20">
                    <h3 className="font-black flex items-center gap-2 italic uppercase">
                        <Wallet size={18} /> تحويل أموال للخبراء
                    </h3>
                    <div className="space-y-3">
                        <select 
                            value={transferTarget}
                            onChange={(e) => setTransferTarget(e.target.value)}
                            className="w-full bg-white/20 border-none rounded-2xl text-sm py-4 px-4 font-bold"
                        >
                            <option value="">اختر الخبير (مدرب/مختبر)</option>
                            {experts.map(ex => (
                                <option key={ex.uid} value={ex.uid} className="bg-background-dark text-white">
                                    {ex.name} ({ex.role})
                                </option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                              <input 
                                  type="number" 
                                  placeholder="المبلغ المراد تحويله" 
                                  className="w-full bg-white/20 border-none rounded-2xl placeholder:text-black/30 text-sm py-4 px-4 font-bold" 
                                  value={transferAmount}
                                  onChange={(e) => setTransferAmount(e.target.value)}
                              />
                          </div>
                          <select 
                            value={transferCurrency}
                            onChange={(e) => setTransferCurrency(e.target.value as any)}
                            className="bg-white/20 border-none rounded-2xl text-[10px] font-black px-4"
                          >
                            <option value="JOD">JOD</option>
                            <option value="USD">USD</option>
                          </select>
                        </div>
                        <button 
                            onClick={handleTransfer}
                            className="w-full bg-background-dark text-white py-5 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        >
                            تأكيد التحويل الآن
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] px-2 text-white/30">آخر التحويلات</h3>
                    {items.map((pay) => (
                        <div key={pay.id} className="glass rounded-2xl p-4 flex justify-between items-center border border-white/5">
                            <div>
                                <p className="text-xs font-bold">{pay.targetName}</p>
                                <p className="text-[10px] text-white/30">{new Date(pay.timestamp).toLocaleDateString("ar-SA")}</p>
                            </div>
                            <p className="text-primary font-black">+{formatPrice(pay.amount, user, pay.currency)}</p>
                        </div>
                    ))}
                </div>
            </section>
        )}
      </main>
    </div>
  );
}

function DetailView({ item, type, onClose, onSave }: any) {
    const [formData, setFormData] = useState({
        ...item,
        name: typeof item.name === 'object' ? item.name : { ar: item.name || "", en: "" },
        description: typeof item.description === 'object' ? item.description : { ar: item.description || "", en: "" }
    });
    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const url = await uploadImage(file);
            setFormData({ ...formData, image: url });
        } catch (err) {
            alert("فشل رفع الصورة");
        }
        setIsUploading(false);
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
        >
            <motion.div 
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="glass w-full max-w-lg rounded-[3rem] p-8 space-y-6 border border-white/10 relative my-auto shadow-2xl"
            >
                <button onClick={onClose} className="absolute right-6 top-6 w-10 h-10 rounded-full glass flex items-center justify-center text-white/40 hover:text-white transition-colors">
                    <X size={20} />
                </button>

                <div className="space-y-1">
                    <h3 className="text-2xl font-black italic tracking-tighter">{item.id ? "تعديل البيانات" : "إضافة سجل جديد"}</h3>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{type} Management</p>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-2">
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="الاسم (عربي)" value={formData.name?.ar || ""} onChange={(v: any) => setFormData({...formData, name: { ...formData.name, ar: v }})} />
                        <InputField label="Name (EN)" value={formData.name?.en || ""} onChange={(v: any) => setFormData({...formData, name: { ...formData.name, en: v }})} />
                    </div>
                    
                    {["MENU", "LABS"].includes(type) && (
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <InputField label="السعر" value={formData.price || ""} type="number" onChange={(v: any) => setFormData({...formData, price: parseFloat(v)})} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2">العملة</label>
                                    <div className="glass rounded-2xl px-5 border border-white/5 mt-2">
                                        <select 
                                            value={formData.currency || "JOD"} 
                                            onChange={(e) => setFormData({...formData, currency: e.target.value})}
                                            className="bg-transparent border-none focus:ring-0 text-sm w-full py-4 text-white"
                                        >
                                            <option value="JOD" className="bg-background-dark">دينار أردني (JOD)</option>
                                            <option value="USD" className="bg-background-dark">دولار أمريكي (USD)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2">الصورة</label>
                            <label className="glass rounded-3xl p-6 border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-all group overflow-hidden relative min-h-[120px]">
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                                {isUploading ? (
                                    <Loader2 className="animate-spin text-primary" size={32} />
                                ) : formData.image ? (
                                    <img src={formData.image} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" alt="" />
                                ) : (
                                    <>
                                        <ImageIcon className="text-white/20 mb-2" size={32} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">اضغط لرفع صورة</span>
                                    </>
                                )}
                            </label>
                            <InputField label="رابط الصورة (اختياري)" value={formData.image || ""} onChange={(v: any) => setFormData({...formData, image: v})} />
                        </div>
                    )}

                    {type === "MENU" && (
                        <>
                            <InputField label="السعرات" value={formData.calories || ""} type="number" onChange={(v: any) => setFormData({...formData, calories: parseInt(v)})} />
                            <div className="grid grid-cols-3 gap-2">
                                <InputField label="بروتين" value={formData.protein || ""} type="number" onChange={(v: any) => setFormData({...formData, protein: parseFloat(v)})} />
                                <InputField label="كارب" value={formData.carbs || ""} type="number" onChange={(v: any) => setFormData({...formData, carbs: parseFloat(v)})} />
                                <InputField label="دهون" value={formData.fats || ""} type="number" onChange={(v: any) => setFormData({...formData, fats: parseFloat(v)})} />
                            </div>
                        </>
                    )}

                    {type === "LABS" && (
                        <InputField label="التصنيف" value={formData.category || ""} onChange={(v: any) => setFormData({...formData, category: v})} />
                    )}

                    {type === "CONTENT" && (
                        <>
                            <div className="space-y-4">
                                <InputField label="الوصف (عربي)" value={formData.description?.ar || ""} isTextArea onChange={(v) => setFormData({...formData, description: { ...formData.description, ar: v }})} />
                                <InputField label="Description (EN)" value={formData.description?.en || ""} isTextArea onChange={(v) => setFormData({...formData, description: { ...formData.description, en: v }})} />
                            </div>
                            <InputField label="النوع (advice/promo)" value={formData.type || "advice"} onChange={(v) => setFormData({...formData, type: v})} />
                        </>
                    )}

                    {type === "KNOWLEDGE" && (
                        <>
                            <InputField label="السؤال" value={formData.question || ""} isTextArea onChange={(v) => setFormData({...formData, question: v})} />
                            <InputField label="الجواب المثالي من الـ AI" value={formData.answer || ""} isTextArea onChange={(v) => setFormData({...formData, answer: v})} />
                        </>
                    )}

                    {type === "USERS" && (
                        <>
                            <InputField label="الدور (USER/TRAINER/ADMIN/LAB_MANAGER)" value={formData.role || "USER"} onChange={(v: any) => setFormData({...formData, role: v})} />
                            
                            {["TRAINER", "LAB_MANAGER"].includes(formData.role) && (
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <InputField label="سجل الاستشارة" value={formData.price || 0} type="number" onChange={(v: any) => setFormData({...formData, price: parseFloat(v)})} />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2">عملة الخدمة</label>
                                        <div className="glass rounded-2xl px-5 border border-white/5 mt-2">
                                            <select 
                                                value={formData.serviceCurrency || "JOD"} 
                                                onChange={(e) => setFormData({...formData, serviceCurrency: e.target.value})}
                                                className="bg-transparent border-none focus:ring-0 text-sm w-full py-4 text-white"
                                            >
                                                <option value="JOD" className="bg-background-dark">JOD</option>
                                                <option value="USD" className="bg-background-dark">USD</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <InputField label="الرصيد" value={formData.walletBalance || 0} type="number" onChange={(v: any) => setFormData({...formData, walletBalance: parseFloat(v)})} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2">عملة الحساب</label>
                                    <div className="glass rounded-2xl px-5 border border-white/5 mt-2">
                                        <select 
                                            value={formData.currency || "JOD"} 
                                            onChange={(e) => setFormData({...formData, currency: e.target.value})}
                                            className="bg-transparent border-none focus:ring-0 text-sm w-full py-4 text-white"
                                        >
                                            <option value="JOD" className="bg-background-dark">JOD</option>
                                            <option value="USD" className="bg-background-dark">USD</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <button 
                    onClick={() => onSave(formData)}
                    className="w-full bg-primary text-black font-black py-5 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 active:scale-95 transition-all"
                >
                    <Save size={18} /> حفظ التغييرات
                </button>
            </motion.div>
        </motion.div>
    );
}

function InputField({ label, value, onChange, type = "text", isTextArea = false }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2">{label}</label>
            <div className="glass rounded-2xl px-5 border border-white/5 focus-within:border-primary/50 transition-all">
                {isTextArea ? (
                    <textarea 
                        className="bg-transparent border-none focus:ring-0 text-sm w-full py-4 resize-none" 
                        rows={4}
                        value={value} 
                        onChange={(e) => onChange(e.target.value)}
                    />
                ) : (
                    <input 
                        type={type} 
                        className="bg-transparent border-none focus:ring-0 text-sm w-full py-4" 
                        value={value} 
                        onChange={(e) => onChange(e.target.value)}
                    />
                )}
            </div>
        </div>
    );
}

function StatsSection() {
    return (
        <div className="grid grid-cols-2 gap-4">
            <StatItem icon={<Users size={20} />} label="المشتركين" val="1.2k" color="primary" />
            <StatItem icon={<DollarSign size={20} />} label="الإيرادات" val="45k" color="amber" />
            <StatItem icon={<Utensils size={20} />} label="الوجبات" val="64" color="blue" />
            <StatItem icon={<FlaskConical size={20} />} label="التحاليل" val="28" color="purple" />
        </div>
    );
}

function StatItem({ icon, label, val, color }: any) {
    const colors: any = {
        primary: "text-primary border-l-primary shadow-primary/5",
        amber: "text-amber-400 border-l-amber-400 shadow-amber-400/5",
        blue: "text-blue-400 border-l-blue-400 shadow-blue-400/5",
        purple: "text-purple-400 border-l-purple-400 shadow-purple-400/5"
    };
    return (
        <div className={`glass rounded-3xl p-6 border-l-4 shadow-xl ${colors[color]}`}>
            <div className="flex items-center gap-3 mb-2 opacity-50">
                {icon}
                <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
            </div>
            <p className="text-3xl font-black italic tracking-tighter">{val}</p>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-4 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase whitespace-nowrap transition-all ${
                active ? "bg-primary text-black shadow-xl shadow-primary/20 rotate-1" : "glass text-white/40 hover:text-white"
            }`}
        >
            {icon} {label}
        </button>
    );
}

