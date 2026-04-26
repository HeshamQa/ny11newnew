import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UserProfile } from "./types";

// Pages.  
import HomePage from "./pages/HomePage";
import MenuPage from "./pages/MenuPage";
import LabPage from "./pages/LabPage";
import ClinicPage from "./pages/ClinicPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import AdminDashboard from "./pages/AdminDashboard";
import LabManagerDashboard from "./pages/LabManagerDashboard";
import TrainerDashboard from "./pages/TrainerDashboard";

import PlanPage from "./pages/PlanPage";
import PaymentPage from "./pages/PaymentPage";

// Components
import BottomNav from "./components/BottomNav";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as UserProfile);
        } else {
          // New users will go through onboarding in AuthPage, 
          // so we don't auto-create full profile here if missing logic
          setUser(null); 
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#0a0c10] text-white font-sans selection:bg-primary/30" dir="rtl">
        <div className="max-w-md mx-auto relative min-h-screen flex flex-col">
          <Routes>
            <Route path="/" element={<HomePage user={user} />} />
            <Route path="/menu" element={<MenuPage user={user} />} />
            <Route path="/lab" element={<LabPage user={user} />} />
            <Route path="/auth" element={<AuthPage />} />
            
            <Route path="/clinic" element={user ? <ClinicPage user={user} /> : <Navigate to="/auth" />} />
            <Route path="/plan" element={user ? <PlanPage user={user} /> : <Navigate to="/auth" />} />
            <Route path="/payment" element={user ? <PaymentPage user={user} /> : <Navigate to="/auth" />} />
            <Route path="/chat/:id" element={user ? <ChatPage user={user} /> : <Navigate to="/auth" />} />
            <Route path="/profile" element={user ? <ProfilePage user={user} /> : <Navigate to="/auth" />} />
            
            {/* Role Specific Protected Routes */}
            {user?.role === "ADMIN" && (
              <Route path="/admin" element={<AdminDashboard user={user} />} />
            )}
            {user?.role === "LAB_MANAGER" && (
              <Route path="/lab-manager" element={<LabManagerDashboard user={user} />} />
            )}
            {user?.role === "TRAINER" && (
              <Route path="/trainer" element={<TrainerDashboard user={user} />} />
            )}
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <BottomNav role={user?.role || "USER"} />
        </div>
      </div>
    </Router>
  );
}
