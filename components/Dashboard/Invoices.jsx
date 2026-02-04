'use client';
import { useState, useEffect, useRef } from 'react';
import { db } from '@/app/firebase';
import { collection, getDocs, query, where, updateDoc, doc, getDoc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { HiOutlineSearch, HiOutlineEye } from 'react-icons/hi';
import { HiOutlineReceiptPercent, HiOutlineArrowUturnLeft } from 'react-icons/hi2';
import styles from './Invoices.module.css';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [returnItem, setReturnItem] = useState(null);
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const notificationTimerRef = useRef(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmCallback, setConfirmCallback] = useState(null);

  const shop = typeof window !== 'undefined' ? localStorage.getItem('shop') : '';

  // جلب الفواتير من Firebase
  const fetchInvoices = async () => {
    if (!shop) {
      console.log('No shop found in localStorage');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching invoices for shop:', shop);
      const q = query(
        collection(db, 'sales'),
        where('shop', '==', shop)
      );
      const snapshot = await getDocs(q);
      console.log('Total documents found:', snapshot.docs.length);
      
      let invoicesList = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Invoice data:', { id: doc.id, shop: data.shop, invoiceNumber: data.invoiceNumber });
        return {
          id: doc.id,
          ...data
        };
      });

      // ترتيب حسب التاريخ (الأحدث أولاً) - يدوياً لتجنب مشاكل index
      invoicesList.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate().getTime() : (a.date?.getTime ? a.date.getTime() : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0));
        const dateB = b.date?.toDate ? b.date.toDate().getTime() : (b.date?.getTime ? b.date.getTime() : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0));
        return dateB - dateA; // ترتيب تنازلي
      });

      console.log('Processed invoices list:', invoicesList.length);
      setInvoices(invoicesList);
      setFilteredInvoices(invoicesList);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      console.error('Error details:', error.message, error.code);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (shop) {
      fetchInvoices();
    }
  }, [shop]);

  // إعادة جلب الفواتير كل 3 ثوانٍ للتحديث التلقائي
  useEffect(() => {
    if (!shop) return;

    const interval = setInterval(() => {
      fetchInvoices();
    }, 3000);

    return () => clearInterval(interval);
  }, [shop]);

  // البحث برقم الفاتورة
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInvoices(invoices);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = invoices.filter(invoice => {
      const invoiceNumber = invoice.invoiceNumber?.toString() || '';
      return invoiceNumber.includes(searchQuery);
    });
    setFilteredInvoices(filtered);
  }, [searchQuery, invoices]);

  // إخفاء الإشعار تلقائياً بعد 1.5 ثانية
  useEffect(() => {
    if (notification.show) {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
        notificationTimerRef.current = null;
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

  // دوال الإشعارات
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
        // Firebase Timestamp
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        dateObj = new Date(date);
      }

      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();
      const hours = dateObj.getHours().toString().padStart(2, '0');
      const minutes = dateObj.getMinutes().toString().padStart(2, '0');

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      return 'غير محدد';
    }
  };

  // تنسيق الأرقام (بالإنجليزية)
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // فتح modal عرض التفاصيل
  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
  };

  // إغلاق modal
  const handleCloseModal = () => {
    setSelectedInvoice(null);
  };

  // فتح modal المرتجع
  const handleReturnItem = (item) => {
    setReturnItem(item);
    setReturnQuantity(1);
    setShowReturnModal(true);
  };

  // إغلاق modal المرتجع
  const handleCloseReturnModal = () => {
    setShowReturnModal(false);
    setReturnItem(null);
    setReturnQuantity(1);
  };

  // تأكيد المرتجع
  const confirmReturn = () => {
    if (!returnItem || !selectedInvoice) return;

    // التحقق من صحة الكمية
    if (returnQuantity < 1 || returnQuantity > returnItem.quantity) {
      showNotification('❌ الكمية المدخلة غير صحيحة', 'error');
      return;
    }

    // popup تأكيد
    const isFullReturn = returnQuantity === returnItem.quantity;
    const confirmMsg = isFullReturn
      ? `هل أنت متأكد من إرجاع ${returnQuantity} قطعة من "${returnItem.productName}"؟\nسيتم إرجاع المنتج للمخزن وحذفه من الفاتورة.`
      : `هل أنت متأكد من إرجاع ${returnQuantity} قطعة من "${returnItem.productName}"؟\nسيتم إرجاع المنتج للمخزن وتقليل كمية المنتج في الفاتورة.`;
    
    showConfirm(confirmMsg, async () => {
      await processReturn();
    });
  };

  // معالجة المرتجع الفعلية
  const processReturn = async () => {
    if (!returnItem || !selectedInvoice) return;

    setIsProcessingReturn(true);

    try {
      // 1. تحديث كمية المنتج في المخزن
      const productRef = doc(db, 'products', returnItem.productId);
      const productDoc = await getDoc(productRef);
      
      if (productDoc.exists()) {
        const currentQuantity = productDoc.data().quantity || 0;
        const newQuantity = currentQuantity + returnQuantity;
        
        // إذا كانت الكمية الجديدة = 0 أو أقل، حذف المنتج
        if (newQuantity <= 0) {
          await deleteDoc(productRef);
        } else {
          await updateDoc(productRef, {
            quantity: newQuantity
          });
        }
      } else {
        // المنتج غير موجود (تم حذفه): إضافة المنتج بكل بياناته
        const productData = {
          name: returnItem.productName,
          code: returnItem.productCode,
          quantity: returnQuantity,
          buyPrice: returnItem.buyPrice || 0,
          sellPrice: returnItem.sellPrice || returnItem.unitPrice || 0,
          type: returnItem.type || 'accessory',
          shop: shop,
          date: new Date()
        };

        // إضافة البيانات الإضافية للموبايل إن وجدت
        if (returnItem.type === 'phone' || returnItem.battery !== undefined) {
          productData.battery = returnItem.battery || '0';
          productData.storage = returnItem.storage || '0';
          productData.serial = returnItem.serial || '0';
          productData.box = returnItem.box !== undefined ? returnItem.box : true;
          productData.tax = returnItem.tax !== undefined ? returnItem.tax : false;
          productData.type = 'phone';
        }

        await addDoc(collection(db, 'products'), productData);
      }

      // 2. تحديث الفاتورة
      const invoiceRef = doc(db, 'sales', selectedInvoice.id);
      const invoiceDoc = await getDoc(invoiceRef);
      const currentItems = invoiceDoc.data().items || [];
      
      let updatedItems;
      if (returnQuantity === returnItem.quantity) {
        // حذف المنتج من الفاتورة
        updatedItems = currentItems.filter(item => item.productId !== returnItem.productId);
      } else {
        // تقليل الكمية
        updatedItems = currentItems.map(item => {
          if (item.productId === returnItem.productId) {
            return {
              ...item,
              quantity: item.quantity - returnQuantity,
              totalPrice: item.unitPrice * (item.quantity - returnQuantity)
            };
          }
          return item;
        });
      }

      // 3. التحقق من أن الفاتورة أصبحت فارغة
      if (updatedItems.length === 0) {
        // حذف الفاتورة نهائياً
        await deleteDoc(invoiceRef);
        
        // إغلاق modal الفاتورة
        setSelectedInvoice(null);
        
        // إعادة جلب قائمة الفواتير
        await fetchInvoices();
        
        // إغلاق modal المرتجع
        handleCloseReturnModal();
        
        showNotification(`✅ تم إرجاع ${returnQuantity} قطعة وحذف الفاتورة (لأنها أصبحت فارغة)`, 'success');
      } else {
        // إعادة حساب subtotal و total
        const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        const discount = invoiceDoc.data().discount || 0;
        const newTotal = Math.max(0, newSubtotal - discount);

        await updateDoc(invoiceRef, {
          items: updatedItems,
          subtotal: newSubtotal,
          total: newTotal
        });

        // إعادة جلب الفاتورة المحدثة
        const updatedInvoiceDoc = await getDoc(invoiceRef);
        if (updatedInvoiceDoc.exists()) {
          setSelectedInvoice({
            id: updatedInvoiceDoc.id,
            ...updatedInvoiceDoc.data()
          });
        }

        // إعادة جلب قائمة الفواتير
        await fetchInvoices();

        // إغلاق modal المرتجع
        handleCloseReturnModal();
        
        showNotification(`✅ تم إرجاع ${returnQuantity} قطعة بنجاح`, 'success');
      }

      // 4. إضافة المصروفات في expenses
      // حساب سعر البيع النهائي بعد الخصم
      const finalSellPrice = (returnItem.unitPrice || 0) - (returnItem.itemDiscount || 0);
      
      // حساب المبلغ المرتجع (سعر البيع النهائي × الكمية)
      const returnAmount = finalSellPrice * returnQuantity;
      
      // حساب الربح المرتجع بناءً على النسبة من الربح الأصلي
      // إذا كان الربح محفوظ في الفاتورة، نستخدمه مباشرة
      let returnProfit = 0;
      if (returnItem.profit !== undefined && returnItem.profit !== null) {
        // حساب الربح لكل قطعة من الربح الإجمالي
        const profitPerUnit = returnItem.profit / (returnItem.quantity || 1);
        returnProfit = profitPerUnit * returnQuantity;
      } else {
        // إذا لم يكن الربح محفوظاً، نحسبه من الفرق بين سعر البيع والشراء
        const buyPrice = returnItem.buyPrice || 0;
        const profitPerUnit = finalSellPrice - buyPrice;
        returnProfit = profitPerUnit * returnQuantity;
      }

      // إضافة مصروف للمبلغ (يخصم من صافي المبيع)
      const expenseDataAmount = {
        shop: shop,
        amount: returnAmount,
        description: `مرتجع - ${returnItem.productName} (مبلغ)`,
        date: Timestamp.fromDate(new Date()), // تاريخ اليوم الحالي
        createdAt: new Date()
      };
      await addDoc(collection(db, 'expenses'), expenseDataAmount);

      // إضافة مصروف للربح (يخصم من صافي الربح) - فقط إذا كان الربح أكبر من 0
      if (returnProfit > 0) {
        const expenseDataProfit = {
          shop: shop,
          amount: returnProfit,
          description: `مرتجع - ${returnItem.productName} (ربح)`,
          date: Timestamp.fromDate(new Date()), // تاريخ اليوم الحالي
          createdAt: new Date()
        };
        await addDoc(collection(db, 'expenses'), expenseDataProfit);
      }
    } catch (error) {
      console.error('Error processing return:', error);
      showNotification('❌ حدث خطأ أثناء معالجة المرتجع', 'error');
    } finally {
      setIsProcessingReturn(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <HiOutlineReceiptPercent className={styles.titleIcon} />
          <h2 className={styles.title}>الفواتير</h2>
        </div>
        <div className={styles.searchContainer}>
          <HiOutlineSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="ابحث برقم الفاتورة"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.invoiceList}>
        {filteredInvoices.length === 0 ? (
          <div className={styles.emptyState}>
            <HiOutlineReceiptPercent className={styles.emptyIcon} />
            <p>لا توجد فواتير</p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => {
            // التأكد من وجود البيانات الأساسية
            const customerName = invoice.customerName || 'غير محدد';
            const invoiceNumber = invoice.invoiceNumber || invoice.id || 'غير محدد';
            
            return (
              <div key={invoice.id} className={styles.invoiceCard}>
                <div className={styles.invoiceInfo}>
                  <h3 className={styles.customerName}>{customerName}</h3>
                  <p className={styles.invoiceNumber}>رقم الفاتورة: {invoiceNumber}</p>
                </div>
                <button
                  className={styles.viewBtn}
                  onClick={() => handleViewInvoice(invoice)}
                  title="عرض التفاصيل"
                >
                  <HiOutlineEye className={styles.viewIcon} />
                  <span>عرض</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Modal عرض تفاصيل الفاتورة */}
      {selectedInvoice && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>تفاصيل الفاتورة</h3>
              <button className={styles.modalCloseBtn} onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* معلومات العميل */}
              <div className={styles.modalSection}>
                <h4 className={styles.sectionTitle}>معلومات العميل</h4>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>اسم العميل:</span>
                    <span className={styles.infoValue}>{selectedInvoice.customerName || 'غير محدد'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>رقم الموبايل:</span>
                    <span className={styles.infoValue}>{selectedInvoice.customerPhone || 'غير محدد'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>طريقة الدفع:</span>
                    <span className={styles.infoValue}>
                      {selectedInvoice.paymentMethod === 'wallet' ? 'محفظة' : 'نقدي'}
                    </span>
                  </div>
                  {selectedInvoice.paymentMethod === 'wallet' && selectedInvoice.walletNumber && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>رقم المحفظة:</span>
                      <span className={styles.infoValue}>{selectedInvoice.walletNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* المنتجات */}
              <div className={styles.modalSection}>
                <h4 className={styles.sectionTitle}>المنتجات</h4>
                <div className={styles.itemsTableContainer}>
                  <div className={styles.itemsTable}>
                    <div className={styles.tableHeader}>
                      <div className={styles.tableCell}>اسم المنتج</div>
                      <div className={styles.tableCell}>الكود</div>
                      <div className={styles.tableCell}>الكمية</div>
                      <div className={styles.tableCell}>سعر الوحدة</div>
                      <div className={styles.tableCell}>الإجمالي</div>
                      <div className={styles.tableCell}>إجراءات</div>
                    </div>
                    {selectedInvoice.items && Array.isArray(selectedInvoice.items) && selectedInvoice.items.length > 0 ? (
                      selectedInvoice.items.map((item, index) => (
                        <div key={index} className={styles.tableRow}>
                          <div className={styles.tableCell}>{item.productName || 'غير محدد'}</div>
                          <div className={styles.tableCell}>{item.productCode || '-'}</div>
                          <div className={styles.tableCell}>{item.quantity || 0}</div>
                          <div className={styles.tableCell}>{formatNumber(item.unitPrice || 0)} ج.م</div>
                          <div className={styles.tableCell}>{formatNumber(item.totalPrice || 0)} ج.م</div>
                          <div className={styles.tableCell}>
                            <button
                              className={styles.returnBtn}
                              onClick={() => handleReturnItem(item)}
                              title="مرتجع"
                            >
                              <HiOutlineArrowUturnLeft className={styles.returnIcon} />
                              <span>مرتجع</span>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={styles.emptyItems}>لا توجد منتجات</div>
                    )}
                  </div>
                </div>
              </div>

              {/* الملخص */}
              <div className={styles.modalSection}>
                <h4 className={styles.sectionTitle}>الملخص</h4>
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>الإجمالي الفرعي:</span>
                    <span className={styles.summaryValue}>{formatNumber(selectedInvoice.subtotal || 0)} ج.م</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>الخصم:</span>
                    <span className={styles.summaryValue}>{formatNumber(selectedInvoice.discount || 0)} ج.م</span>
                  </div>
                  <div className={`${styles.summaryItem} ${styles.totalItem}`}>
                    <span className={styles.summaryLabel}>الإجمالي النهائي:</span>
                    <span className={styles.summaryValue}>{formatNumber(selectedInvoice.total || 0)} ج.م</span>
                  </div>
                </div>
              </div>

              {/* التاريخ */}
              <div className={styles.modalSection}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>التاريخ والوقت:</span>
                  <span className={styles.infoValue}>{formatDate(selectedInvoice.date)}</span>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.modalCloseButton} onClick={handleCloseModal}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal المرتجع */}
      {showReturnModal && returnItem && (
        <div className={styles.returnModalOverlay} onClick={handleCloseReturnModal}>
          <div className={styles.returnModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.returnModalHeader}>
              <h3 className={styles.returnModalTitle}>مرتجع منتج</h3>
              <button className={styles.returnModalCloseBtn} onClick={handleCloseReturnModal}>
                ×
              </button>
            </div>

            <div className={styles.returnModalBody}>
              <div className={styles.returnItemInfo}>
                <div className={styles.returnInfoRow}>
                  <span className={styles.returnInfoLabel}>اسم المنتج:</span>
                  <span className={styles.returnInfoValue}>{returnItem.productName || 'غير محدد'}</span>
                </div>
                <div className={styles.returnInfoRow}>
                  <span className={styles.returnInfoLabel}>الكود:</span>
                  <span className={styles.returnInfoValue}>{returnItem.productCode || '-'}</span>
                </div>
                <div className={styles.returnInfoRow}>
                  <span className={styles.returnInfoLabel}>الكمية الحالية:</span>
                  <span className={styles.returnInfoValue}>{returnItem.quantity || 0} قطعة</span>
                </div>
              </div>

              <div className={styles.returnQuantitySection}>
                <label className={styles.returnQuantityLabel}>
                  عدد القطع المراد إرجاعها:
                </label>
                <input
                  type="number"
                  min="1"
                  max={returnItem.quantity || 1}
                  value={returnQuantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    const maxQuantity = returnItem.quantity || 1;
                    setReturnQuantity(Math.min(Math.max(1, value), maxQuantity));
                  }}
                  className={styles.returnQuantityInput}
                />
                <span className={styles.returnQuantityHint}>
                  (الحد الأقصى: {returnItem.quantity || 0} قطعة)
                </span>
              </div>

              <div className={styles.returnWarning}>
                <p>⚠️ سيتم إرجاع المنتج للمخزن وحذفه من الفاتورة</p>
              </div>
            </div>

            <div className={styles.returnModalActions}>
              <button
                className={styles.returnCancelBtn}
                onClick={handleCloseReturnModal}
                disabled={isProcessingReturn}
              >
                إلغاء
              </button>
              <button
                className={styles.returnConfirmBtn}
                onClick={confirmReturn}
                disabled={isProcessingReturn}
              >
                {isProcessingReturn ? 'جاري المعالجة...' : 'تأكيد المرتجع'}
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

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className={styles.confirmModalOverlay} onClick={handleCancelConfirm}>
          <div className={styles.confirmModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmModalHeader}>
              <h3 className={styles.confirmModalTitle}>تأكيد المرتجع</h3>
            </div>
            <div className={styles.confirmModalBody}>
              <p className={styles.confirmModalMessage}>{confirmMessage}</p>
            </div>
            <div className={styles.confirmModalActions}>
              <button
                className={styles.cancelBtn}
                onClick={handleCancelConfirm}
                disabled={isProcessingReturn}
              >
                إلغاء
              </button>
              <button
                className={styles.confirmBtn}
                onClick={handleConfirm}
                disabled={isProcessingReturn}
              >
                {isProcessingReturn ? 'جاري المعالجة...' : 'تأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

