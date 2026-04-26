import React, { useState } from "react";
import { UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Plus, CreditCard, MapPin, Trash2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PaymentMethodsPage({ user }: { user: UserProfile }) {
    const navigate = useNavigate();
    const [cards, setCards] = useState([
        { id: "1", last4: "4242", expiry: "12/26", type: "VISA" },
        { id: "2", last4: "8890", expiry: "08/25", type: "MASTERCARD" }
    ]);
    const [addresses, setAddresses] = useState([
        { id: "1", title: "المنزل", detail: "عمان، شارع المدينة المنورة، بناء 12" },
        { id: "2", title: "العمل", detail: "عمان، شارع مكة، برج الحجاز، الطابق 4" }
    ]);

    return (
        <div className="flex-1 flex flex-col pt-12 pb-32 overflow-x-hidden">
            <div className="px-6 flex items-center justify-between mb-10">
                <button onClick={() => navigate(-1)} className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-[var(--text-muted)] border-[var(--border-muted)]">
                    <ChevronLeft size={20} />
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-black italic tracking-tighter uppercase text-[var(--text-main)]">طرق الدفع والعناوين</h1>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">إدارة الوسائل</p>
                </div>
                <div className="w-12" />
            </div>

            <main className="px-6 space-y-10">
                {/* Payment Methods */}
                <section className="space-y-4">
                    <div className="flex justify-between items-end px-2">
                        <h2 className="text-[10px] font-black tracking-[0.4em] text-[var(--text-muted)] uppercase">البطاقات المحفوظة</h2>
                        <button className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                            <Plus size={12} /> إضافة بطاقة
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        {cards.map((card) => (
                            <div key={card.id} className="glass rounded-[2rem] p-6 border-[var(--border-muted)] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                                    <CreditCard size={60} />
                                </div>
                                <div className="relative z-10 flex justify-between items-center">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-6 bg-white/5 rounded-md flex items-center justify-center">
                                                <span className="text-[8px] font-black">{card.type}</span>
                                            </div>
                                            <p className="text-lg font-black tracking-widest">•••• {card.last4}</p>
                                        </div>
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">EXP: {card.expiry}</p>
                                    </div>
                                    <button className="text-red-500/40 hover:text-red-500 transition-colors p-2">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Addresses */}
                <section className="space-y-4">
                    <div className="flex justify-between items-end px-2">
                        <h2 className="text-[10px] font-black tracking-[0.4em] text-[var(--text-muted)] uppercase">عناوين التوصيل</h2>
                        <button className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                            <Plus size={12} /> إضافة عنوان
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        {addresses.map((addr) => (
                            <div key={addr.id} className="glass rounded-[2rem] p-6 border-[var(--border-muted)] flex gap-5 items-start">
                                <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-primary shrink-0">
                                    <MapPin size={20} />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight">{addr.title}</h3>
                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">{addr.detail}</p>
                                </div>
                                <button className="text-[var(--text-muted)] hover:text-red-500 transition-colors pt-1">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="glass rounded-3xl p-8 border border-dashed border-primary/20 flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <ShieldCheck size={32} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)] underline decoration-primary/30 decoration-4">Secure Infrastructure</h3>
                        <p className="text-[10px] font-medium text-[var(--text-muted)] leading-relaxed max-w-[200px]">
                            All your payment data is encrypted and handled via NY11 advanced security protocols.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
