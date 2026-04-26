import React, { useState } from "react";
import { UserProfile } from "../types";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { motion } from "motion/react";
import { ChevronLeft, User, Phone, Mail, Award, Target, Bell, Eye, Shield, Save, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SettingsPage({ user }: { user: UserProfile }) {
    const navigate = useNavigate();
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, "users", user.uid), {
                name,
                email
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            alert("حدث خطأ أثناء الحفظ");
        }
        setSaving(false);
    };

    return (
        <div className="flex-1 flex flex-col pt-12 pb-32 overflow-x-hidden">
            <div className="px-6 flex items-center justify-between mb-10">
                <button onClick={() => navigate(-1)} className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-[var(--text-muted)] border-[var(--border-muted)]">
                    <ChevronLeft size={20} />
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-black italic tracking-tighter uppercase text-[var(--text-main)]">الإعدادات الشخصية</h1>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">تعديل الملف الشخصي</p>
                </div>
                <div className="w-12" />
            </div>

            <main className="px-6 space-y-10">
                {/* Profile Form */}
                <section className="space-y-6">
                    <h2 className="text-[10px] font-black tracking-[0.4em] text-[var(--text-muted)] uppercase px-2">المعلومات الشخصية</h2>
                    <div className="glass rounded-[2.5rem] p-8 border-[var(--border-muted)] space-y-6">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest px-1">الاسم الكامل</p>
                            <div className="flex items-center gap-4 bg-white/5 rounded-2xl px-5 py-4 border border-white/5 focus-within:border-primary/50 transition-all">
                                <User size={18} className="text-white/20" />
                                <input 
                                    type="text" 
                                    className="bg-transparent border-none focus:ring-0 w-full font-bold text-sm" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest px-1">البريد الإلكتروني</p>
                            <div className="flex items-center gap-4 bg-white/5 rounded-2xl px-5 py-4 border border-white/5 focus-within:border-primary/50 transition-all opacity-50">
                                <Mail size={18} className="text-white/20" />
                                <input 
                                    type="email" 
                                    disabled
                                    className="bg-transparent border-none focus:ring-0 w-full font-bold text-sm" 
                                    value={email}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Preferences */}
                <section className="space-y-6">
                    <h2 className="text-[10px] font-black tracking-[0.4em] text-[var(--text-muted)] uppercase px-2">التفضيلات</h2>
                    <div className="space-y-3">
                        <SettingsToggle icon={<Bell size={18} />} title="تنبيهات الوجبات" desc="تذكير بمواعيد الوجبات المقترحة" active={true} />
                        <SettingsToggle icon={<Award size={18} />} title="تنبيهات الإنجاز" desc="الحصول على إشعارات عند تحقيق أهدافك" active={true} />
                        <SettingsToggle icon={<Eye size={18} />} title="الوضع الليلي" desc="تبديل مظهر التطبيق" active={true} />
                    </div>
                </section>

                <div className="pt-4">
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className={`w-full py-5 rounded-[2rem] font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 transition-all relative overflow-hidden ${
                            saved ? "bg-emerald-500 text-white" : "primary-gradient text-background-dark shadow-xl shadow-primary/20"
                        }`}
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
                        ) : saved ? (
                            <>
                                <Check size={18} />
                                تم الحفظ بنجاح
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                حفظ التغييرات
                            </>
                        )}
                    </button>
                </div>
            </main>
        </div>
    );
}

function SettingsToggle({ icon, title, desc, active }: any) {
    return (
        <div className="glass rounded-[2rem] p-6 border-[var(--border-muted)] flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                    {icon}
                </div>
                <div>
                    <h4 className="text-sm font-bold">{title}</h4>
                    <p className="text-[10px] text-[var(--text-muted)]">{desc}</p>
                </div>
            </div>
            <div className={`w-12 h-6 rounded-full relative transition-colors ${active ? "bg-primary/20" : "bg-white/10"}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${active ? "right-1 bg-primary" : "right-7 bg-white/20"}`} />
            </div>
        </div>
    );
}
