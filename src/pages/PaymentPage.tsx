import React, { useState, useCallback, useEffect } from 'react';
import { UserProfile } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, CreditCard, Wallet, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/currency';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

declare global {
    interface Window {
        PaymentSession: any;
    }
}

export default function PaymentPage({ user }: { user: UserProfile | null }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { total, items, clearCart } = useCart();
    
    const [isLoading, setIsLoading] = useState(false);
    const [showCardForm, setShowCardForm] = useState(false);
    const [gatewayError, setGatewayError] = useState<string | null>(null);
    const [paymentStep, setPaymentStep] = useState<string>('');
    const [sessionReady, setSessionReady] = useState(false);
    const [showOTPFrame, setShowOTPFrame] = useState(false);
    const [paymentReceipt, setPaymentReceipt] = useState<any>(null);

    const log = useCallback((msg: string) => {
        console.log(`[Payment] ${msg}`);
    }, []);

    const generateOrderId = () => `NY11-${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;

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

    const initializePaymentSession = async (isRetry = false) => {
        const orderId = generateOrderId();
        const amount = total;

        try {
            if (!isRetry) {
                setIsLoading(true);
                setGatewayError(null);
            }
            
            // 1. Create the session first
            const resp = await fetch('/api/payment/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, currency: 'JOD', orderId })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(JSON.stringify(data));

            const { sessionId } = data;

            // 2. Show the form so elements appear in DOM
            setShowCardForm(true);
            setSessionReady(false);

            // 3. Wait for DOM to update then configure
            setTimeout(() => {
                if (!window.PaymentSession) {
                    console.error('Mastercard session.js not loaded on window');
                    setGatewayError('خطأ في تحميل مكتبة الدفع - يرجى تحديث الصفحة');
                    setIsLoading(false);
                    return;
                }

                console.log('Configuring PaymentSession with session:', sessionId);
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
                            console.log('PaymentSession initialized:', response);
                            setSessionReady(true);
                            setIsLoading(false);
                        },
                        formSessionUpdate: function (response: any) {
                            console.log('formSessionUpdate:', response);
                            if (response.status === "ok") {
                                handle3DSAndPay(orderId, sessionId, amount);
                            } else if (response.status === "fields_in_error") {
                                setIsLoading(false);
                                const errorFields = Object.keys(response.errors || {}).join(', ');
                                setGatewayError(`خطأ في بيانات البطاقة: ${errorFields}`);
                            } else {
                                setIsLoading(false);
                                setGatewayError('حدث خطأ في النظام. يرجى المحاولة مرة أخرى.');
                            }
                        }
                    },
                    interaction: {
                        control: "SHIFT_TAB"
                    }
                });
            }, 800); 

        } catch (err: any) {
            if (!isRetry) {
                setIsLoading(false);
                setGatewayError(err.message);
            }
        }
    };

    const handleSubmitPayment = () => {
        if (!sessionReady) return;
        setIsLoading(true);
        setGatewayError(null);
        setPaymentStep('جاري التحقق من بيانات البطاقة...');
        window.PaymentSession.updateSessionFromForm('card');
    };

    const handle3DSAndPay = async (orderId: string, sid: string, amount: number) => {
        try {
            setPaymentStep('جاري التحقق الأمني (3DS)...');
            const authTransId = `auth-${Date.now()}`;

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

            setPaymentStep('يرجى إكمال التحقق من خلال البنك الخاص بك...');

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
                const maxWait = setTimeout(() => {
                    reject(new Error('انتهت مهلة التحقق البنكي'));
                }, 5 * 60 * 1000);

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

            let authConfirmed = false;
            for (let attempt = 1; attempt <= 12; attempt++) {
                await new Promise(r => setTimeout(r, 2500));
                try {
                    const statusResp = await fetch(`/api/payment/order-status/${orderId}`);
                    const statusData = await statusResp.json();
                    const authStatus = statusData.authenticationStatus;
                    if (authStatus === 'AUTHENTICATION_SUCCESSFUL') {
                        authConfirmed = true;
                        break;
                    } else if (authStatus === 'AUTHENTICATION_UNSUCCESSFUL' || authStatus === 'AUTHENTICATION_FAILED') {
                        throw new Error('فشل التحقق من الهوية. يرجى المحاولة مرة أخرى.');
                    }
                } catch (pollErr: any) {
                    if (pollErr.message.includes('فشل')) throw pollErr;
                }
            }
            if (!authConfirmed) throw new Error('لم يتم تأكيد التحقق في الوقت المطلوب');
            
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
            setPaymentStep('جاري إتمام عملية الدفع...');
            const resp = await fetch('/api/payment/pay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, sessionId: sid, amount, currency: 'JOD', authTransactionId: authTransId })
            });
            const data = await resp.json();

            if (data.success) {
                // Save order to Firebase
                if (user) {
                    try {
                        await addDoc(collection(db, "orders"), {
                            userId: user.uid,
                            items,
                            total: amount,
                            timestamp: Date.now(),
                            status: "PAID",
                            orderId: orderId,
                            transactionId: data.transactionId
                        });
                    } catch (dbErr) {
                        console.error("Error saving order to Firestore:", dbErr);
                        // Even if DB save fails, we show success if payment was successful,
                        // but we should probably warn or try again.
                    }
                }

                setPaymentReceipt({ orderId, amount, transactionId: data.transactionId });
                clearCart();
                // We'll show success screen instead of navigating immediately
            } else {
                throw new Error(`فشلت عملية الدفع: ${data.error?.explanation || data.result}`);
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
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <CheckCircle2 size={64} />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase text-[var(--text-main)]">تم الدفع بنجاح</h2>
                    <p className="text-[var(--text-muted)] text-sm">شكراً لتسوقكم من NY11. تم استلام طلبكم.</p>
                </div>
                <div className="w-full glass rounded-3xl p-6 space-y-4 border-[var(--border-muted)]">
                    <div className="flex justify-between text-xs"><span className="text-[var(--text-muted)]">رقم الطلب</span><span className="font-bold">{paymentReceipt.orderId}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-[var(--text-muted)]">رقم العملية</span><span className="font-bold">{paymentReceipt.transactionId}</span></div>
                    <div className="flex justify-between text-xs border-t border-[var(--border-muted)] pt-4"><span className="text-[var(--text-muted)]">المبلغ المدفوع</span><span className="text-primary font-black">{formatPrice(paymentReceipt.amount, user)}</span></div>
                </div>
                <button onClick={() => navigate('/orders')} className="w-full primary-gradient text-background-dark py-5 rounded-2xl font-black shadow-xl">
                    متابعة الطلبات
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col pt-12 pb-32">
            <iframe id="hidden-3ds-frame" style={{ display: 'none' }} />
            
            <AnimatePresence>
                {showOTPFrame && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                    >
                        <div className="bg-[#0d0d0d] rounded-3xl shadow-2xl overflow-hidden w-full max-w-sm border border-white/10">
                            <div className="bg-primary px-6 py-4 flex items-center justify-between">
                                <h3 className="text-black font-black text-xs uppercase tracking-wider">التحقق من الهوية</h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                    <span className="text-white text-[8px] font-bold">SECURE</span>
                                </div>
                            </div>
                            <iframe id="otp-3ds-frame" style={{ width: '100%', height: '450px', border: 'none' }} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="px-6 flex items-center justify-between mb-8">
                <button onClick={() => navigate(-1)} className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-[var(--text-muted)] border-[var(--border-muted)]">
                    <ChevronLeft size={20} />
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-black italic tracking-tighter uppercase text-[var(--text-main)]">الدفع الإلكتروني</h1>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Mastercard Gateway</p>
                </div>
                <div className="w-12" />
            </div>

            <main className="px-6 flex-1 space-y-6">
                <div className="glass rounded-[2.5rem] p-8 border-[var(--border-muted)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full blur-3xl"></div>
                    <div className="relative z-10 space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-[10px] font-black tracking-[0.4em] text-[var(--text-muted)] uppercase">ملخص الدفع</h2>
                            <p className="text-3xl font-black text-primary">{formatPrice(total, user)}</p>
                        </div>
                        
                        <div className="flex items-center gap-4 py-4 border-y border-[var(--border-muted)]">
                            <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-primary">
                                <ShieldCheck size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold">نظام دفع آمن 100%</p>
                                <p className="text-[10px] text-[var(--text-muted)]">جميع بياناتك مشفرة ولا يتم تخزينها</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {!showCardForm ? (
                        <div className="space-y-4">
                            <button 
                                onClick={() => initializePaymentSession()}
                                disabled={isLoading}
                                className="w-full glass rounded-3xl p-6 border-[var(--border-muted)] flex items-center justify-between group hover:border-primary/30 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-[var(--text-muted)] group-hover:text-primary transition-colors">
                                        <CreditCard size={24} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black">بطاقة بنكية</p>
                                        <p className="text-[10px] text-[var(--text-muted)]">Visa, Mastercard</p>
                                    </div>
                                </div>
                                {isLoading ? <Loader2 size={20} className="animate-spin text-primary" /> : <ChevronLeft size={20} className="opacity-20" />}
                            </button>

                            <button 
                                onClick={() => navigate('/payment-methods')}
                                className="w-full glass rounded-3xl p-6 border-[var(--border-muted)] flex items-center justify-between opacity-50 grayscale cursor-not-allowed"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                                        <Wallet size={24} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black">المحفظة الإلكترونية</p>
                                        <p className="text-[10px]">قريباً...</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass rounded-[2.5rem] p-8 border-[var(--border-muted)] space-y-6"
                        >
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-2">اسم صاحب البطاقة</label>
                                    <input type="text" id="cardholder-name" className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-6 text-sm focus:border-primary focus:outline-none transition-colors" readOnly placeholder="Name on Card" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-2">رقم البطاقة</label>
                                    <input type="text" id="card-number" className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-6 text-sm focus:border-primary focus:outline-none transition-colors" readOnly placeholder="Card Number" />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-2 text-center block">الشهر</label>
                                        <input type="text" id="expiry-month" className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-2 text-sm focus:border-primary focus:outline-none transition-colors text-center" readOnly placeholder="MM" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-2 text-center block">السنة</label>
                                        <input type="text" id="expiry-year" className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-2 text-sm focus:border-primary focus:outline-none transition-colors text-center" readOnly placeholder="YY" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-2 text-center block">CVV</label>
                                        <input type="text" id="security-code" className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-2 text-sm focus:border-primary focus:outline-none transition-colors text-center" readOnly placeholder="CVV" />
                                    </div>
                                </div>
                            </div>

                            {paymentStep && (
                                <div className="bg-primary/10 text-primary px-4 py-3 rounded-2xl text-[10px] font-bold flex items-center gap-3">
                                    <Loader2 size={16} className="animate-spin" />
                                    {paymentStep}
                                </div>
                            )}

                            {gatewayError && (
                                <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-2xl text-[10px] font-bold flex items-center gap-3">
                                    <AlertTriangle size={16} />
                                    {gatewayError}
                                </div>
                            )}

                            <button 
                                onClick={handleSubmitPayment}
                                disabled={isLoading || !sessionReady}
                                className="w-full primary-gradient text-background-dark py-5 rounded-2xl font-black shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-3 mt-4"
                            >
                                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <>دفع {formatPrice(total, user)}</>}
                            </button>
                            
                            <button 
                                onClick={() => setShowCardForm(false)}
                                className="w-full text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pt-2"
                            >
                                إلغاء والعودة
                            </button>
                        </motion.div>
                    )}
                </div>
            </main>
            
            <div className="px-6 text-center opacity-30 mt-8">
                <div className="flex items-center justify-center gap-6 grayscale scale-75">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg" alt="Mastercard" className="h-6" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-6" />
                </div>
            </div>
        </div>
    );
}
