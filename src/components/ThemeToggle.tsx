import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function ThemeToggle({ isDark, toggle }: { isDark: boolean; toggle: () => void }) {
  return (
    <button 
      onClick={toggle}
      className={`fixed left-4 bottom-24 w-12 h-12 rounded-2xl flex items-center justify-center transition-all z-50 shadow-2xl ${
        isDark ? "bg-white text-black" : "bg-[#0a0c10] text-primary"
      } border border-white/10 active:scale-90`}
    >
      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.div
            key="sun"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
          >
            <Sun size={20} />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
          >
            <Moon size={20} />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
