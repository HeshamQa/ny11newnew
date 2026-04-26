import React, { useState } from "react";
import { auth, db } from "../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, User, ArrowRight, Activity, ChevronLeft, Target, Scale, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAiHealthAdvice } from "../services/aiAssistant";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // 1: Auth, 2: Onboarding
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Onboarding State
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState<any>("MAINTAIN");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/");
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        setStep(2);
      }
    } catch (err: any) {
      setError("خطأ في تسجيل الدخول، يرجى التأكد من البيانات");
    }
  };

  const completeOnboarding = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const insights = await getAiHealthAdvice(
        `المستخدم عمره ${age} ووزنه ${weight} وهدفه ${goal}. قدم نصيحة مخصصة واحدة باللغة العربية.`
      );

      await setDoc(doc(db, "users", auth.currentUser.uid), {
        uid: auth.currentUser.uid,
        name: email.split("@")[0],
        email: email,
        role: email === "admin@ny11.fit" ? "ADMIN" : "USER",
        walletBalance: 1000,
        createdAt: Date.now(),
        age: parseInt(age),
        currentWeight: parseFloat(weight),
        goal: goal,
        aiInsights: insights,
        currency: "JOD"
      });
      
      // Force reload or manual navigation after state update
      window.location.href = "/"; 
    } catch (error) {
      setError("حدث خطأ أثناء حفظ البيانات.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="auth"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-sm space-y-8"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/20 rotate-12">
                <Activity size={40} className="text-background-dark -rotate-12" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter italic uppercase text-primary">NY11 Health</h1>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-2">{isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2">البريد الإلكتروني</label>
                <div className="glass rounded-2xl flex items-center px-4 py-1 border border-white/5 focus-within:border-primary/50 transition-all">
                  <Mail size={18} className="text-white/20" />
                  <input type="email" required className="bg-transparent border-none focus:ring-0 text-sm w-full py-4 px-3" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2">كلمة المرور</label>
                <div className="glass rounded-2xl flex items-center px-4 py-1 border border-white/5 focus-within:border-primary/50 transition-all">
                  <Lock size={18} className="text-white/20" />
                  <input type="password" required className="bg-transparent border-none focus:ring-0 text-sm w-full py-4 px-3" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>
              {error && <p className="text-red-400 text-[10px] font-bold text-center">{error}</p>}
              <button type="submit" className="w-full bg-primary text-background-dark font-black py-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all">
                <span>{isLogin ? "دخول" : "المتابعة"}</span>
                <ArrowRight size={18} />
              </button>
            </form>
            <div className="text-center">
              <button onClick={() => setIsLogin(!isLogin)} className="text-[10px] font-bold text-white/40 hover:text-primary transition-colors tracking-widest uppercase">
                {isLogin ? "ليس لديك حساب؟ سجل الآن" : "لديك حساب بالفعل؟ سجل دخولك"}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="onboarding"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-sm space-y-8"
          >
            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight">أكمل ملفك الصحي</h1>
              <p className="text-xs text-white/40">لنتمكن من تخصيص وجباتك ونصائح الـ AI لك.</p>
            </div>

            <div className="space-y-4">
              <OnboardingField icon={<Calendar size={18} />} label="العمر" placeholder="مثلاً: 25" value={age} onChange={setAge} />
              <OnboardingField icon={<Scale size={18} />} label="الوزن الحالي (كجم)" placeholder="مثلاً: 70" value={weight} onChange={setWeight} />
              
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2">هدفك الرئيسي</label>
                <div className="grid grid-cols-2 gap-3">
                  <GoalBtn active={goal === "LOSE_WEIGHT"} onClick={() => setGoal("LOSE_WEIGHT")} label="تخفيف وزن" />
                  <GoalBtn active={goal === "GAIN_WEIGHT"} onClick={() => setGoal("GAIN_WEIGHT")} label="زيادة وزن" />
                  <GoalBtn active={goal === "MUSCLE"} onClick={() => setGoal("MUSCLE")} label="بناء عضلات" />
                  <GoalBtn active={goal === "MAINTAIN"} onClick={() => setGoal("MAINTAIN")} label="صحة عامة" />
                </div>
              </div>

              <button 
                onClick={completeOnboarding}
                disabled={loading}
                className="w-full bg-primary text-black font-black py-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mt-8 disabled:opacity-50"
              >
                {loading ? "جاري التحليل..." : "بدء الرحلة"}
                {!loading && <ArrowRight size={18} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OnboardingField({ icon, label, placeholder, value, onChange }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2">{label}</label>
      <div className="glass rounded-2xl flex items-center px-4 py-1 border border-white/5 focus-within:border-primary/50 transition-all">
        <div className="text-white/20">{icon}</div>
        <input 
          type="number" 
          className="bg-transparent border-none focus:ring-0 text-sm w-full py-4 px-3" 
          placeholder={placeholder} 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
        />
      </div>
    </div>
  );
}

function GoalBtn({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`py-3 px-4 rounded-xl text-[10px] font-bold transition-all border-2 ${
        active ? "bg-primary text-black border-primary" : "glass text-white/40 border-white/5"
      }`}
    >
      {label}
    </button>
  );
}
