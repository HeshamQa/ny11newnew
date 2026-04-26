import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Utensils, FlaskConical, MessageSquare, User, ShieldCheck, Sparkles } from "lucide-react";
import { UserRole } from "../types";

export default function BottomNav({ role }: { role: UserRole }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card-dark/80 backdrop-blur-xl border-t border-white/5 px-4 pt-3 pb-8 flex justify-between items-center z-50">
      <NavItem to="/" icon={<Home size={22} />} label="الرئيسية" />
      <NavItem to="/menu" icon={<Utensils size={22} />} label="المنيو" />
      <NavItem to="/plan" icon={<Sparkles size={22} />} label="الخطط" />
      <NavItem to="/lab" icon={<FlaskConical size={22} />} label="المختبر" />
      <NavItem to="/clinic" icon={<MessageSquare size={22} />} label="العيادة" />
      
      {role === "ADMIN" && (
        <NavItem to="/admin" icon={<ShieldCheck size={22} />} label="الإدارة" />
      )}
      
      <NavItem to="/profile" icon={<User size={22} />} label="حسابي" />
    </nav>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 transition-colors ${
          isActive ? "text-primary" : "text-white/40 hover:text-white"
        }`
      }
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </NavLink>
  );
}
