'use client';
import styles from "./styles.module.css";
import Image from "next/image";
import logo from "../../public/images/logo.png"
import { useState } from "react";
import { db } from "@/app/firebase";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { HiOutlineLockClosed } from "react-icons/hi2";
import { HiOutlineEnvelope } from "react-icons/hi2";
import { IoStorefrontOutline } from "react-icons/io5";

function Login() {
    const [creat, setCreat] = useState(false)
    const [userName, setUserName] = useState('')
    const [password, setPassword] = useState('')
    const [shop, setShop] = useState('') // ده يستخدم بس عند إنشاء الحساب

    // ✅ إنشاء حساب جديد
    const handleCreatAcc = async () => {
        if (!userName) {
            alert("يجب ادخال اسم المستخدم")
            return
        }
        if (!password) {
            alert("يجب ادخال كلمة المرور")
            return
        }
        if (!shop) {
            alert("يجب ادخال اسم الفرع")
            return
        }

        const q = query(collection(db, 'users'), where('userName', '==', userName))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
            await addDoc(collection(db, 'users'), {
                userName,
                password,
                shop,
                isSubscribed: false
            })
            alert("✅ تم انشاء حساب للمستخدم")
            setUserName('')
            setPassword('')
            setShop('')
        } else {
            alert('❌ المستخدم موجود بالفعل')
        }
    }

    // ✅ تسجيل الدخول
    const handleLogin = async () => {
        const q = query(collection(db, 'users'), where('userName', '==', userName))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
            alert('❌ اسم المستخدم غير صحيح')
        } else {
            const userDoc = querySnapshot.docs[0]
            const userData = userDoc.data()

            if (userData.password !== password) {
                alert("❌ كلمة المرور غير صحيحة")
            } else {
                if (userData.isSubscribed === false) {
                    alert('⚠️ يجب تفعيل البرنامج اولا برجاء التواصل مع المطور')
                } else {
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('userName', userData.userName)
                        localStorage.setItem('shop', userData.shop)
                        window.location.href = '/'
                    }
                }
            }
        }
    }

    return (
        <div className={styles.loginContainer}>
            <div className={styles.backgroundPattern}></div>
            
            <div className={styles.loginCard}>
                <div className={styles.logoContainer}>
                    <div className={styles.logoWrapper}>
                        <div className={styles.logoCircle}></div>
                        <div className={styles.imageContaienr}>
                            <Image src={logo} fill style={{ objectFit: 'cover' }} className={styles.logoImage} alt="logoImage" />
                        </div>
                    </div>
                </div>

                {/* تسجيل الدخول */}
                <div className={styles.loginContent} style={{ display: creat ? 'none' : 'flex' }}>
                    <h1 className={styles.welcomeTitle}>مرحبا بعودتك</h1>
                    <p className={styles.switchText}>
                        ليس لديك حساب بعد؟{' '}
                        <button className={styles.switchLink} onClick={() => setCreat(true)}>
                            إنشاء حساب جديد
                        </button>
                    </p>

                    <div className={styles.inputs}>
                        <div className={styles.inputWrapper}>
                            <HiOutlineEnvelope className={styles.inputIcon} />
                            <input 
                                type="text" 
                                value={userName} 
                                placeholder="اسم المستخدم" 
                                onChange={(e) => setUserName(e.target.value)}
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.inputWrapper}>
                            <HiOutlineLockClosed className={styles.inputIcon} />
                            <input 
                                type="password" 
                                value={password}
                                placeholder="كلمة المرور" 
                                onChange={(e) => setPassword(e.target.value)}
                                className={styles.input}
                            />
                        </div>
                        <button className={styles.loginBtn} onClick={handleLogin}>
                            تسجيل الدخول
                        </button>
                    </div>
                </div>

                {/* إنشاء حساب */}
                <div className={styles.loginContent} style={{ display: creat ? 'flex' : 'none' }}>
                    <h1 className={styles.welcomeTitle}>إنشاء حساب جديد</h1>
                    <p className={styles.switchText}>
                        لديك حساب بالفعل؟{' '}
                        <button className={styles.switchLink} onClick={() => setCreat(false)}>
                            تسجيل الدخول
                        </button>
                    </p>

                    <div className={styles.inputs}>
                        <div className={styles.inputWrapper}>
                            <HiOutlineEnvelope className={styles.inputIcon} />
                            <input 
                                type="text" 
                                value={userName} 
                                placeholder="اسم المستخدم" 
                                onChange={(e) => setUserName(e.target.value)}
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.inputWrapper}>
                            <HiOutlineLockClosed className={styles.inputIcon} />
                            <input 
                                type="password" 
                                value={password} 
                                placeholder="كلمة المرور" 
                                onChange={(e) => setPassword(e.target.value)}
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.inputWrapper}>
                            <IoStorefrontOutline className={styles.inputIcon} />
                            <input 
                                type="text" 
                                value={shop} 
                                placeholder="اسم الفرع" 
                                onChange={(e) => setShop(e.target.value)}
                                className={styles.input}
                            />
                        </div>
                        <button className={styles.loginBtn} onClick={handleCreatAcc}>
                            إنشاء حساب جديد
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login;
