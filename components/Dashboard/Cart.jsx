'use client';
import { useState, useEffect, useRef } from 'react';
import { db } from '@/app/firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { HiOutlineSearch, HiOutlinePlus, HiOutlineMinus, HiOutlineTrash, HiDotsVertical } from 'react-icons/hi';
import { HiOutlineShoppingCart } from 'react-icons/hi2';
import { HiOutlineCube } from 'react-icons/hi';
import styles from './Cart.module.css';

export default function Cart({ onInvoiceSaved }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [walletNumber, setWalletNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const notificationTimerRef = useRef(null);

  const shop = typeof window !== 'undefined' ? localStorage.getItem('shop') : '';

  // جلب المنتجات من Firebase
  const fetchProducts = async () => {
    if (!shop) return;

    try {
      const q = query(collection(db, 'products'), where('shop', '==', shop));
      const snapshot = await getDocs(q);
      const productsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setProducts(productsList);
      setFilteredProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
      showNotification('❌ حدث خطأ أثناء جلب المنتجات', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (shop) {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  // البحث في المنتجات وإضافة المنتج تلقائياً عند المطابقة التامة
  useEffect(() => {
    if (!searchQuery.trim() || products.length === 0) {
      return;
    }

    // البحث عن منتج مطابق تماماً (بالكود أو الاسم)
    const exactMatch = products.find(product => {
      const codeMatch = product.code?.toString() === searchQuery.trim();
      const nameMatch = product.name?.toLowerCase() === searchQuery.toLowerCase().trim();
      return codeMatch || nameMatch;
    });

    // إذا وُجد منتج واحد مطابق تماماً، إضافته تلقائياً
    if (exactMatch) {
      addToCart(exactMatch);
      setSearchQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, products]);

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

  // إضافة منتج للـ cart
  const addToCart = (product) => {
    const existingItem = cartItems.find(item => item.id === product.id);

    if (existingItem) {
      // إذا كان المنتج موجود، زيادة الكمية
      const newQuantity = existingItem.quantity + 1;
      if (newQuantity > product.quantity) {
        showNotification('❌ الكمية المطلوبة أكبر من الكمية المتاحة في المخزن', 'error');
        return;
      }
      updateQuantity(product.id, newQuantity);
    } else {
      // إضافة منتج جديد
      if (product.quantity < 1) {
        showNotification('❌ المنتج غير متوفر في المخزن', 'error');
        return;
      }
      setCartItems([...cartItems, { ...product, quantity: 1, itemDiscount: 0 }]);
      showNotification('✅ تم إضافة المنتج للعربة', 'success');
    }
  };

  // تحديث كمية منتج
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 0) return;

    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity > product.quantity) {
      showNotification('❌ الكمية المطلوبة أكبر من الكمية المتاحة في المخزن', 'error');
      return;
    }

    if (newQuantity === 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems(cartItems.map(item =>
      item.id === productId ? { ...item, quantity: newQuantity, itemDiscount: item.itemDiscount || 0 } : item
    ));
  };

  // حذف منتج من الـ cart
  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter(item => item.id !== productId));
    showNotification('✅ تم حذف المنتج من العربة', 'success');
  };

  // إعادة تعيين الطلب (Reset Order)
  const handleResetOrder = () => {
    if (cartItems.length === 0) return;
    setCartItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setWalletNumber('');
    setPaymentMethod('cash');
    showNotification('✅ تم إعادة تعيين الطلب', 'success');
  };

  // حساب إجمالي منتج بعد خصمه
  const calculateItemTotal = (item) => {
    const finalPrice = item.sellPrice - (item.itemDiscount || 0);
    return finalPrice * item.quantity;
  };

  // حساب الربح من منتج
  const calculateProfit = (item) => {
    const finalPrice = item.sellPrice - (item.itemDiscount || 0);
    const profitPerUnit = finalPrice - (item.buyPrice || 0);
    return profitPerUnit * item.quantity;
  };

  // حساب مجموع أرباح جميع المنتجات
  const calculateTotalProfit = () => {
    return cartItems.reduce((sum, item) => sum + calculateProfit(item), 0);
  };

  // حساب الإجمالي قبل الخصم
  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  // حساب إجمالي الخصم من جميع المنتجات
  const calculateTotalDiscount = () => {
    return cartItems.reduce((sum, item) => sum + (item.itemDiscount || 0) * item.quantity, 0);
  };

  // حساب الضريبة (يمكن تعديلها لاحقاً)
  const calculateTax = () => {
    return 0; // حالياً لا توجد ضريبة
  };

  // حساب الإجمالي بعد الخصم (لا يوجد خصم عام الآن)
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    return subtotal + tax;
  };

  // تحديث خصم منتج معين
  const handleDiscountChange = (productId, discountValue) => {
    const discount = Math.max(0, parseFloat(discountValue) || 0);
    setCartItems(cartItems.map(item =>
      item.id === productId ? { ...item, itemDiscount: discount } : item
    ));
  };

  // حساب رقم الفاتورة التالي
  const getNextInvoiceNumber = async () => {
    if (!shop) return 1001;

    try {
      const q = query(collection(db, 'sales'), where('shop', '==', shop));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return 1001;
      }

      const invoiceNumbers = snapshot.docs
        .map(doc => doc.data().invoiceNumber)
        .filter(num => num != null)
        .map(num => typeof num === 'string' ? parseInt(num) : num);

      if (invoiceNumbers.length === 0) {
        return 1001;
      }

      const maxNumber = Math.max(...invoiceNumbers);
      return maxNumber + 1;
    } catch (error) {
      console.error('Error calculating next invoice number:', error);
      return 1001;
    }
  };

  // حفظ الفاتورة
  const handleSaveInvoice = async () => {
    if (cartItems.length === 0) {
      showNotification('❌ الفاتورة فارغة', 'error');
      return;
    }

    if (paymentMethod === 'wallet' && !walletNumber.trim()) {
      showNotification('❌ يرجى إدخال رقم المحفظة', 'error');
      return;
    }

    setIsSaving(true);

    try {
      // حساب رقم الفاتورة
      const invoiceNumber = await getNextInvoiceNumber();

      // إعداد بيانات الفاتورة
      const invoiceItems = cartItems.map(item => {
        const invoiceItem = {
          productId: item.id,
          productCode: item.code,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.sellPrice,
          itemDiscount: item.itemDiscount || 0,
          finalPrice: item.sellPrice - (item.itemDiscount || 0),
          totalPrice: calculateItemTotal(item),
          buyPrice: item.buyPrice || 0,
          sellPrice: item.sellPrice,
          profit: calculateProfit(item),
          type: item.type || 'accessory'
        };

        // إضافة البيانات الإضافية للموبايل فقط إذا كانت موجودة (لتجنب undefined)
        if (item.type === 'phone') {
          if (item.battery !== undefined) invoiceItem.battery = item.battery;
          if (item.storage !== undefined) invoiceItem.storage = item.storage;
          if (item.serial !== undefined) invoiceItem.serial = item.serial;
          if (item.box !== undefined) invoiceItem.box = item.box;
          if (item.tax !== undefined) invoiceItem.tax = item.tax;
        }

        return invoiceItem;
      });

      const subtotal = calculateSubtotal();
      const total = calculateTotal();
      const totalProfit = calculateTotalProfit();

      const invoiceData = {
        invoiceNumber,
        shop,
        customerName: customerName.trim() || '',
        customerPhone: customerPhone.trim() || '',
        paymentMethod,
        walletNumber: paymentMethod === 'wallet' ? walletNumber.trim() : '',
        items: invoiceItems,
        subtotal,
        total,
        totalProfit,
        date: new Date(),
        createdAt: new Date()
      };

      // حفظ الفاتورة في Firestore
      await addDoc(collection(db, 'sales'), invoiceData);

      // تحديث كمية المنتجات في المخزن
      for (const item of invoiceItems) {
        const productRef = doc(db, 'products', item.productId);
        const productDoc = await getDoc(productRef);
        
        if (productDoc.exists()) {
          const currentQuantity = productDoc.data().quantity || 0;
          const newQuantity = currentQuantity - item.quantity;
          
          // إذا كانت الكمية الجديدة = 0 أو أقل، حذف المنتج
          if (newQuantity <= 0) {
            await deleteDoc(productRef);
          } else {
            await updateDoc(productRef, {
              quantity: newQuantity
            });
          }
        }
      }

      // إفراغ الـ cart وإعادة تعيين الحقول
      setCartItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setWalletNumber('');
      setPaymentMethod('cash');
      setShowInvoiceModal(false);
      
      // تحديث قائمة المنتجات
      await fetchProducts();

      // تحديث الإحصائيات في Dashboard
      if (onInvoiceSaved) {
        onInvoiceSaved();
      }

      showNotification(`✅ تم حفظ الفاتورة رقم ${invoiceNumber} بنجاح`, 'success');
    } catch (error) {
      console.error('Error saving invoice:', error);
      showNotification('❌ حدث خطأ أثناء حفظ الفاتورة', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // تنسيق الأرقام
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>تفاصيل الطلب</h2>
        <button className={styles.headerAction}>
          <HiDotsVertical />
        </button>
      </div>

      {/* Customer Info */}
      <div className={styles.customerInfo}>
        <div className={styles.customerField}>
          <label className={styles.customerLabel}>اسم العميل</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={styles.customerInput}
            placeholder="اكتب اسم العميل"
          />
        </div>
        <div className={styles.customerField}>
          <label className={styles.customerLabel}>رقم الهاتف</label>
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className={styles.customerInput}
            placeholder="أدخل رقم الهاتف"
          />
        </div>
      </div>

      {/* Search Section */}
      <div className={styles.searchSection}>
        <div className={styles.searchInputContainer}>
          <HiOutlineSearch className={styles.searchIcon} />
          <input
            type="text"
            list="productsList"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            placeholder="ابحث بكود أو اسم المنتج..."
          />
        </div>
      </div>


      {/* Order Items Section */}
      <div className={styles.orderItemsSection}>
        <div className={styles.orderItemsHeader}>
          <h3 className={styles.orderItemsTitle}>الطلبات</h3>
          {cartItems.length > 0 && (
            <button className={styles.resetOrderBtn} onClick={handleResetOrder}>
              إعادة الطلب
            </button>
          )}
        </div>
        
        {cartItems.length === 0 ? (
          <div className={styles.emptyCart}>
            <HiOutlineShoppingCart className={styles.emptyCartIcon} />
            <p>الفاتورة فارغة</p>
          </div>
        ) : (
          <div className={styles.orderItemsList}>
            {cartItems.map((item) => (
              <div key={item.id} className={styles.orderItem}>
                <div className={styles.productThumbnail}>
                  <HiOutlineCube />
                </div>
                
                <div className={styles.orderItemContent}>
                  <h4 className={styles.orderItemName}>{item.name}</h4>
                  <p className={styles.orderItemPrice}>{formatNumber(item.sellPrice)} ج.م</p>
                </div>
                
                <div className={styles.quantityControl}>
                  <button
                    className={styles.quantityBtn}
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <HiOutlineMinus />
                  </button>
                  <span className={styles.quantityValue}>{item.quantity}</span>
                  <button
                    className={styles.quantityBtn}
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={item.quantity >= (products.find(p => p.id === item.id)?.quantity || 0)}
                  >
                    <HiOutlinePlus />
                  </button>
                </div>
                
                <button
                  className={styles.removeBtn}
                  onClick={() => removeFromCart(item.id)}
                >
                  <HiOutlineTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Details Section */}
      <div className={styles.paymentDetailsSection}>
        <h3 className={styles.paymentDetailsTitle}>تفاصيل الدفع</h3>
        
        <div className={styles.paymentMethodField}>
          <label className={styles.paymentMethodLabel}>طريقة الدفع</label>
          <div className={styles.paymentMethodValue}>
            {paymentMethod === 'cash' ? 'كاش' : 'محفظة'}
          </div>
          <div className={styles.paymentOptions}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                value="cash"
                checked={paymentMethod === 'cash'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={styles.radioInput}
              />
              <span>كاش</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                value="wallet"
                checked={paymentMethod === 'wallet'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={styles.radioInput}
              />
              <span>محفظة</span>
            </label>
          </div>
          {paymentMethod === 'wallet' && (
            <input
              type="text"
              value={walletNumber}
              onChange={(e) => setWalletNumber(e.target.value)}
              className={styles.walletInput}
              placeholder="أدخل رقم المحفظة"
            />
          )}
        </div>
        
        <div className={styles.paymentSummary}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>الإجمالي الفرعي</span>
            <span className={styles.summaryValue}>{formatNumber(calculateSubtotal())} ج.م</span>
          </div>
          
          {calculateTotalDiscount() > 0 && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>الخصم ({Math.round((calculateTotalDiscount() / calculateSubtotal()) * 100)}%)</span>
              <span className={styles.summaryValue}>-{formatNumber(calculateTotalDiscount())} ج.م</span>
            </div>
          )}
          
          {calculateTax() > 0 && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>الضريبة ({Math.round((calculateTax() / calculateSubtotal()) * 100)}%)</span>
              <span className={styles.summaryValue}>{formatNumber(calculateTax())} ج.م</span>
            </div>
          )}
          
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>الإجمالي</span>
            <span className={styles.totalValue}>{formatNumber(calculateTotal())} ج.م</span>
          </div>
        </div>
      </div>

      {/* Footer Button */}
      <div className={styles.footer}>
        <button
          className={styles.confirmPaymentBtn}
          onClick={() => setShowInvoiceModal(true)}
          disabled={cartItems.length === 0 || (paymentMethod === 'wallet' && !walletNumber.trim())}
        >
          تأكيد الدفع
        </button>
        {cartItems.length > 0 && (
          <button
            className={styles.discountBtn}
            onClick={() => setShowDiscountModal(true)}
          >
            الخصم
          </button>
        )}
      </div>

      {/* Modal الفاتورة */}
      {showInvoiceModal && (
        <div className={styles.modalOverlay} onClick={() => setShowInvoiceModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>معلومات الفاتورة</h3>
            
            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>اسم العميل</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={styles.formInput}
                  placeholder="أدخل اسم العميل (اختياري)"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>رقم الموبايل</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className={styles.formInput}
                  placeholder="أدخل رقم الموبايل (اختياري)"
                />
              </div>
              
              {paymentMethod === 'wallet' && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>رقم المحفظة *</label>
                  <input
                    type="text"
                    value={walletNumber}
                    onChange={(e) => setWalletNumber(e.target.value)}
                    className={styles.formInput}
                    placeholder="أدخل رقم المحفظة"
                    required
                  />
                </div>
              )}
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>طريقة الدفع</label>
                <div className={styles.paymentOptions}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className={styles.radioInput}
                    />
                    <span>نقدي</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      value="wallet"
                      checked={paymentMethod === 'wallet'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className={styles.radioInput}
                    />
                    <span>محفظة</span>
                  </label>
                </div>
              </div>
              
              <div className={styles.modalSummary}>
                <div className={styles.modalSummaryRow}>
                  <span>الإجمالي:</span>
                  <span>{formatNumber(calculateSubtotal())} ج.م</span>
                </div>
                <div className={styles.modalSummaryRow}>
                  <span>الربح:</span>
                  <span>{formatNumber(calculateTotalProfit())} ج.م</span>
                </div>
                <div className={styles.modalSummaryRow}>
                  <span>الإجمالي النهائي:</span>
                  <span className={styles.modalTotal}>{formatNumber(calculateTotal())} ج.م</span>
                </div>
              </div>
              
              <div className={styles.modalActions}>
                <button
                  className={styles.modalCancelBtn}
                  onClick={() => setShowInvoiceModal(false)}
                  disabled={isSaving}
                >
                  إلغاء
                </button>
                <button
                  className={styles.modalSaveBtn}
                  onClick={handleSaveInvoice}
                  disabled={isSaving}
                >
                  {isSaving ? 'جاري الحفظ...' : 'إضافة الفاتورة'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div
          className={`${styles.notification} ${styles[notification.type]}`}
          onClick={() => setNotification({ show: false, message: '', type: 'success' })}
        >
          <span>{notification.message}</span>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className={styles.discountModalOverlay} onClick={() => setShowDiscountModal(false)}>
          <div className={styles.discountModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.discountModalHeader}>
              <h3 className={styles.discountModalTitle}>الخصومات</h3>
              <button className={styles.discountModalCloseBtn} onClick={() => setShowDiscountModal(false)}>
                ×
              </button>
            </div>

            <div className={styles.discountModalBody}>
              {cartItems.length === 0 ? (
                <div className={styles.emptyDiscountState}>
                  <p>لا توجد منتجات في الفاتورة</p>
                </div>
              ) : (
                cartItems.map((item) => {
                  const itemDiscount = item.itemDiscount || 0;
                  const finalPrice = item.sellPrice - itemDiscount;
                  const buyPrice = item.buyPrice || 0;
                  const hasWarning = itemDiscount > 0 && finalPrice < buyPrice;
                  
                  return (
                    <div key={item.id} className={styles.discountItemRow}>
                      <div className={styles.discountItemInfo}>
                        <h4 className={styles.discountItemName}>{item.name}</h4>
                        <div className={styles.discountItemPrices}>
                          <span className={styles.discountPriceLabel}>سعر البيع: {formatNumber(item.sellPrice)} ج.م</span>
                          <span className={styles.discountPriceLabel}>سعر الجملة: {formatNumber(buyPrice)} ج.م</span>
                        </div>
                      </div>
                      
                      <div className={styles.discountInputSection}>
                        <label className={styles.discountInputLabel}>الخصم (ج.م):</label>
                        <input
                          type="number"
                          value={itemDiscount}
                          onChange={(e) => handleDiscountChange(item.id, e.target.value)}
                          className={styles.discountInput}
                          min="0"
                          step="0.01"
                          max={item.sellPrice}
                        />
                        {hasWarning && (
                          <div className={styles.discountWarning}>
                            ⚠️ تحذير: السعر النهائي ({formatNumber(finalPrice)} ج.م) أقل من سعر الجملة ({formatNumber(buyPrice)} ج.م)
                          </div>
                        )}
                        <div className={styles.discountFinalPrice}>
                          السعر النهائي: {formatNumber(finalPrice)} ج.م
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className={styles.discountModalActions}>
              <button
                className={styles.discountCancelBtn}
                onClick={() => setShowDiscountModal(false)}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

