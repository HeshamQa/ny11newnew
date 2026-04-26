import React from "react";
import { UserProfile } from "../types";
import { auth, db } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { motion } from "motion/react";
import { doc, updateDoc } from "firebase/firestore";
import { 
    Wallet, 
    Settings, 
    LogOut, 
    ShieldCheck, 
    Trophy, 
    FlaskConical, 
    ChevronLeft,
    Clock,
    CreditCard,
    DollarSign,
    Coins
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formatPrice } from "../lib/currency";

export default function ProfilePage({ user }: { user: UserProfile }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const toggleCurrency = async () => {
    const newCurrency = user.currency === "USD" ? "JOD" : "USD";
    await updateDoc(doc(db, "users", user.uid), { currency: newCurrency });
    window.location.reload(); // Refresh to update all prices (simplest way)
  };


  return (
    <div className="flex flex-col flex-1 pb-32">
      <header className="p-8 pt-12 flex flex-col items-center gap-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl border-4 border-primary p-1 bg-background-dark overflow-hidden rotate-3">
            <img 
              src={user.profilePic || `https://ui-avatars.com/api/?name=${user.name}&background=8bc63f&color=000`} 
              className="w-full h-full object-cover rounded-2xl -rotate-3" 
              alt={user.name} 
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-primary text-black rounded-lg p-1 font-black text-[8px] uppercase tracking-tighter">
            {user.role}
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black italic tracking-tighter">{user.name}</h1>
          <p className="text-white/40 text-xs mt-1 lowercase">{user.email}</p>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Wallet Card */}
        <section className="primary-gradient p-5 rounded-3xl flex items-center justify-between shadow-xl shadow-primary/20">
          <div className="space-y-1">
            <p className="text-background-dark/60 text-[10px] font-bold uppercase tracking-widest">رصيد المحفظة</p>
            <p className="text-3xl font-black text-background-dark">{formatPrice(user.walletBalance, user)}</p>
          </div>
          <div className="w-12 h-12 bg-background-dark/10 rounded-2xl flex items-center justify-center text-background-dark">
            <Wallet size={24} />
          </div>
        </section>

        {/* Currency Switcher */}
        <section className="glass rounded-3xl p-4 flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Coins size={20} />
                </div>
                <div>
                    <h4 className="text-sm font-bold">العملة المفضلة</h4>
                    <p className="text-[10px] text-white/30">الحالية: {user.currency === "USD" ? "الدولار الأمريكي" : "الدينار الأردني"}</p>
                </div>
            </div>
            <button 
                onClick={toggleCurrency}
                className="bg-primary text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase"
            >
                تبديل
            </button>
        </section>

        {/* Dashboards based on role */}
        <section className="space-y-3">
            <h3 className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] px-2">الإدارة والمهام</h3>
            
            {user.role === "ADMIN" && (
                <DashboardLink to="/admin" icon={<ShieldCheck className="text-blue-400" />} title="لوحة تحكم المدير" desc="إدارة المنيو، المختبر، والتحويلات المالية" />
            )}
            {user.role === "TRAINER" && (
                <DashboardLink to="/trainer" icon={<Trophy className="text-amber-400" />} title="لوحة تحكم المدرب" desc="الرد على الاستشارات وإرسال عروض السعر" />
            )}
            {user.role === "LAB_MANAGER" && (
                <DashboardLink to="/lab-manager" icon={<FlaskConical className="text-emerald-400" />} title="لوحة تحكم المختبر" desc="إدارة الفحوصات والرد على الاستفسارات" />
            )}
            
            {/* Common Links */}
            <DashboardLink to="/orders" icon={<Clock className="text-white/40" />} title="طلباتي السابقة" desc="تتبع الوجبات والتحاليل المحجوزة" />
            <DashboardLink to="/payment-methods" icon={<CreditCard className="text-white/40" />} title="طرق الدفع" desc="إدارة البطاقات والعناوين المحفوظة" />
            <DashboardLink to="/settings" icon={<Settings className="text-white/40" />} title="الإعدادات الشخصية" desc="تعديل الملف الشخصي والتنبيهات الصحية" />
        </section>

        {/* Logout */}
        <button 
            onClick={handleLogout}
            className="w-full py-4 glass rounded-2xl text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors"
        >
            <LogOut size={18} />
            تسجيل الخروج
        </button>
      </main>
    </div>
  );
}

function DashboardLink({ to, icon, title, desc }: { to: string; icon: React.ReactNode; title: string; desc: string }) {
    return (
        <Link to={to} className="glass rounded-2xl p-4 flex items-center justify-between group hover:bg-white/10 transition-all active:scale-[0.98]">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    {icon}
                </div>
                <div>
                    <h4 className="text-sm font-bold">{title}</h4>
                    <p className="text-[10px] text-white/30">{desc}</p>
                </div>
            </div>
            <ChevronLeft size={16} className="text-white/20 group-hover:text-primary transition-colors" />
        </Link>
    );
}
