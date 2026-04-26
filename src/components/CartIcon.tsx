import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { motion, AnimatePresence } from "motion/react";

export default function CartIcon() {
    const { itemCount } = useCart();

    if (itemCount === 0) return null;

    return (
        <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="fixed right-6 bottom-24 z-50"
        >
            <Link to="/cart" className="w-14 h-14 primary-gradient rounded-2xl flex items-center justify-center text-background-dark shadow-2xl relative active:scale-90 transition-all">
                <ShoppingCart size={24} />
                <AnimatePresence>
                    <motion.span 
                        key={itemCount}
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="absolute -top-2 -right-2 bg-white text-black text-[10px] font-black w-6 h-6 rounded-lg flex items-center justify-center border-4 border-background-dark"
                    >
                        {itemCount}
                    </motion.span>
                </AnimatePresence>
            </Link>
        </motion.div>
    );
}
