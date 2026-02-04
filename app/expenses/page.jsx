'use client';
import { useState, useEffect, useRef } from 'react';
import { db } from '@/app/firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2';
import { HiOutlineSearch } from 'react-icons/hi';
import styles from './styles.module.css';
import Topbar from '@/components/Dashboard/Topbar';
import Sidebar from '@/components/Dashboard/Sidebar';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const notificationTimerRef = useRef(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmCallback, setConfirmCallback] = useState(null);

  const shop = typeof window !== 'undefined' ? localStorage.getItem('shop') : '';

  // تعيين تاريخ اليوم كقيمة افتراضية
  useEffect(() => {
    if (!expenseDate && !editingExpense) {
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      setExpenseDate(`${year}-${month}-${day}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // جلب المصاريف من Firebase
  const fetchExpenses = async () => {
    if (!shop) {
      setIsLoading(false);
      return;
    }

    try {
      const q = query(collection(db, 'expenses'), where('shop', '==', shop));
      const snapshot = await getDocs(q);
      const expensesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // ترتيب حسب التاريخ (الأحدث أولاً)
      expensesList.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate().getTime() : (a.date?.getTime ? a.date.getTime() : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0));
        const dateB = b.date?.toDate ? b.date.toDate().getTime() : (b.date?.getTime ? b.date.getTime() : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0));
        return dateB - dateA; // ترتيب تنازلي
      });

      setExpenses(expensesList);
      setFilteredExpenses(expensesList);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showNotification('❌ حدث خطأ أثناء جلب المصاريف', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (shop) {
      fetchExpenses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  // البحث في المصاريف
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredExpenses(expenses);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = expenses.filter(expense => {
      const descriptionMatch = expense.description?.toLowerCase().includes(query);
      const amountMatch = expense.amount?.toString().includes(searchQuery);
      return descriptionMatch || amountMatch;
    });
    setFilteredExpenses(filtered);
  }, [searchQuery, expenses]);

  // إخفاء الإشعار تلقائياً
  useEffect(() => {
    if (notification.show) {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }

      notificationTimerRef.current = setTimeout(() => {
        setNotification({ show: false, message: '', type: 'success' });
        notificationTimerRef.current = null;
      }, 1500);

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

  // تنسيق التاريخ
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

  // تنسيق الأرقام
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // إعادة تعيين النموذج
  const resetForm = () => {
    setEditingExpense(null);
    setExpenseAmount('');
    setExpenseDescription('');
    setExpenseDate('');
  };

  // إضافة مصروف جديد
  const handleAddExpense = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    if (!shop) {
      showNotification('يجب تسجيل الدخول أولاً', 'error');
      setIsSaving(false);
      return;
    }

    if (!expenseAmount || !expenseDescription || !expenseDate) {
      showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
      setIsSaving(false);
      return;
    }

    try {
      const expenseData = {
        shop,
        amount: parseFloat(expenseAmount),
        description: expenseDescription.trim(),
        date: Timestamp.fromDate(new Date(expenseDate)),
        createdAt: new Date()
      };

      await addDoc(collection(db, 'expenses'), expenseData);
      showNotification('✅ تم إضافة المصروف بنجاح', 'success');
      resetForm();
      fetchExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      showNotification('❌ حدث خطأ أثناء إضافة المصروف', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // تعديل مصروف
  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    
    // تحويل التاريخ إلى format مناسب لـ input type="date"
    let dateValue = '';
    if (expense.date) {
      try {
        let dateObj;
        if (expense.date.toDate) {
          dateObj = expense.date.toDate();
        } else if (expense.date instanceof Date) {
          dateObj = expense.date;
        } else {
          dateObj = new Date(expense.date);
        }
        const year = dateObj.getFullYear();
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const day = dateObj.getDate().toString().padStart(2, '0');
        dateValue = `${year}-${month}-${day}`;
      } catch (error) {
        console.error('Error parsing date:', error);
      }
    }

    setExpenseAmount(expense.amount?.toString() || '');
    setExpenseDescription(expense.description || '');
    setExpenseDate(dateValue);

    // التمرير إلى أعلى النموذج
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // تحديث مصروف
  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    if (!expenseAmount || !expenseDescription || !expenseDate) {
      showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
      setIsSaving(false);
      return;
    }

    try {
      const expenseData = {
        amount: parseFloat(expenseAmount),
        description: expenseDescription.trim(),
        date: Timestamp.fromDate(new Date(expenseDate))
      };

      await updateDoc(doc(db, 'expenses', editingExpense.id), expenseData);
      showNotification('✅ تم تحديث المصروف بنجاح', 'success');
      resetForm();
      fetchExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
      showNotification('❌ حدث خطأ أثناء تحديث المصروف', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // حذف مصروف
  const handleDeleteExpense = (expense) => {
    showConfirm(
      `هل أنت متأكد من حذف المصروف "${expense.description}" بقيمة ${formatNumber(expense.amount)} ج.م؟`,
      async () => {
        try {
          await deleteDoc(doc(db, 'expenses', expense.id));
          showNotification('✅ تم حذف المصروف بنجاح', 'success');
          fetchExpenses();
        } catch (error) {
          console.error('Error deleting expense:', error);
          showNotification('❌ حدث خطأ أثناء حذف المصروف', 'error');
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Topbar />
        <div className={styles.content}>
          <Sidebar />
          <main className={styles.main}>
            <div className={styles.loading}>
              <p>جاري التحميل...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Topbar />
      <div className={styles.content}>
        <Sidebar />
        <main className={styles.main}>
          <div className={styles.header}>
            <h1 className={styles.pageTitle}>المصاريف</h1>
          </div>

          <div className={styles.twoColumns}>
            {/* العمود الأيسر: نموذج الإضافة/التعديل */}
            <div className={styles.leftColumn}>
              <div className={styles.formCard}>
                <h2 className={styles.formTitle}>
                  {editingExpense ? 'تعديل مصروف' : 'إضافة مصروف جديد'}
                </h2>

                <form onSubmit={editingExpense ? handleUpdateExpense : handleAddExpense} className={styles.form}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>المبلغ (ج.م) *</label>
                    <input
                      type="number"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className={styles.input}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>الوصف *</label>
                    <textarea
                      value={expenseDescription}
                      onChange={(e) => setExpenseDescription(e.target.value)}
                      className={styles.textarea}
                      placeholder="أدخل وصف المصروف"
                      rows="4"
                      required
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>التاريخ *</label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.submitSection}>
                    {editingExpense && (
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={resetForm}
                        disabled={isSaving}
                      >
                        إلغاء التعديل
                      </button>
                    )}
                    <button type="submit" className={styles.submitBtn} disabled={isSaving}>
                      {isSaving ? 'جاري الحفظ...' : editingExpense ? 'تحديث المصروف' : 'إضافة المصروف'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* العمود الأيمن: عرض المصاريف */}
            <div className={styles.rightColumn}>
              <div className={styles.expensesCard}>
                <h2 className={styles.expensesTitle}>المصاريف المسجلة</h2>

                {/* حقل البحث */}
                <div className={styles.searchSection}>
                  <HiOutlineSearch className={styles.searchIcon} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                    placeholder="ابحث بالوصف أو المبلغ..."
                  />
                </div>

                {/* قائمة المصاريف */}
                <div className={styles.expensesList}>
                  {filteredExpenses.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>لا توجد مصاريف</p>
                    </div>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <div key={expense.id} className={styles.expenseCard}>
                        <div className={styles.expenseInfo}>
                          <h3 className={styles.expenseDescription}>{expense.description}</h3>
                          <p className={styles.expenseAmount}>{formatNumber(expense.amount)} ج.م</p>
                          <p className={styles.expenseDate}>{formatDate(expense.date)}</p>
                        </div>
                        <div className={styles.expenseActions}>
                          <button
                            className={styles.editBtn}
                            onClick={() => handleEditExpense(expense)}
                            title="تعديل"
                          >
                            <HiOutlinePencil className={styles.actionIcon} />
                          </button>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteExpense(expense)}
                            title="حذف"
                          >
                            <HiOutlineTrash className={styles.actionIcon} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
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
              <h3 className={styles.confirmModalTitle}>تأكيد الحذف</h3>
            </div>
            <div className={styles.confirmModalBody}>
              <p className={styles.confirmModalMessage}>{confirmMessage}</p>
            </div>
            <div className={styles.confirmModalActions}>
              <button
                className={styles.cancelBtn}
                onClick={handleCancelConfirm}
              >
                إلغاء
              </button>
              <button
                className={styles.confirmBtn}
                onClick={handleConfirm}
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

