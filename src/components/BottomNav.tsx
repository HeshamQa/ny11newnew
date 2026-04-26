import React from "react";
import { motion } from "motion/react";
import { NavLink } from "react-router-dom";
import { Home, Utensils, FlaskConical, MessageSquare, User, ShieldCheck, Sparkles } from "lucide-react";
import { UserRole } from "../types";

export default function BottomNav({ role }: { role: UserRole }) {
  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 px-6 max-w-md mx-auto">
      <nav className="glass rounded-[2rem] p-2 flex justify-around items-center shadow-2xl border-white/[0.08]">
        <NavItem to="/" icon={<Home size={20} />} label="الرئيسية" />
        <NavItem to="/menu" icon={<Utensils size={20} />} label="المنيو" />
        <NavItem to="/clinic" icon={<Sparkles size={20} />} label="المدربون" />
        <NavItem to="/lab" icon={<FlaskConical size={20} />} label="المختبر" />
        <NavItem to="/inbox" icon={<MessageSquare size={20} />} label="الرسائل" />
        
        {role === "ADMIN" && (
          <NavItem to="/admin" icon={<ShieldCheck size={20} />} label="الإدارة" />
        )}
        
        <NavItem to="/profile" icon={<User size={20} />} label="حسابي" />
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative flex flex-col items-center justify-center p-3 transition-all duration-300 ${
          isActive ? "text-primary scale-110" : "text-white/20 hover:text-white/60"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {icon}
          <span className={`text-[8px] font-black mt-1 tracking-widest ${isActive ? "opacity-100" : "opacity-0 scale-0"} transition-all uppercase`}>{label}</span>
          {isActive && (
            <motion.div 
              layoutId="nav-glow"
              className="absolute inset-0 bg-primary/10 blur-xl rounded-full -z-10"
            />
          )}
        </>
      )}
    </NavLink>
  );
}
