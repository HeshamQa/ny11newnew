import { db } from "./firebase";
import { collection, doc, setDoc, getDocs, writeBatch } from "firebase/firestore";

export async function seedDatabase() {
  const menuSnap = await getDocs(collection(db, "menu"));
  if (menuSnap.size > 0) return; // Already seeded

  const batch = writeBatch(db);

  // Menu Items
  const foodItems = [
    {
      name: "سلطة السلمون والأفوكادو",
      description: "سلمون مشوي مع قطع الأفوكادو الطازجة، الكينوا، والخضروات الورقية بصلصة الليمون والأعشاب.",
      price: 75,
      calories: 450,
      protein: 32,
      carbs: 18,
      fats: 22,
      ingredients: ["سلمون", "أفوكادو", "كينوا", "جرجير"],
      category: "سلطات",
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400"
    },
    {
      name: "دجاج بيري بيري الصحي",
      description: "صدر دجاج متبل بخلطة البيري بيري وتقدم مع أرز بني وخضروات مشوية.",
      price: 65,
      calories: 520,
      protein: 45,
      carbs: 60,
      fats: 12,
      ingredients: ["دجاج", "أرز بني", "كوسة", "فلفل"],
      category: "وجبات رئيسية",
      image: "https://images.unsplash.com/photo-1567620905732-2d1ec7bb7445?auto=format&fit=crop&q=80&w=400"
    },
    {
      name: "شوفان التوت والمكسرات",
      description: "شوفان عضوي محضر مع حليب اللوز والتوت المشكل وبذور الشيا والمكسرات.",
      price: 35,
      calories: 320,
      protein: 12,
      carbs: 45,
      fats: 8,
      ingredients: ["شوفان", "توت", "لوز", "بذور شيا"],
      category: "فطور",
      image: "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&q=80&w=400"
    }
  ];

  foodItems.forEach(item => {
    const ref = doc(collection(db, "menu"));
    batch.set(ref, item);
  });

  // Lab Tests
  const labTests = [
    {
      name: "تحليل فيتامين د",
      description: "فحص شامل لمستوى فيتامين د في الدم لضمان صحة العظام والمناعة.",
      price: 150,
      category: "فيتامينات",
      image: "https://images.unsplash.com/photo-1579154235602-3c375276277a?auto=format&fit=crop&q=80&w=400"
    },
    {
      name: "فحص هرمونات اللياقة",
      description: "تحليل شامل للهرمونات المؤثرة على الأداء الرياضي وبناء العضلات.",
      price: 450,
      category: "هرمونات",
      image: "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&q=80&w=400"
    },
    {
      name: "تحليل الحساسية الغذائية",
      description: "اختبار شامل لـ 90 نوع من الأطعمة لتحديد مسببات الحساسية أو عدم التحمل.",
      price: 850,
      category: "أخرى",
      image: "https://images.unsplash.com/photo-1542887800-faca9a8a5d30?auto=format&fit=crop&q=80&w=400"
    }
  ];

  labTests.forEach(test => {
    const ref = doc(collection(db, "labs"));
    batch.set(ref, test);
  });

  // Experts
  const experts = [
    {
      name: "ك. أحمد محمود",
      role: "TRAINER",
      rating: 4.9,
      price: 150,
      image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=400",
      bio: "مدرب لياقة بدنية متخصص في بناء العضلات والتحول الجسدي.",
      online: true
    },
    {
      name: "أ. سارة خالد",
      role: "LAB_MANAGER",
      rating: 5.0,
      price: 200,
      image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=400",
      bio: "أخصائية تحاليل طبية واستشارية تغذية علاجية.",
      online: true
    },
    {
      name: "د. ليلى علي",
      role: "LAB_MANAGER",
      rating: 4.8,
      price: 180,
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400",
      bio: "خبيرة في الصحة العامة وتحسين نمط الحياة.",
      online: false
    }
  ];

  experts.forEach(expert => {
    const ref = doc(collection(db, "experts"));
    batch.set(ref, expert);
  });

  await batch.commit();
}
