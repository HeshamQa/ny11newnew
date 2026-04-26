import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";
import { CreditCard, ShieldCheck, CheckCircle2, ChevronRight, AlertTriangle, Loader2, Landmark, Wallet } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { formatPrice } from "../lib/currency";

interface PaymentPageProps {
  user: UserProfile | null;
}

declare global {
  interface Window {
    PaymentSession: any;
  }
}

const STRINGS = {
  paymentGatewayTitle: "بوابة الدفع الآمنة",
  securePaymentSystem: "نظام دفع مشفر وآمن بالكامل",
  subscriptionInvoice: "تفاصيل الفاتورة",
  amountToPay: "المبلغ المستحق",
  jodLabel: "د.أ",
  bankCard: "بطاقة بنكية",
  cliqTransfer: "تحويل CliQ",
  startBankConnection: "بدء عملية الدفع",
  back: "رجوع",
  securePayment: "دفع آمن",
  cardHolder: "اسم صاحب البطاقة",
  cardNumber: "رقم البطاقة",
  month: "الشهر",
  year: "السنة",
  cvv: "الرمز السري (CVV)",
  payAmount: "دفع",
  checkingCardData: "جاري التحقق من بيانات البطاقة...",
  security3DS: "جاري التحقق من الأمان (3DS)...",
  completeBankVerification: "يرجى إكمال التحقق من البنك...",
  executingPayment: "جاري إتمام عملية الدفع...",
  successTransaction: "تمت العملية بنجاح!",
  paymentDeducted: "تم خصم المبلغ وتفعيل الخدمة بنجاح.",
  goToDashboard: "العودة للرئيسية",
  amount: "المبلغ",
  orderNumber: "رقم الطلب",
  transactionId: "رقم العملية",
  status: "الحالة",
  completed: "مكتمل",
  identityVerification: "التحقق من الهوية",
  fieldsError: "خطأ في بيانات البطاقة",
  systemError: "خطأ في النظام، يرجى المحاولة لاحقاً",
  bankTimedOut: "انتهت مهلة التحقق من البنك",
  authFailed: "فشل التحقق من الهوية",
  authNotConfirmed: "لم يتم تأكيد التحقق في الوقت المحدد",
  paymentFailed: "فشل الدفع",
  sessionRefreshed: "تم تحديث الجلسة، يرجى المحاولة مرة أخرى إذا استمر الخطأ.",
};

export default function PaymentPage({ user }: PaymentPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const item = location.state?.item || { name: "خدمة صحية", price: 0, image: "", category: "عام" };

  const [isLoading, setIsLoading] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'visa' | 'cliq'>('visa');
  const [paymentReceipt, setPaymentReceipt] = useState<any>(null);
  const [paymentStep, setPaymentStep] = useState<string>('');
  const [sessionReady, setSessionReady] = useState(false);
  const [showOTPFrame, setShowOTPFrame] = useState(false);

  const log = useCallback((msg: string) => {
    console.log(`[Payment] ${msg}`);
  }, []);

  const generateOrderId = () => `NY-${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;

  const writeToIframe = (iframeId: string, html: string) => {
    const iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
    if (!iframe) return;
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
  };

  const translateGatewayError = (code: string) => {
    const errors: Record<string, string> = {
      'UNSPECIFIED_FAILURE': 'تم رفض العملية من قبل البنك المصدر للبطاقة. يرجى التأكد من الرصيد أو التواصل مع البنك.',
      'DECLINED': 'تم رفض البطاقة من قبل البنك.',
      'TIMED_OUT': 'انتهت مهلة الاتصال بالبنك. يرجى المحاولة مرة أخرى.',
      'EXPIRED_CARD': 'البطاقة منتهية الصلاحية.',
      'INSUFFICIENT_FUNDS': 'لا يوجد رصيد كافٍ في البطاقة.',
      'SYSTEM_ERROR': 'خطأ في النظام، يرجى المحاولة لاحقاً.',
      'AUTHENTICATION_FAILED': 'فشل التحقق من الهوية (3D Secure).',
      'INVALID_CARD': 'بيانات البطاقة غير صحيحة.'
    };
    return errors[code] || code;
  };

  const initializePaymentSession = async (isRetry = false) => {
    const orderId = generateOrderId();
    const amount = item.price || 1;

    try {
      if (!isRetry) {
        setIsLoading(true);
        setGatewayError(null);
      }
      setSessionReady(false);

      log(`🚀 Creating session: orderId=${orderId}, amount=${amount}`);

      const resp = await fetch('/api/payment/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: 'JOD', orderId })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(JSON.stringify(data));

      const { sessionId } = data;
      log(`✅ Session created: ${sessionId}`);

      if (!window.PaymentSession) throw new Error('PaymentSession library not loaded');

      window.PaymentSession.configure({
        session: sessionId,
        fields: {
          card: {
            number: "#card-number",
            securityCode: "#security-code",
            expiryMonth: "#expiry-month",
            expiryYear: "#expiry-year",
            nameOnCard: "#cardholder-name"
          }
        },
        frameEmbeddingMitigation: ["javascript"],
        callbacks: {
          initialized: function (response: any) {
            log(`✅ Hosted fields initialized`);
            setSessionReady(true);
            if (!isRetry) {
              setIsLoading(false);
              setShowCardForm(true);
            }
          },
          formSessionUpdate: function (response: any) {
            if (response.status === "ok") {
              handle3DSAndPay(orderId, sessionId, amount);
            } else if (response.status === "fields_in_error") {
              setIsLoading(false);
              const errorFields = Object.keys(response.errors || {}).join(', ');
              setGatewayError(`${STRINGS.fieldsError}: ${errorFields}`);
            } else {
              setIsLoading(false);
              setGatewayError(STRINGS.systemError);
            }
          }
        }
      });
    } catch (err: any) {
      if (!isRetry) {
        setIsLoading(false);
        setGatewayError(err.message);
      }
      log(`💥 Error: ${err.message}`);
    }
  };

  const handleSubmitPayment = () => {
    if (!sessionReady) return;
    setIsLoading(true);
    setGatewayError(null);
    setPaymentStep(STRINGS.checkingCardData);
    window.PaymentSession.updateSessionFromForm('card');
  };

  const handle3DSAndPay = async (orderId: string, sid: string, amount: number) => {
    try {
      setPaymentStep(STRINGS.security3DS);
      const authTransId = `auth-${Date.now()}`;

      // 3a: INITIATE_AUTHENTICATION
      const initResp = await fetch('/api/payment/initiate-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, transactionId: authTransId, sessionId: sid, currency: 'JOD' })
      });
      const initData = await initResp.json();

      const initHtml = initData.authentication?.redirect?.html;
      if (initHtml) {
        writeToIframe('hidden-3ds-frame', initHtml);
        await new Promise(r => setTimeout(r, 3000));
      }

      // 3b: AUTHENTICATE_PAYER
      setPaymentStep(STRINGS.completeBankVerification);

      const authResp = await fetch('/api/payment/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          transactionId: authTransId,
          sessionId: sid,
          amount,
          currency: 'JOD',
          browserDetails: {
            javaEnabled: navigator.javaEnabled?.() || false,
            language: navigator.language,
            screenHeight: screen.height,
            screenWidth: screen.width,
            timeZone: new Date().getTimezoneOffset(),
            colorDepth: screen.colorDepth,
            returnUrl: window.location.origin + '/api/payment/3ds-callback'
          }
        })
      });
      const authData = await authResp.json();

      if (authData.result === 'ERROR') throw new Error(JSON.stringify(authData.error));

      let otpHtml = authData.authentication?.redirect?.html;

      if (!otpHtml && authData.authentication?.payerInteraction === 'NOT_REQUIRED') {
        await executePayment(orderId, sid, amount, authTransId);
        return;
      }

      if (otpHtml) {
        otpHtml = otpHtml.replace(/target=["'][^"']*["']/gi, 'target="_self"');
        if (!otpHtml.toLowerCase().includes('target=')) {
            otpHtml = otpHtml.replace(/<form/i, '<form target="_self"');
        }
      }

      setShowOTPFrame(true);
      await new Promise(r => setTimeout(r, 200));
      writeToIframe('otp-3ds-frame', otpHtml || '');

      await new Promise<void>((resolve, reject) => {
        const maxWait = setTimeout(() => reject(new Error(STRINGS.bankTimedOut)), 5 * 60 * 1000);
        const messageHandler = (event: MessageEvent) => {
          if (event.data === '3ds_challenge_complete') {
            clearTimeout(maxWait);
            window.removeEventListener('message', messageHandler);
            setShowOTPFrame(false);
            resolve();
          }
        };
        window.addEventListener('message', messageHandler);
      });

      // Polling
      let authConfirmed = false;
      for (let attempt = 1; attempt <= 12; attempt++) {
        await new Promise(r => setTimeout(r, 2500));
        const statusResp = await fetch(`/api/payment/order-status/${orderId}`);
        const statusData = await statusResp.json();
        if (statusData.authenticationStatus === 'AUTHENTICATION_SUCCESSFUL') {
          authConfirmed = true;
          break;
        } else if (['AUTHENTICATION_UNSUCCESSFUL', 'AUTHENTICATION_FAILED'].includes(statusData.authenticationStatus)) {
          throw new Error(STRINGS.authFailed);
        }
      }
      if (!authConfirmed) throw new Error(STRINGS.authNotConfirmed);
      
      await executePayment(orderId, sid, amount, authTransId);

    } catch (err: any) {
      setIsLoading(false);
      setShowOTPFrame(false);
      setGatewayError(err.message);
      initializePaymentSession(true);
    }
  };

  const executePayment = async (orderId: string, sid: string, amount: number, authTransId: string) => {
    try {
      setPaymentStep(STRINGS.executingPayment);
      const resp = await fetch('/api/payment/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, sessionId: sid, amount, currency: 'JOD', authTransactionId: authTransId })
      });
      const data = await resp.json();

      if (data.success) {
        setPaymentReceipt({ orderId, amount, status: data.status, transactionId: data.transactionId });
      } else {
        const gatewayCode = data.gatewayCode || data.error?.cause || data.result;
        const translatedError = translateGatewayError(gatewayCode);
        throw new Error(`${STRINGS.paymentFailed}: ${translatedError}`);
      }
    } catch (err: any) {
      setGatewayError(err.message);
      initializePaymentSession(true);
    } finally {
      setIsLoading(false);
      setPaymentStep('');
    }
  };

  if (paymentReceipt) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background-dark">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full glass p-8 rounded-[2.5rem] text-center border-l-4 border-l-primary"
        >
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-primary" size={40} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">{STRINGS.successTransaction}</h2>
          <p className="text-white/60 mb-8 text-sm">{STRINGS.paymentDeducted}</p>
          
          <div className="space-y-4 bg-white/5 p-6 rounded-3xl text-right mb-8">
            <div className="flex justify-between items-center">
              <span className="text-white/40 text-xs">{STRINGS.amount}</span>
              <span className="font-black text-primary">{paymentReceipt.amount} {STRINGS.jodLabel}</span>
            </div>
            <div className="flex justify-between items-center border-t border-white/5 pt-4">
              <span className="text-white/40 text-xs">{STRINGS.transactionId}</span>
              <span className="font-bold text-white text-xs">{paymentReceipt.transactionId}</span>
            </div>
          </div>

          <button 
            onClick={() => navigate("/")} 
            className="w-full py-4 bg-primary text-black font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            {STRINGS.goToDashboard}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 pb-32 bg-background-dark min-h-screen">
      <iframe id="hidden-3ds-frame" title="3DS" style={{ display: 'none' }} />
      
      <AnimatePresence>
        {showOTPFrame && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <div className="bg-[#1a1d23] rounded-3xl shadow-2xl overflow-hidden w-full max-w-sm border border-white/10">
              <div className="bg-primary px-6 py-4 flex items-center justify-between">
                <h3 className="text-black font-black text-xs uppercase">{STRINGS.identityVerification}</h3>
                <ShieldCheck size={18} className="text-black" />
              </div>
              <iframe
                id="otp-3ds-frame"
                title="OTP"
                style={{ width: '100%', height: '450px', border: 'none' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="py-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 glass rounded-full flex items-center justify-center text-white/60">
          <ChevronRight size={20} />
        </button>
        <div>
          <h1 className="text-lg font-black">{STRINGS.paymentGatewayTitle}</h1>
          <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            {STRINGS.securePaymentSystem}
          </div>
        </div>
      </header>

      <main className="space-y-6">
        {/* Invoice Card */}
        <section className="glass p-6 rounded-[2rem] border-r-4 border-r-primary relative overflow-hidden">
          <div className="absolute top-0 left-0 w-24 h-24 bg-primary/5 rounded-br-full" />
          <h2 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">{STRINGS.subscriptionInvoice}</h2>
          <div className="flex gap-4 items-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              {item.image ? <img src={item.image} className="w-full h-full object-cover" alt="" /> : <Landmark size={24} className="text-white/20" />}
            </div>
            <div>
              <h3 className="font-black text-white text-sm">{item.name}</h3>
              <p className="text-primary text-[10px] font-bold uppercase tracking-tighter">{item.category}</p>
            </div>
          </div>
          <div className="bg-white/5 p-5 rounded-2xl flex justify-between items-center border border-white/5">
            <span className="text-xs text-white/40">{STRINGS.amountToPay}</span>
            <span className="text-2xl font-black text-primary">{item.price} <small className="text-xs">{STRINGS.jodLabel}</small></span>
          </div>
        </section>

        {/* Payment Methods */}
        {!showCardForm ? (
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <PaymentMethodBtn 
                active={paymentMethod === 'visa'} 
                onClick={() => setPaymentMethod('visa')}
                icon={<CreditCard size={20} />}
                label={STRINGS.bankCard}
              />
              <PaymentMethodBtn 
                active={paymentMethod === 'cliq'} 
                onClick={() => setPaymentMethod('cliq')}
                icon={<Landmark size={20} />}
                label={STRINGS.cliqTransfer}
              />
            </div>

            {paymentMethod === 'visa' ? (
              <button 
                onClick={() => initializePaymentSession()}
                disabled={isLoading}
                className="w-full py-5 bg-primary text-black font-black rounded-2xl shadow-xl shadow-primary/10 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : STRINGS.startBankConnection}
              </button>
            ) : (
              <div className="glass p-6 rounded-[2rem] border border-white/5 text-center">
                <Wallet className="mx-auto text-primary mb-3" size={32} />
                <p className="text-xs text-white/60 leading-relaxed">يرجى التحويل إلى حساب CliQ الخاص بنا:<br/><span className="text-primary font-black text-lg">NY11-PAY</span></p>
                <button className="mt-4 w-full py-3 bg-white/5 text-white font-bold rounded-xl text-xs border border-white/10">تأكيد التحويل يدوياً</button>
              </div>
            )}
          </section>
        ) : (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-8 rounded-[2.5rem] space-y-6 border border-white/5"
          >
            <div className="flex items-center justify-between">
              <button onClick={() => { setShowCardForm(false); setGatewayError(null); }} className="text-primary text-xs font-bold border-b border-primary/30 pb-0.5">{STRINGS.back}</button>
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <ShieldCheck size={12} className="text-primary" />
                <span className="text-[10px] font-bold text-white/60">{STRINGS.securePayment}</span>
              </div>
            </div>

            <div className="space-y-5">
              <FormField label={STRINGS.cardHolder} id="cardholder-name" placeholder="Name on Card" />
              <FormField label={STRINGS.cardNumber} id="card-number" placeholder="0000 0000 0000 0000" dir="ltr" />
              
              <div className="grid grid-cols-3 gap-4" dir="ltr">
                <FormField label={STRINGS.month} id="expiry-month" placeholder="MM" center />
                <FormField label={STRINGS.year} id="expiry-year" placeholder="YY" center />
                <FormField label={STRINGS.cvv} id="security-code" placeholder="CVV" center />
              </div>

              {paymentStep && (
                <div className="bg-primary/10 text-primary p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-primary/20">
                  <Loader2 size={16} className="animate-spin" />
                  {paymentStep}
                </div>
              )}

              {gatewayError && (
                <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-xs font-bold flex flex-col gap-1 border border-red-500/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <span>{gatewayError}</span>
                  </div>
                  <span className="text-[9px] opacity-60 font-normal mr-6">{STRINGS.sessionRefreshed}</span>
                </div>
              )}

              <button 
                onClick={handleSubmitPayment} 
                disabled={isLoading || !sessionReady} 
                className="w-full py-5 bg-primary text-black font-black rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:bg-white/10 disabled:text-white/20 disabled:shadow-none"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : `${STRINGS.payAmount} ${item.price} ${STRINGS.jodLabel}`}
              </button>
            </div>
          </motion.section>
        )}
      </main>

      {/* Trust badges */}
      <div className="mt-8 flex justify-center gap-8 opacity-20 grayscale brightness-200">
        <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg" alt="Mastercard" className="h-6" />
        <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-6" />
      </div>
    </div>
  );
}

function PaymentMethodBtn({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all ${active ? 'border-primary bg-primary/5' : 'border-white/5 bg-white/5 opacity-40'}`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform ${active ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-110' : 'bg-white/5 text-white border border-white/10'}`}>
        {icon}
      </div>
      <span className={`font-black text-[9px] uppercase tracking-widest ${active ? 'text-primary' : 'text-white'}`}>{label}</span>
    </button>
  );
}

function FormField({ label, id, placeholder, dir, center }: any) {
  return (
    <div>
      <label className="block text-[9px] font-black text-white/30 mb-2 uppercase tracking-widest px-1">{label}</label>
      <input 
        type="text" 
        id={id} 
        dir={dir}
        className={`w-full h-14 px-5 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:border-primary focus:outline-none transition-all placeholder:text-white/10 ${center ? 'text-center' : ''}`} 
        readOnly 
        placeholder={placeholder} 
      />
    </div>
  );
}
