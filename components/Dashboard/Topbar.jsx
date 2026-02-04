'use client';
import { useState, useEffect, useRef } from 'react';
import styles from './Topbar.module.css';
import { IoIosArrowDown } from 'react-icons/io';
import { BiLogOutCircle } from 'react-icons/bi';
import { HiOutlineSun } from 'react-icons/hi';
import { HiOutlineMoon } from 'react-icons/hi';
import { HiOutlineComputerDesktop } from 'react-icons/hi2';
import { HiOutlineXCircle } from 'react-icons/hi2';
import { useTheme } from '@/contexts/ThemeContext';
import { db } from '@/app/firebase';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';

export default function Topbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [shop, setShop] = useState('');
  const dropdownRef = useRef(null);
  const { theme, changeTheme } = useTheme();
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const notificationTimerRef = useRef(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmCallback, setConfirmCallback] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const themeOptions = [
    { value: 'system', label: 'نظام', icon: HiOutlineComputerDesktop },
    { value: 'dark', label: 'داكن', icon: HiOutlineMoon },
    { value: 'light', label: 'فاتح', icon: HiOutlineSun },
  ];

  // قراءة اسم المستخدم واسم الفرع من localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserName = localStorage.getItem('userName') || '';
      const storedShop = localStorage.getItem('shop') || '';
      setUserName(storedUserName);
      setShop(storedShop);
    }
  }, []);

  // دالة لجعل أول حرف capital
  const capitalizeFirst = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // إغلاق Sidebar عند تغيير حجم الشاشة
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // تمرير حالة Sidebar للصفحة الرئيسية
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: isSidebarOpen }));
    }
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // إغلاق القائمة المنسدلة عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      window.location.href = '/';
    }
  };

  const handleThemeChange = (newTheme) => {
    changeTheme(newTheme);
    setIsDropdownOpen(false);
  };

  // إخفاء الإشعار تلقائياً
  useEffect(() => {
    if (notification.show) {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }

      notificationTimerRef.current = setTimeout(() => {
        setNotification({ show: false, message: '', type: 'success' });
        notificationTimerRef.current = null;
      }, 3000);

      return () => {
        if (notificationTimerRef.current) {
          clearTimeout(notificationTimerRef.current);
          notificationTimerRef.current = null;
        }
      };
    }
  }, [notification.show]);

  const showNotification = (message, type = 'success') => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = null;
    }
    setNotification({ show: true, message, type });
  };

  const hideNotification = () => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = null;
    }
    setNotification({ show: false, message: '', type: 'success' });
  };

  // دوال التأكيد المخصص
  const showConfirm = (message, callback) => {
    setConfirmMessage(message);
    setConfirmCallback(() => callback);
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    if (confirmCallback) {
      confirmCallback();
    }
    setShowConfirmModal(false);
    setConfirmMessage('');
    setConfirmCallback(null);
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setConfirmMessage('');
    setConfirmCallback(null);
  };

  const handleCloseShift = () => {
    if (!shop) {
      showNotification('❌ يجب تسجيل الدخول أولاً', 'error');
      return;
    }

    showConfirm(
      'هل أنت متأكد من تقفيل الوردية؟\nسيتم نقل جميع المبيعات والمصاريف اليومية إلى التقارير.',
      async () => {
        await processCloseShift();
      }
    );
  };

  const processCloseShift = async () => {
    setIsProcessing(true);

    try {
      // حساب تاريخ اليوم (بداية ونهاية)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayStart = Timestamp.fromDate(today);
      const todayEnd = Timestamp.fromDate(tomorrow);

      // جلب المبيعات اليومية
      let salesSnapshot;
      try {
        const salesQuery = query(
          collection(db, 'sales'),
          where('shop', '==', shop),
          where('date', '>=', todayStart),
          where('date', '<', todayEnd)
        );
        salesSnapshot = await getDocs(salesQuery);
      } catch (error) {
        // إذا فشل الاستعلام، جلب جميع المبيعات وتصفيتها يدوياً
        console.log('Query with date range failed, fetching all sales:', error);
        const salesQuery = query(
          collection(db, 'sales'),
          where('shop', '==', shop)
        );
        salesSnapshot = await getDocs(salesQuery);
      }

      // نقل المبيعات اليومية إلى reports
      let salesCount = 0;
      for (const docSnapshot of salesSnapshot.docs) {
        const data = docSnapshot.data();
        
        // التحقق من أن التاريخ ضمن اليوم الحالي
        let invoiceDate;
        if (data.date?.toDate) {
          invoiceDate = data.date.toDate();
        } else if (data.date instanceof Date) {
          invoiceDate = data.date;
        } else if (data.createdAt?.toDate) {
          invoiceDate = data.createdAt.toDate();
        } else if (data.createdAt instanceof Date) {
          invoiceDate = data.createdAt;
        } else {
          continue; // تخطي إذا لم يكن هناك تاريخ
        }

        // التحقق من أن التاريخ ضمن اليوم
        if (invoiceDate >= today && invoiceDate < tomorrow) {
          // نقل إلى reports
          await addDoc(collection(db, 'reports'), data);
          // حذف من sales
          await deleteDoc(doc(db, 'sales', docSnapshot.id));
          salesCount++;
        }
      }

      // جلب المصاريف اليومية
      let expensesSnapshot;
      try {
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('shop', '==', shop),
          where('date', '>=', todayStart),
          where('date', '<', todayEnd)
        );
        expensesSnapshot = await getDocs(expensesQuery);
      } catch (error) {
        // إذا فشل الاستعلام، جلب جميع المصاريف وتصفيتها يدوياً
        console.log('Query with date range failed, fetching all expenses:', error);
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('shop', '==', shop)
        );
        expensesSnapshot = await getDocs(expensesQuery);
      }

      // نقل المصاريف اليومية إلى expensesReports
      let expensesCount = 0;
      for (const docSnapshot of expensesSnapshot.docs) {
        const data = docSnapshot.data();
        
        // التحقق من أن التاريخ ضمن اليوم الحالي
        let expenseDate;
        if (data.date?.toDate) {
          expenseDate = data.date.toDate();
        } else if (data.date instanceof Date) {
          expenseDate = data.date;
        } else if (data.createdAt?.toDate) {
          expenseDate = data.createdAt.toDate();
        } else if (data.createdAt instanceof Date) {
          expenseDate = data.createdAt;
        } else {
          continue; // تخطي إذا لم يكن هناك تاريخ
        }

        // التحقق من أن التاريخ ضمن اليوم
        if (expenseDate >= today && expenseDate < tomorrow) {
          // نقل إلى expensesReports
          await addDoc(collection(db, 'expensesReports'), data);
          // حذف من expenses
          await deleteDoc(doc(db, 'expenses', docSnapshot.id));
          expensesCount++;
        }
      }

      showNotification(
        `✅ تم تقفيل الوردية بنجاح\nتم نقل ${salesCount} فاتورة و ${expensesCount} مصروف`,
        'success'
      );
    } catch (error) {
      console.error('Error closing shift:', error);
      showNotification('❌ حدث خطأ أثناء تقفيل الوردية', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.topbar}>
      <div className={styles.leftSection}>
        <button 
          className={styles.burgerMenuBtn}
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <div className={`${styles.burgerIcon} ${isSidebarOpen ? styles.open : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
        <div className={styles.logo}>
          <img src="/images/logo.png" alt="Logo" className={styles.logoImage} />
          <span className={styles.logoText}>اسكرينا</span>
        </div>
      </div>
      <div className={styles.rightSection}>
        <div className={styles.userProfileContainer} ref={dropdownRef}>
          <div 
            className={styles.userProfile}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className={styles.userAvatar}>
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'User')}&background=3B82F6&color=fff`} alt="User" />
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{capitalizeFirst(userName) || 'مستخدم'}</span>
              <span className={styles.userRole}>{shop || 'فرع'}</span>
            </div>
            <IoIosArrowDown className={styles.dropdownIcon} />
          </div>
          
          {isDropdownOpen && (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownHeader}>المظهر</div>
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.value;
                return (
                  <button
                    key={option.value}
                    className={`${styles.dropdownItem} ${isSelected ? styles.selected : ''}`}
                    onClick={() => handleThemeChange(option.value)}
                  >
                    <Icon className={styles.themeIcon} />
                    <span>{option.label}</span>
                    {isSelected && <span className={styles.checkmark}>✓</span>}
                  </button>
                );
              })}
              <div className={styles.dropdownDivider}></div>
              <button
                className={`${styles.dropdownItem} ${styles.logoutItem}`}
                onClick={handleLogout}
              >
                <BiLogOutCircle className={styles.logoutIcon} />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          )}
        </div>
        <button 
          className={styles.closeShiftBtn} 
          onClick={handleCloseShift}
          disabled={isProcessing}
        >
          <HiOutlineXCircle className={styles.closeShiftIcon} />
          <span>{isProcessing ? 'جاري المعالجة...' : 'تقفيل وردية'}</span>
        </button>
      </div>

      {/* Notification Popup */}
      {notification.show && notification.message && (
        <div
          className={`${styles.notification} ${styles[notification.type]}`}
          onClick={hideNotification}
          role="alert"
          aria-live="polite"
        >
          <span className={styles.notificationMessage}>{notification.message}</span>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className={styles.confirmModalOverlay} onClick={handleCancelConfirm}>
          <div className={styles.confirmModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmModalHeader}>
              <h3 className={styles.confirmModalTitle}>تأكيد تقفيل الوردية</h3>
            </div>
            <div className={styles.confirmModalBody}>
              <p className={styles.confirmModalMessage}>{confirmMessage}</p>
            </div>
            <div className={styles.confirmModalActions}>
              <button
                className={styles.cancelBtn}
                onClick={handleCancelConfirm}
                disabled={isProcessing}
              >
                إلغاء
              </button>
              <button
                className={styles.confirmBtn}
                onClick={handleConfirm}
                disabled={isProcessing}
              >
                {isProcessing ? 'جاري المعالجة...' : 'تأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

