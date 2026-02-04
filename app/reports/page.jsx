'use client';
import { useState, useEffect, useRef } from 'react';
import { db } from '@/app/firebase';
import { collection, getDocs, query, where, Timestamp, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { HiOutlineChartBar, HiOutlineShare, HiOutlineArrowDownTray, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';
import { HiCurrencyDollar, HiOutlineMinusCircle, HiOutlineTrendingUp, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineCalendar } from 'react-icons/hi';
import styles from './styles.module.css';
import Topbar from '@/components/Dashboard/Topbar';
import Sidebar from '@/components/Dashboard/Sidebar';

export default function Reports() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [treasury, setTreasury] = useState(0); // الخزنة
  const [expenses, setExpenses] = useState(0); // المصاريف
  const [netProfit, setNetProfit] = useState(0); // صافي الربح
  const [profitStatus, setProfitStatus] = useState('profit'); // 'profit' or 'loss'
  const [treasuryExpenses, setTreasuryExpenses] = useState(0); // مصاريف الخزنة
  const [showTreasuryModal, setShowTreasuryModal] = useState(false);
  const [treasuryTransactions, setTreasuryTransactions] = useState([]);
  const [treasuryModalType, setTreasuryModalType] = useState('deposit'); // 'deposit' or 'withdrawal'
  const [treasuryAmount, setTreasuryAmount] = useState('');
  const [treasuryDescription, setTreasuryDescription] = useState('');
  const [treasuryDate, setTreasuryDate] = useState('');
  const [isSavingTreasury, setIsSavingTreasury] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const notificationTimerRef = useRef(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmCallback, setConfirmCallback] = useState(null);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  const shop = typeof window !== 'undefined' ? localStorage.getItem('shop') : '';

  // تنسيق الأرقام
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // جلب البيانات من Firebase
  const fetchReports = async () => {
    if (!shop) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // إعداد التواريخ للفلترة
      let fromDateObj = null;
      let toDateObj = null;

      if (fromDate) {
        fromDateObj = new Date(fromDate);
        fromDateObj.setHours(0, 0, 0, 0);
      }

      if (toDate) {
        toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999);
      }

      // جلب الفواتير من reports collection
      // نستخدم فلترة يدوية لتجنب مشكلة الـ index
      let reportsSnapshot;
      try {
        const reportsQuery = query(
          collection(db, 'reports'),
          where('shop', '==', shop)
        );
        reportsSnapshot = await getDocs(reportsQuery);
      } catch (error) {
        console.error('Error fetching reports:', error);
        reportsSnapshot = { docs: [] };
      }

      let totalTreasury = 0;
      let totalProfit = 0;

      reportsSnapshot.forEach((doc) => {
        const data = doc.data();

        // فلترة يدوية حسب التاريخ
        if (fromDateObj || toDateObj) {
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
            return; // تخطي إذا لم يكن هناك تاريخ
          }

          // فلترة يدوية
          if (fromDateObj && invoiceDate < fromDateObj) {
            return;
          }
          if (toDateObj && invoiceDate > toDateObj) {
            return;
          }
        }

        totalTreasury += data.total || 0;
        totalProfit += data.totalProfit || 0;
      });

      // جلب المصاريف من expensesReports collection
      // نستخدم فلترة يدوية لتجنب مشكلة الـ index
      let expensesSnapshot;
      try {
        const expensesQuery = query(
          collection(db, 'expensesReports'),
          where('shop', '==', shop)
        );
        expensesSnapshot = await getDocs(expensesQuery);
      } catch (error) {
        console.error('Error fetching expensesReports:', error);
        expensesSnapshot = { docs: [] };
      }

      let totalExpenses = 0;

      expensesSnapshot.forEach((doc) => {
        const data = doc.data();

        // فلترة يدوية حسب التاريخ
        if (fromDateObj || toDateObj) {
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
            return; // تخطي إذا لم يكن هناك تاريخ
          }

          // فلترة يدوية
          if (fromDateObj && expenseDate < fromDateObj) {
            return;
          }
          if (toDateObj && expenseDate > toDateObj) {
            return;
          }
        }

        totalExpenses += data.amount || 0;
      });

      // حساب صافي الربح
      const calculatedNetProfit = totalProfit - totalExpenses;

      // جلب معاملات الخزنة لتحديث الخزنة
      let treasuryDeposits = 0;
      let treasuryWithdrawals = 0;
      let treasurySnapshot = null;
      
      try {
        const treasuryQuery = query(
          collection(db, 'treasury'),
          where('shop', '==', shop)
        );
        treasurySnapshot = await getDocs(treasuryQuery);
        
        treasurySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // فلترة يدوية حسب التاريخ
          if (fromDateObj || toDateObj) {
            let transactionDate;
            if (data.date?.toDate) {
              transactionDate = data.date.toDate();
            } else if (data.date instanceof Date) {
              transactionDate = data.date;
            } else if (data.createdAt?.toDate) {
              transactionDate = data.createdAt.toDate();
            } else if (data.createdAt instanceof Date) {
              transactionDate = data.createdAt;
            } else {
                return;
            }

            if (fromDateObj && transactionDate < fromDateObj) {
              return;
            }
            if (toDateObj && transactionDate > toDateObj) {
              return;
            }
          }

          if (data.type === 'deposit') {
            treasuryDeposits += data.amount || 0;
          } else if (data.type === 'withdrawal') {
            treasuryWithdrawals += data.amount || 0;
          }
        });
      } catch (error) {
        console.error('Error fetching treasury for calculation:', error);
        treasurySnapshot = { docs: [] };
      }

      // تحديث الخزنة ليشمل المعاملات
      const updatedTreasury = totalTreasury + treasuryDeposits - treasuryWithdrawals;

      // حساب إجمالي مصاريف الخزنة (الصرف فقط) - نستخدم treasuryWithdrawals المحسوب بالفعل
      const totalTreasuryExpenses = treasuryWithdrawals;

      // تحديد حالة الربح/الخسارة
      // إذا كان إجمالي المصاريف العادية + مصاريف الخزنة > الخزنة → خسارة
      const totalAllExpenses = totalExpenses + totalTreasuryExpenses;
      let status = 'profit';
      if (totalAllExpenses > updatedTreasury) {
        status = 'loss';
      }

      setTreasury(updatedTreasury);
      setExpenses(totalExpenses);
      setNetProfit(calculatedNetProfit);
      setProfitStatus(status);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // تعيين تاريخ اليوم كقيمة افتراضية
  useEffect(() => {
    if (!treasuryDate && showTreasuryModal) {
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      setTreasuryDate(`${year}-${month}-${day}`);
    }
  }, [showTreasuryModal, treasuryDate]);

  // جلب معاملات الخزنة
  const fetchTreasuryTransactions = async () => {
    if (!shop) return;

    try {
      const q = query(
        collection(db, 'treasury'),
        where('shop', '==', shop)
      );
      const snapshot = await getDocs(q);
      
      let fromDateObj = null;
      let toDateObj = null;

      if (fromDate) {
        fromDateObj = new Date(fromDate);
        fromDateObj.setHours(0, 0, 0, 0);
      }

      if (toDate) {
        toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999);
      }

      const transactions = [];
      let totalWithdrawals = 0;
      let totalDeposits = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // فلترة يدوية حسب التاريخ
        if (fromDateObj || toDateObj) {
          let transactionDate;
          if (data.date?.toDate) {
            transactionDate = data.date.toDate();
          } else if (data.date instanceof Date) {
            transactionDate = data.date;
          } else if (data.createdAt?.toDate) {
            transactionDate = data.createdAt.toDate();
          } else if (data.createdAt instanceof Date) {
            transactionDate = data.createdAt;
          } else {
                return;
            }

          if (fromDateObj && transactionDate < fromDateObj) {
            return;
          }
          if (toDateObj && transactionDate > toDateObj) {
            return;
          }
        }

        transactions.push({
          id: doc.id,
          ...data
        });

        if (data.type === 'withdrawal') {
          totalWithdrawals += data.amount || 0;
        } else if (data.type === 'deposit') {
          totalDeposits += data.amount || 0;
        }
      });

      // ترتيب حسب التاريخ (الأحدث أولاً)
      transactions.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate().getTime() : (a.date?.getTime ? a.date.getTime() : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0));
        const dateB = b.date?.toDate ? b.date.toDate().getTime() : (b.date?.getTime ? b.date.getTime() : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0));
        return dateB - dateA;
      });

      setTreasuryTransactions(transactions);
      setTreasuryExpenses(totalWithdrawals);
    } catch (error) {
      console.error('Error fetching treasury transactions:', error);
    }
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

  // دالة عرض الإشعار
  const showNotification = (message, type = 'success') => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = null;
    }
    setNotification({ show: true, message, type });
  };

  // دالة إخفاء الإشعار
  const hideNotification = () => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = null;
    }
    setNotification({ show: false, message: '', type: 'success' });
  };

  // دالة عرض تأكيد الحذف
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
    setTransactionToDelete(null);
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setConfirmMessage('');
    setConfirmCallback(null);
    setTransactionToDelete(null);
  };

  // جلب البيانات عند تحميل الصفحة أو تغيير التواريخ
  useEffect(() => {
    if (shop) {
      fetchReports();
      fetchTreasuryTransactions();
    }
  }, [shop, fromDate, toDate]);

  // معالجة تغيير التواريخ
  const handleDateChange = () => {
    fetchReports();
    fetchTreasuryTransactions();
  };

  // فتح modal معاملات الخزنة
  const handleOpenTreasuryModal = (type) => {
    setTreasuryModalType(type);
    setTreasuryAmount('');
    setTreasuryDescription('');
    setShowWarning(false);
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    setTreasuryDate(`${year}-${month}-${day}`);
    setShowTreasuryModal(true);
  };

  // إغلاق modal معاملات الخزنة
  const handleCloseTreasuryModal = () => {
    setShowTreasuryModal(false);
    setTreasuryAmount('');
    setTreasuryDescription('');
    setTreasuryDate('');
    setShowWarning(false);
  };

  // إضافة مبلغ للخزنة
  const handleAddDeposit = async (e) => {
    e.preventDefault();
    
    if (!shop) {
      showNotification('يجب تسجيل الدخول أولاً', 'error');
      return;
    }

    if (!treasuryAmount || !treasuryDate) {
      showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    setIsSavingTreasury(true);

    try {
      const transactionData = {
        shop: shop,
        type: 'deposit',
        amount: parseFloat(treasuryAmount),
        description: treasuryDescription.trim() || 'إضافة مبلغ للخزنة',
        date: Timestamp.fromDate(new Date(treasuryDate)),
        createdAt: new Date()
      };

      await addDoc(collection(db, 'treasury'), transactionData);
      showNotification('✅ تم إضافة المبلغ بنجاح', 'success');
      handleCloseTreasuryModal();
      fetchTreasuryTransactions();
      fetchReports();
        } catch (error) {
      console.error('Error adding deposit:', error);
      showNotification('❌ حدث خطأ أثناء إضافة المبلغ', 'error');
    } finally {
      setIsSavingTreasury(false);
    }
  };

  // صرف من الخزنة
  const handleWithdraw = async (e) => {
    e.preventDefault();
    
    if (!shop) {
      showNotification('يجب تسجيل الدخول أولاً', 'error');
      return;
    }

    if (!treasuryAmount || !treasuryDate) {
      showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    const amount = parseFloat(treasuryAmount);
    
    // التحقق من التحذير
    if (amount > netProfit && !showWarning) {
      setShowWarning(true);
      return;
    }

    setIsSavingTreasury(true);

    try {
      const transactionData = {
        shop: shop,
        type: 'withdrawal',
        amount: amount,
        description: treasuryDescription.trim() || 'صرف من الخزنة',
        date: Timestamp.fromDate(new Date(treasuryDate)),
        createdAt: new Date()
      };

      await addDoc(collection(db, 'treasury'), transactionData);
      showNotification('✅ تم الصرف بنجاح', 'success');
      handleCloseTreasuryModal();
      fetchTreasuryTransactions();
      fetchReports();
    } catch (error) {
      console.error('Error adding withdrawal:', error);
      showNotification('❌ حدث خطأ أثناء الصرف', 'error');
    } finally {
      setIsSavingTreasury(false);
    }
  };

  // حذف معاملة
  const handleDeleteTransaction = (transactionId) => {
    const transaction = treasuryTransactions.find(t => t.id === transactionId);
    const message = `هل أنت متأكد من حذف هذه المعاملة؟\n${transaction ? `المبلغ: ${formatNumber(transaction.amount || 0)} ج.م` : ''}`;
    
    showConfirm(message, async () => {
      try {
        await deleteDoc(doc(db, 'treasury', transactionId));
        showNotification('✅ تم حذف المعاملة بنجاح', 'success');
        fetchTreasuryTransactions();
        fetchReports();
      } catch (error) {
        console.error('Error deleting transaction:', error);
        showNotification('❌ حدث خطأ أثناء حذف المعاملة', 'error');
      }
    });
  };

  // تنسيق التاريخ للعرض
  const formatDate = (date) => {
    if (!date) return 'غير محدد';
    try {
      let dateObj;
      if (date.toDate) {
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        return 'غير محدد';
      }
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'غير محدد';
    }
  };

    return (
    <div className={styles.container}>
      <Topbar />
            <div className={styles.content}>
        <Sidebar />
        <main className={styles.main}>
          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.pageTitle}>التقارير</h1>
          </div>

          {/* Date Filter Section */}
          <div className={styles.dateFilterSection}>
            <div className={styles.dateInputGroup}>
              <label className={styles.dateLabel}>
                <HiOutlineCalendar className={styles.dateIcon} />
                من تاريخ:
              </label>
              <input
                type="date"
                className={styles.dateInput}
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                }}
                onBlur={handleDateChange}
              />
            </div>
            <div className={styles.dateInputGroup}>
              <label className={styles.dateLabel}>
                <HiOutlineCalendar className={styles.dateIcon} />
                إلى تاريخ:
              </label>
              <input
                type="date"
                className={styles.dateInput}
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                }}
                onBlur={handleDateChange}
              />
            </div>
            {(fromDate || toDate) && (
              <button className={styles.clearDateBtn} onClick={() => {
                setFromDate('');
                setToDate('');
              }}>
                مسح الفلترة
              </button>
            )}
          </div>

          {/* Stats Cards */}
          {isLoading ? (
            <div className={styles.loading}>
              <p>جاري التحميل...</p>
            </div>
          ) : (
            <div className={styles.statsGrid}>
              {/* الخزنة */}
              <div className={`${styles.statCard} ${styles.primaryCard}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconContainer}>
                    <HiCurrencyDollar className={styles.cardIcon} />
                  </div>
                  <button className={styles.cardArrowBtn}>
                    <HiOutlineChartBar className={styles.arrowIcon} />
                  </button>
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>الخزنة</h3>
                  <p className={styles.cardValue}>{formatNumber(treasury)} ج.م</p>
                  <div className={styles.cardTrend}>
                    <span className={styles.trendLabel}>إجمالي</span>
                  </div>
                </div>
              </div>

              {/* المصاريف */}
              <div className={styles.statCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconContainer}>
                    <HiOutlineMinusCircle className={styles.cardIcon} />
                  </div>
                  <button className={styles.cardArrowBtn}>
                    <HiOutlineChartBar className={styles.arrowIcon} />
                  </button>
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>المصاريف</h3>
                  <p className={styles.cardValue}>{formatNumber(expenses)} ج.م</p>
                  <div className={styles.cardTrend}>
                    <span className={styles.trendLabel}>إجمالي</span>
                        </div>
                        </div>
                    </div>

              {/* صافي الربح */}
              <div className={styles.statCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconContainer}>
                    <HiOutlineTrendingUp className={styles.cardIcon} />
                  </div>
                  <button className={styles.cardArrowBtn}>
                    <HiOutlineChartBar className={styles.arrowIcon} />
                  </button>
                        </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>صافي الربح</h3>
                  <p className={`${styles.cardValue} ${netProfit < 0 ? styles.negativeValue : styles.positiveValue}`}>
                    {formatNumber(netProfit)} ج.م
                  </p>
                  <div className={styles.cardTrend}>
                    <span className={styles.trendLabel}>إجمالي</span>
                        </div>
                    </div>
                </div>

              {/* حالة الربح/الخسارة */}
              <div className={`${styles.statCard} ${profitStatus === 'profit' ? styles.profitCard : styles.lossCard}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconContainer}>
                    {profitStatus === 'profit' ? (
                      <HiOutlineCheckCircle className={styles.cardIcon} />
                    ) : (
                      <HiOutlineXCircle className={styles.cardIcon} />
                    )}
                  </div>
                  <button className={styles.cardArrowBtn}>
                    <HiOutlineChartBar className={styles.arrowIcon} />
                  </button>
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>الحالة</h3>
                  <p className={styles.cardValue}>
                    {profitStatus === 'profit' ? 'ربح' : 'خسارة'}
                  </p>
                  <div className={styles.cardTrend}>
                    <span className={styles.trendLabel}>
                      {profitStatus === 'profit'
                        ? 'الأرباح أكبر من المصاريف'
                        : 'المصاريف أكبر من الأرباح'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Treasury Expenses Card */}
          {!isLoading && (
            <div className={styles.statCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIconContainer}>
                  <HiOutlineMinusCircle className={styles.cardIcon} />
                </div>
                <button className={styles.cardArrowBtn}>
                  <HiOutlineChartBar className={styles.arrowIcon} />
                </button>
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>مصاريف الخزنة</h3>
                <p className={styles.cardValue}>{formatNumber(treasuryExpenses)} ج.م</p>
                <div className={styles.cardTrend}>
                  <span className={styles.trendLabel}>إجمالي الصرف من الخزنة</span>
                </div>
              </div>
            </div>
          )}

          {/* Treasury Transactions Section */}
          <div className={styles.treasurySection}>
            <div className={styles.treasuryHeader}>
              <h2 className={styles.treasuryTitle}>معاملات الخزنة</h2>
              <div className={styles.treasuryActions}>
                <button 
                  className={`${styles.treasuryBtn} ${styles.depositBtn}`}
                  onClick={() => handleOpenTreasuryModal('deposit')}
                >
                  <HiOutlinePlus className={styles.btnIcon} />
                  إضافة مبلغ
                </button>
                <button 
                  className={`${styles.treasuryBtn} ${styles.withdrawBtn}`}
                  onClick={() => handleOpenTreasuryModal('withdrawal')}
                >
                  <HiOutlineMinusCircle className={styles.btnIcon} />
                  صرف من الخزنة
                </button>
              </div>
                </div>

            {/* Treasury Transactions Table */}
                <div className={styles.tableContainer}>
              <table className={styles.shiftsTable}>
                        <thead>
                            <tr>
                    <th>النوع</th>
                    <th>المبلغ</th>
                    <th>الوصف</th>
                    <th>التاريخ</th>
                    <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                  {treasuryTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className={styles.emptyRow}>
                        لا توجد معاملات
                      </td>
                    </tr>
                  ) : (
                    treasuryTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>
                          <span className={`${styles.typeBadge} ${transaction.type === 'deposit' ? styles.depositBadge : styles.withdrawBadge}`}>
                            {transaction.type === 'deposit' ? 'إضافة' : 'صرف'}
                          </span>
                        </td>
                        <td className={styles.priceCell}>
                          {formatNumber(transaction.amount || 0)} ج.م
                        </td>
                        <td>{transaction.description || '-'}</td>
                        <td>{formatDate(transaction.date || transaction.createdAt)}</td>
                                        <td>
                                            <button 
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            title="حذف"
                                            >
                            <HiOutlineTrash className={styles.deleteIcon} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
          </div>

          {/* Treasury Modal */}
          {showTreasuryModal && (
            <div className={styles.modalOverlay} onClick={handleCloseTreasuryModal}>
              <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>
                    {treasuryModalType === 'deposit' ? 'إضافة مبلغ للخزنة' : 'صرف من الخزنة'}
                  </h3>
                  <button className={styles.modalCloseBtn} onClick={handleCloseTreasuryModal}>
                    ×
                  </button>
                </div>

                {showWarning && treasuryModalType === 'withdrawal' && (
                  <div className={styles.warningBox}>
                    <p>⚠️ تحذير: هذا المصروف ({formatNumber(parseFloat(treasuryAmount) || 0)} ج.م) أكبر من صافي الربح ({formatNumber(netProfit)} ج.م).</p>
                    <p>سيتم الصرف من رأس المال.</p>
                  </div>
                )}

                <form 
                  onSubmit={treasuryModalType === 'deposit' ? handleAddDeposit : handleWithdraw}
                  className={styles.modalForm}
                >
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      المبلغ (ج.م) <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={styles.formInput}
                      value={treasuryAmount}
                      onChange={(e) => {
                        setTreasuryAmount(e.target.value);
                        if (treasuryModalType === 'withdrawal') {
                          const amount = parseFloat(e.target.value) || 0;
                          if (amount > netProfit) {
                            setShowWarning(true);
                          } else {
                            setShowWarning(false);
                          }
                        }
                      }}
                      required
                      placeholder="0.00"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>الوصف</label>
                    <textarea
                      className={styles.formTextarea}
                      value={treasuryDescription}
                      onChange={(e) => setTreasuryDescription(e.target.value)}
                      placeholder="أدخل وصف المعاملة (اختياري)"
                      rows="3"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      التاريخ <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="date"
                      className={styles.formInput}
                      value={treasuryDate}
                      onChange={(e) => setTreasuryDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.modalActions}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={handleCloseTreasuryModal}
                      disabled={isSavingTreasury}
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className={`${styles.submitBtn} ${treasuryModalType === 'deposit' ? styles.depositSubmitBtn : styles.withdrawSubmitBtn}`}
                      disabled={isSavingTreasury}
                    >
                      {isSavingTreasury ? 'جاري الحفظ...' : (treasuryModalType === 'deposit' ? 'إضافة' : 'صرف')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

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
                  <h3 className={styles.confirmModalTitle}>تأكيد الحذف</h3>
                </div>
                <div className={styles.confirmModalBody}>
                  <p className={styles.confirmModalMessage}>{confirmMessage}</p>
                </div>
                <div className={styles.confirmModalActions}>
                  <button
                    className={styles.confirmCancelBtn}
                    onClick={handleCancelConfirm}
                  >
                    إلغاء
                  </button>
                  <button
                    className={styles.confirmDeleteBtn}
                    onClick={handleConfirm}
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
            </div>
        </div>
    );
}

