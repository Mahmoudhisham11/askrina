'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/app/firebase';
import Topbar from '@/components/Dashboard/Topbar';
import Sidebar from '@/components/Dashboard/Sidebar';
import { HiOutlineEye, HiOutlineCurrencyDollar, HiOutlineTrash, HiXMark, HiOutlinePlus, HiOutlineDocumentPlus } from 'react-icons/hi2';
import { HiOutlineDocumentText } from 'react-icons/hi';
import styles from '../add-product/styles.module.css';

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentReportsModal, setShowPaymentReportsModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [currentInvoiceForPayment, setCurrentInvoiceForPayment] = useState(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const notificationTimerRef = useRef(null);

  const shop = typeof window !== 'undefined' ? localStorage.getItem('shop') : '';

  // حساب المتبقي لكل فاتورة
  const calculateRemainingDebt = (invoiceId) => {
    const invoicePayments = payments.filter(p => p.invoiceId === invoiceId);
    const totalPaid = invoicePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return 0;
    const remaining = (invoice.totalDebt || 0) - totalPaid;
    return Math.max(0, remaining);
  };

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const totalDebt = invoices.reduce((sum, inv) => sum + (inv.totalDebt || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalRemainingDebt = totalDebt - totalPaid;
    
    const uniqueCustomers = new Set(invoices.map(inv => inv.customerName).filter(Boolean));
    const customerCount = uniqueCustomers.size;

    return {
      totalRemainingDebt,
      customerCount
    };
  }, [invoices, payments]);

  // تصفية الفواتير حسب البحث
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) {
      return invoices;
    }
    return invoices.filter(invoice =>
      invoice.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [invoices, searchQuery]);

  // جلب الفواتير
  const fetchInvoices = async () => {
    if (!shop) return;

    try {
      const q = query(
        collection(db, 'invoices'),
        where('shop', '==', shop)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // ترتيب حسب التاريخ يدوياً (تنازلي)
      list.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });

      setInvoices(list);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      showNotification('❌ حدث خطأ أثناء جلب الفواتير', 'error');
    }
  };

  // جلب السداد
  const fetchPayments = async () => {
    if (!shop) return;

    try {
      const q = query(
        collection(db, 'payments'),
        where('shop', '==', shop)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // ترتيب حسب التاريخ يدوياً (تنازلي)
      list.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });

      setPayments(list);
    } catch (error) {
      console.error('Error fetching payments:', error);
      showNotification('❌ حدث خطأ أثناء جلب السداد', 'error');
    }
  };

  // جلب البيانات عند التحميل
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchInvoices(), fetchPayments()]);
      setIsLoading(false);
    };

    if (shop) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [shop]);

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

  // فتح مودال عرض المنتجات
  const handleViewProducts = (invoice) => {
    setSelectedInvoice(invoice);
    setShowProductsModal(true);
  };

  // فتح مودال السداد
  const handleOpenPaymentModal = (invoice) => {
    setCurrentInvoiceForPayment(invoice);
    setPaymentAmount('');
    setShowPaymentModal(true);
  };

  // حفظ السداد
  const handleSavePayment = async (e) => {
    e.preventDefault();

    if (!shop || !currentInvoiceForPayment) {
      showNotification('يجب تسجيل الدخول أولاً', 'error');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      showNotification('يرجى إدخال مبلغ صحيح', 'error');
      return;
    }

    const remaining = calculateRemainingDebt(currentInvoiceForPayment.id);
    if (amount > remaining) {
      showNotification(`❌ المبلغ أكبر من المتبقي (المتبقي: ${remaining.toFixed(2)} جنيه)`, 'error');
      return;
    }

    setIsSavingPayment(true);

    try {
      const paymentData = {
        invoiceId: currentInvoiceForPayment.id,
        amount: amount,
        date: Timestamp.fromDate(new Date()),
        shop: shop,
        createdAt: Timestamp.fromDate(new Date())
      };

      await addDoc(collection(db, 'payments'), paymentData);
      showNotification('✅ تم إضافة السداد بنجاح', 'success');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setCurrentInvoiceForPayment(null);
      await fetchPayments();
      await fetchInvoices();
    } catch (error) {
      console.error('Error saving payment:', error);
      showNotification('❌ حدث خطأ أثناء إضافة السداد', 'error');
    } finally {
      setIsSavingPayment(false);
    }
  };

  // فتح تقارير السداد
  const handleOpenPaymentReports = () => {
    setShowPaymentReportsModal(true);
  };

  // حذف عملية سداد
  const handleDeletePayment = (payment) => {
    setPaymentToDelete(payment);
    setShowDeleteConfirmModal(true);
  };

  // تأكيد حذف السداد
  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;

    try {
      await deleteDoc(doc(db, 'payments', paymentToDelete.id));
      showNotification('✅ تم حذف عملية السداد بنجاح', 'success');
      setShowDeleteConfirmModal(false);
      setPaymentToDelete(null);
      await fetchPayments();
      await fetchInvoices();
    } catch (error) {
      console.error('Error deleting payment:', error);
      showNotification('❌ حدث خطأ أثناء حذف عملية السداد', 'error');
    }
  };

  // الحصول على اسم العميل من الفاتورة
  const getCustomerNameFromInvoice = (invoiceId) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    return invoice?.customerName || 'غير معروف';
  };

  // الانتقال إلى صفحة إضافة فاتورة مع بيانات العميل
  const handleAddInvoiceForCustomer = (customerName, customerPhone) => {
    const params = new URLSearchParams();
    params.set('mode', 'invoice');
    if (customerName) {
      params.set('customerName', customerName);
    }
    if (customerPhone) {
      params.set('customerPhone', customerPhone);
    }
    router.push(`/add-product?${params.toString()}`);
  };

  // تنسيق الأرقام بالإنجليزية
  const formatNumber = (num) => {
    return (num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // تنسيق التاريخ
  const formatDate = (date) => {
    if (!date) return 'غير متوفر';
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleString('ar-EG');
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <p>جاري تحميل الفواتير...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Topbar />
      <div className={styles.content}>
        <Sidebar activeNav="الفواتير" />
        <main className={styles.main}>
          <div className={styles.header}>
            <h1 className={styles.pageTitle}>الفواتير</h1>
            <div style={{ display: 'flex', gap: '12px', marginRight: 'auto' }}>
              <button
                onClick={() => handleAddInvoiceForCustomer('', '')}
                className={styles.submitBtn}
              >
                <HiOutlinePlus style={{ marginLeft: '8px' }} />
                إضافة فاتورة
              </button>
              <button
                onClick={handleOpenPaymentReports}
                className={styles.submitBtn}
              >
                <HiOutlineDocumentText style={{ marginLeft: '8px' }} />
                تقارير السداد
              </button>
            </div>
          </div>

          {/* كروت الإحصائيات */}
          <div className={styles.statsCards || styles.productsGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div className={styles.statCard || styles.productCard} style={{ background: 'var(--card)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                  💰
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>إجمالي الديون</h3>
                  <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
                    {formatNumber(stats.totalRemainingDebt)} جنيه
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.statCard || styles.productCard} style={{ background: 'var(--card)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                  👥
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>عدد العملاء</h3>
                  <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
                    {stats.customerCount} عميل
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* حقل البحث */}
          <div className={styles.formCard} style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput || styles.input}
                placeholder="ابحث باسم العميل..."
                style={{ flex: 1 }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={styles.cancelBtn}
                  style={{ padding: '8px 16px' }}
                >
                  مسح البحث
                </button>
              )}
            </div>
          </div>

          {/* جدول الفواتير */}
          <div className={styles.tableContainer}>
            <h2 className={styles.productsTitle} style={{ marginBottom: '24px', padding: '0' }}>قائمة الفواتير</h2>
            
            {filteredInvoices.length === 0 ? (
              <div className={styles.emptyState}>
                <p>{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد فواتير مسجلة'}</p>
              </div>
            ) : (
              <table className={styles.productsTable}>
                <thead>
                  <tr>
                    <th>اسم العميل</th>
                    <th>رقم الموبايل</th>
                    <th>إجمالي الفاتورة</th>
                    <th>المتبقي</th>
                    <th>التاريخ</th>
                    <th style={{ textAlign: 'center' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => {
                    const remaining = calculateRemainingDebt(invoice.id);
                    return (
                      <tr key={invoice.id}>
                        <td className={styles.productNameCell}>{invoice.customerName || 'غير معروف'}</td>
                        <td>{invoice.customerPhone || 'غير متوفر'}</td>
                        <td className={styles.priceCell}>{formatNumber(invoice.totalDebt)} جنيه</td>
                        <td style={{ 
                          color: remaining === 0 ? '#22C55E' : '#EF4444',
                          fontWeight: 'bold'
                        }}>
                          {formatNumber(remaining)} جنيه
                        </td>
                        <td>{formatDate(invoice.date)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              onClick={() => handleViewProducts(invoice)}
                              className={styles.editBtn}
                              title="عرض المنتجات"
                            >
                              <HiOutlineEye className={styles.actionIcon} />
                            </button>
                            <button
                              onClick={() => handleOpenPaymentModal(invoice)}
                              className={styles.submitBtn}
                              style={{ 
                                padding: '10px',
                                minWidth: '40px',
                                height: '40px',
                                fontSize: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="سداد"
                              disabled={remaining === 0}
                            >
                              <HiOutlineCurrencyDollar />
                            </button>
                            <button
                              onClick={() => handleAddInvoiceForCustomer(invoice.customerName, invoice.customerPhone)}
                              className={styles.editBtn}
                              style={{ backgroundColor: '#22C55E' }}
                              title="إضافة فاتورة جديدة لنفس العميل"
                            >
                              <HiOutlineDocumentPlus className={styles.actionIcon} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* مودال عرض المنتجات */}
      {showProductsModal && selectedInvoice && (
        <div className={styles.modalOverlay} onClick={() => setShowProductsModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 className={styles.modalTitle}>منتجات الفاتورة</h3>
              <button
                onClick={() => setShowProductsModal(false)}
                className={styles.cancelBtn}
                style={{ padding: '8px', minWidth: 'auto' }}
              >
                <HiXMark />
              </button>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <p className={styles.productCode}><strong>العميل:</strong> {selectedInvoice.customerName}</p>
              <p className={styles.productCode}><strong>رقم الموبايل:</strong> {selectedInvoice.customerPhone || 'غير متوفر'}</p>
            </div>

            <div className={styles.productsGrid}>
              {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                selectedInvoice.items.map((item, index) => (
                  <div key={index} className={styles.productCard}>
                    <div className={styles.productInfo}>
                      <h3 className={styles.productName}>{item.name}</h3>
                      <p className={styles.productCode}>النوع: {item.type === 'phone' ? 'موبايل' : 'أكسسوار'}</p>
                      <p className={styles.productCode}>الكمية: {item.quantity}</p>
                      <p className={styles.productCode}>سعر البيع: {formatNumber(item.sellPrice)} جنيه</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <p>لا توجد منتجات مسجلة لهذه الفاتورة</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* مودال السداد */}
      {showPaymentModal && currentInvoiceForPayment && (
        <div className={styles.modalOverlay} onClick={() => setShowPaymentModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 className={styles.modalTitle}>إضافة سداد</h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setCurrentInvoiceForPayment(null);
                  setPaymentAmount('');
                }}
                className={styles.cancelBtn}
                style={{ padding: '8px', minWidth: 'auto' }}
              >
                <HiXMark />
              </button>
            </div>

            <form onSubmit={handleSavePayment}>
              <div className={styles.fieldsGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>اسم العميل</label>
                  <input
                    type="text"
                    value={currentInvoiceForPayment.customerName || ''}
                    className={styles.input}
                    disabled
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>إجمالي الفاتورة</label>
                  <input
                    type="text"
                    value={`${formatNumber(currentInvoiceForPayment.totalDebt)} جنيه`}
                    className={styles.input}
                    disabled
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>المتبقي الحالي</label>
                  <input
                    type="text"
                    value={`${formatNumber(calculateRemainingDebt(currentInvoiceForPayment.id))} جنيه`}
                    className={styles.input}
                    disabled
                    style={{ color: calculateRemainingDebt(currentInvoiceForPayment.id) === 0 ? '#22C55E' : '#EF4444', fontWeight: 'bold' }}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>مبلغ السداد *</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className={styles.input}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    max={calculateRemainingDebt(currentInvoiceForPayment.id)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className={styles.submitSection}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => {
                    setShowPaymentModal(false);
                    setCurrentInvoiceForPayment(null);
                    setPaymentAmount('');
                  }}
                  disabled={isSavingPayment}
                >
                  إلغاء
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isSavingPayment}>
                  {isSavingPayment ? 'جاري الحفظ...' : 'تأكيد السداد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال تقارير السداد */}
      {showPaymentReportsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPaymentReportsModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 className={styles.modalTitle}>تقارير السداد</h3>
              <button
                onClick={() => setShowPaymentReportsModal(false)}
                className={styles.cancelBtn}
                style={{ padding: '8px', minWidth: 'auto' }}
              >
                <HiXMark />
              </button>
            </div>

            {payments.length === 0 ? (
              <div className={styles.emptyState}>
                <p>لا توجد عمليات سداد مسجلة</p>
              </div>
            ) : (
              <div className={styles.tableContainer} style={{ padding: '0', background: 'transparent', border: 'none', boxShadow: 'none' }}>
                <table className={styles.productsTable}>
                  <thead>
                    <tr>
                      <th>اسم العميل</th>
                      <th>مبلغ السداد</th>
                      <th>تاريخ السداد</th>
                      <th style={{ textAlign: 'center' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className={styles.productNameCell}>
                          {getCustomerNameFromInvoice(payment.invoiceId)}
                        </td>
                        <td className={styles.priceCell} style={{ color: '#22C55E', fontWeight: 'bold' }}>
                          {formatNumber(payment.amount)} جنيه
                        </td>
                        <td>{formatDate(payment.date)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeletePayment(payment)}
                            className={styles.deleteBtn}
                            style={{ padding: '8px', minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="حذف"
                          >
                            <HiOutlineTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* مودال تأكيد الحذف */}
      {showDeleteConfirmModal && paymentToDelete && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirmModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>تأكيد الحذف</h3>
            <p className={styles.modalMessage}>
              هل أنت متأكد من حذف عملية السداد هذه؟
            </p>
            <div style={{ marginBottom: '16px', padding: '16px', background: 'var(--background)', borderRadius: 'var(--radius-md)' }}>
              <p className={styles.productCode}><strong>اسم العميل:</strong> {getCustomerNameFromInvoice(paymentToDelete.invoiceId)}</p>
              <p className={styles.productCode}><strong>مبلغ السداد:</strong> {formatNumber(paymentToDelete.amount)} جنيه</p>
              <p className={styles.productCode}><strong>تاريخ السداد:</strong> {formatDate(paymentToDelete.date)}</p>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setPaymentToDelete(null);
                }}
              >
                إلغاء
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={confirmDeletePayment}
              >
                حذف
              </button>
            </div>
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
    </div>
  );
}
