'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/app/firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2';
import styles from './styles.module.css';
import Topbar from '@/components/Dashboard/Topbar';
import Sidebar from '@/components/Dashboard/Sidebar';

export default function AddProduct() {
  const router = useRouter();
  const [productType, setProductType] = useState('phone'); // 'phone' or 'accessory'
  const [nextCode, setNextCode] = useState(1000);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const notificationTimerRef = useRef(null);
  
  // Products management states
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Phone fields
  const [phoneName, setPhoneName] = useState('');
  const [battery, setBattery] = useState('');
  const [storage, setStorage] = useState('');
  const [serial, setSerial] = useState('');
  const [hasBox, setHasBox] = useState(true);
  const [hasTax, setHasTax] = useState(false);
  const [phoneQuantity, setPhoneQuantity] = useState(1);
  const [phoneBuyPrice, setPhoneBuyPrice] = useState('');
  const [phoneSellPrice, setPhoneSellPrice] = useState('');
  
  // Accessory fields
  const [accessoryName, setAccessoryName] = useState('');
  const [accessoryQuantity, setAccessoryQuantity] = useState('');
  const [accessoryBuyPrice, setAccessoryBuyPrice] = useState('');
  const [accessorySellPrice, setAccessorySellPrice] = useState('');

  const shop = typeof window !== 'undefined' ? localStorage.getItem('shop') : '';

  // حساب الكود التسلسلي
  useEffect(() => {
    const calculateNextCode = async () => {
      if (!shop) return;
      
      try {
        // استخدام where فقط بدون orderBy لتجنب مشكلة الـ index
        const q = query(collection(db, 'products'), where('shop', '==', shop));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setNextCode(1000);
        } else {
          // استخراج جميع الأكواد وترتيبها يدوياً
          const codes = snapshot.docs
            .map(doc => doc.data().code)
            .filter(code => code != null)
            .map(code => typeof code === 'string' ? parseInt(code) : code);
          
          if (codes.length === 0) {
            setNextCode(1000);
          } else {
            const maxCode = Math.max(...codes);
            setNextCode(maxCode + 1);
          }
        }
      } catch (error) {
        console.error('Error calculating next code:', error);
        setNextCode(1000);
      } finally {
        setIsLoading(false);
      }
    };

    calculateNextCode();
  }, [shop]);

  // جلب المنتجات من Firebase
  const fetchProducts = async () => {
    if (!shop) return;
    
    try {
      // استخدام where فقط بدون orderBy لتجنب مشكلة الـ index
      const q = query(collection(db, 'products'), where('shop', '==', shop));
      const snapshot = await getDocs(q);
      const productsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // ترتيب حسب الكود يدوياً (تنازلي)
      productsList.sort((a, b) => {
        const codeA = a.code || 0;
        const codeB = b.code || 0;
        return codeB - codeA;
      });
      
      setProducts(productsList);
      setFilteredProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
      showNotification('❌ حدث خطأ أثناء جلب المنتجات', 'error');
    }
  };

  // جلب المنتجات عند تحميل الصفحة
  useEffect(() => {
    if (shop) {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  // إخفاء الإشعار تلقائياً بعد 1.5 ثانية
  useEffect(() => {
    if (notification.show) {
      // تنظيف الـ timer السابق إن وجد
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
    // تنظيف الـ timer السابق إن وجد
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = null;
    }
    setNotification({ show: true, message, type });
  };

  const hideNotification = () => {
    // تنظيف الـ timer عند الإخفاء اليدوي
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = null;
    }
    setNotification({ show: false, message: '', type: 'success' });
  };

  // البحث في المنتجات
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredProducts(products);
      return;
    }
    
    const filtered = products.filter(product => {
      const codeMatch = product.code?.toString().includes(query);
      const nameMatch = product.name?.toLowerCase().includes(query.toLowerCase());
      return codeMatch || nameMatch;
    });
    
    setFilteredProducts(filtered);
  };

  // حذف منتج
  const handleDelete = (product) => {
    setDeleteConfirm(product);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      await deleteDoc(doc(db, 'products', deleteConfirm.id));
      showNotification('✅ تم حذف المنتج بنجاح', 'success');
      setDeleteConfirm(null);
      fetchProducts(); // تحديث القائمة
    } catch (error) {
      console.error('Error deleting product:', error);
      showNotification('❌ حدث خطأ أثناء حذف المنتج', 'error');
    }
  };

  // تعديل منتج
  const handleEdit = (product) => {
    setEditingProduct(product);
    setProductType(product.type || 'phone');
    
    if (product.type === 'phone') {
      setPhoneName(product.name || '');
      setBattery(product.battery || '');
      setStorage(product.storage || '');
      setSerial(product.serial || '');
      setHasBox(product.box !== undefined ? product.box : true);
      setHasTax(product.tax !== undefined ? product.tax : false);
      setPhoneQuantity(product.quantity || 1);
      setPhoneBuyPrice(product.buyPrice?.toString() || '');
      setPhoneSellPrice(product.sellPrice?.toString() || '');
    } else {
      setAccessoryName(product.name || '');
      setAccessoryQuantity(product.quantity?.toString() || '');
      setAccessoryBuyPrice(product.buyPrice?.toString() || '');
      setAccessorySellPrice(product.sellPrice?.toString() || '');
    }
    
    // التمرير إلى أعلى النموذج
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // إعادة تعيين النموذج
  const resetForm = () => {
    setEditingProduct(null);
    setProductType('phone');
    setPhoneName('');
    setBattery('');
    setStorage('');
    setSerial('');
    setHasBox(true);
    setHasTax(false);
    setPhoneQuantity(1);
    setPhoneBuyPrice('');
    setPhoneSellPrice('');
    setAccessoryName('');
    setAccessoryQuantity('');
    setAccessoryBuyPrice('');
    setAccessorySellPrice('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    if (!shop) {
      showNotification('يجب تسجيل الدخول أولاً', 'error');
      setIsSaving(false);
      return;
    }

    try {
      if (productType === 'phone') {
        // التحقق من بيانات الموبايل
        if (!phoneName || !phoneBuyPrice || !phoneSellPrice) {
          showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
          setIsSaving(false);
          return;
        }

        const productData = {
          name: phoneName,
          battery: battery || '0',
          storage: storage || '0',
          serial: serial || '0',
          box: hasBox,
          tax: hasTax,
          quantity: parseInt(phoneQuantity) || 1,
          buyPrice: parseFloat(phoneBuyPrice),
          sellPrice: parseFloat(phoneSellPrice),
          type: 'phone',
          shop: shop
        };

        if (editingProduct) {
          // تحديث منتج موجود - نحتفظ بالتاريخ الأصلي
          productData.date = editingProduct.date;
          
          // إذا كانت الكمية = 0 أو أقل، حذف المنتج
          if (productData.quantity <= 0) {
            await deleteDoc(doc(db, 'products', editingProduct.id));
            showNotification('✅ تم حذف المنتج (الكمية = 0)', 'success');
          } else {
            await updateDoc(doc(db, 'products', editingProduct.id), productData);
            showNotification('✅ تم تحديث المنتج بنجاح', 'success');
          }
        } else {
          // إضافة منتج جديد - إضافة التاريخ والوقت الحالي
          productData.code = nextCode;
          productData.date = new Date(); // التاريخ والوقت الحالي
          await addDoc(collection(db, 'products'), productData);
          showNotification('✅ تم إضافة المنتج بنجاح', 'success');
          setNextCode(nextCode + 1);
        }
        
        // إعادة تعيين الحقول
        resetForm();
        fetchProducts(); // تحديث قائمة المنتجات
      } else {
        // التحقق من بيانات الأكسسوار
        if (!accessoryName || !accessoryQuantity || !accessoryBuyPrice || !accessorySellPrice) {
          showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
          setIsSaving(false);
          return;
        }

        const productData = {
          name: accessoryName,
          quantity: parseInt(accessoryQuantity) || 0,
          buyPrice: parseFloat(accessoryBuyPrice),
          sellPrice: parseFloat(accessorySellPrice),
          type: 'accessory',
          shop: shop
        };

        if (editingProduct) {
          // تحديث منتج موجود - نحتفظ بالتاريخ الأصلي
          productData.date = editingProduct.date;
          
          // إذا كانت الكمية = 0 أو أقل، حذف المنتج
          if (productData.quantity <= 0) {
            await deleteDoc(doc(db, 'products', editingProduct.id));
            showNotification('✅ تم حذف المنتج (الكمية = 0)', 'success');
          } else {
            await updateDoc(doc(db, 'products', editingProduct.id), productData);
            showNotification('✅ تم تحديث المنتج بنجاح', 'success');
          }
        } else {
          // إضافة منتج جديد - إضافة التاريخ والوقت الحالي
          productData.code = nextCode;
          productData.date = new Date(); // التاريخ والوقت الحالي
          await addDoc(collection(db, 'products'), productData);
          showNotification('✅ تم إضافة المنتج بنجاح', 'success');
          setNextCode(nextCode + 1);
        }
        
        // إعادة تعيين الحقول
        resetForm();
        fetchProducts(); // تحديث قائمة المنتجات
      }
    } catch (error) {
      console.error('Error adding product:', error);
      showNotification('❌ حدث خطأ أثناء إضافة المنتج', 'error');
    } finally {
      setIsSaving(false);
    }
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
      <Topbar />
      <div className={styles.content}>
        <Sidebar activeNav="المخزون" />
        <main className={styles.main}>
          <div className={styles.header}>
            <h1 className={styles.pageTitle}>إضافة منتج جديد</h1>
          </div>

          <div className={styles.twoColumns}>
            {/* العمود الأيسر: نموذج الإضافة */}
            <div className={styles.leftColumn}>
              <div className={styles.formCard}>
            {/* Toggle للتبديل بين النوعين */}
            <div className={styles.typeToggle}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${productType === 'phone' ? styles.active : ''}`}
                onClick={() => setProductType('phone')}
              >
                موبايلات
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${productType === 'accessory' ? styles.active : ''}`}
                onClick={() => setProductType('accessory')}
              >
                أكسسوار
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {/* عرض الكود التسلسلي */}
              {!editingProduct && (
                <div className={styles.codeDisplay}>
                  <span className={styles.codeLabel}>الكود التسلسلي:</span>
                  <span className={styles.codeValue}>{nextCode}</span>
                </div>
              )}
              {editingProduct && (
                <div className={styles.codeDisplay}>
                  <span className={styles.codeLabel}>الكود التسلسلي:</span>
                  <span className={styles.codeValue}>{editingProduct.code}</span>
                </div>
              )}

              {productType === 'phone' ? (
                <div className={styles.fieldsGrid}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>اسم الجهاز *</label>
                    <input
                      type="text"
                      value={phoneName}
                      onChange={(e) => setPhoneName(e.target.value)}
                      className={styles.input}
                      placeholder="أدخل اسم الجهاز"
                      required
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>البطارية</label>
                    <input
                      type="text"
                      value={battery}
                      onChange={(e) => setBattery(e.target.value)}
                      className={styles.input}
                      placeholder="مثال: 5000"
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>المساحة</label>
                    <input
                      type="text"
                      value={storage}
                      onChange={(e) => setStorage(e.target.value)}
                      className={styles.input}
                      placeholder="مثال: 128"
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>السريال</label>
                    <input
                      type="text"
                      value={serial}
                      onChange={(e) => setSerial(e.target.value)}
                      className={styles.input}
                      placeholder="أدخل السريال"
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>بكرتونة</label>
                    <div className={styles.switchGroup}>
                      <button
                        type="button"
                        className={`${styles.switchOption} ${hasBox ? styles.active : ''}`}
                        onClick={() => setHasBox(true)}
                      >
                        بكرتونة
                      </button>
                      <button
                        type="button"
                        className={`${styles.switchOption} ${!hasBox ? styles.active : ''}`}
                        onClick={() => setHasBox(false)}
                      >
                        بدون
                      </button>
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>الضريبة</label>
                    <div className={styles.switchGroup}>
                      <button
                        type="button"
                        className={`${styles.switchOption} ${hasTax ? styles.active : ''}`}
                        onClick={() => setHasTax(true)}
                      >
                        بضريبة
                      </button>
                      <button
                        type="button"
                        className={`${styles.switchOption} ${!hasTax ? styles.active : ''}`}
                        onClick={() => setHasTax(false)}
                      >
                        مدفوع
                      </button>
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>الكمية</label>
                    <input
                      type="number"
                      value={phoneQuantity}
                      onChange={(e) => setPhoneQuantity(e.target.value)}
                      className={styles.input}
                      min="1"
                      placeholder="1"
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>سعر الجملة *</label>
                    <input
                      type="number"
                      value={phoneBuyPrice}
                      onChange={(e) => setPhoneBuyPrice(e.target.value)}
                      className={styles.input}
                      placeholder="0.00"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>سعر البيع *</label>
                    <input
                      type="number"
                      value={phoneSellPrice}
                      onChange={(e) => setPhoneSellPrice(e.target.value)}
                      className={styles.input}
                      placeholder="0.00"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.fieldsGrid}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>اسم المنتج *</label>
                    <input
                      type="text"
                      value={accessoryName}
                      onChange={(e) => setAccessoryName(e.target.value)}
                      className={styles.input}
                      placeholder="أدخل اسم المنتج"
                      required
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>الكمية *</label>
                    <input
                      type="number"
                      value={accessoryQuantity}
                      onChange={(e) => setAccessoryQuantity(e.target.value)}
                      className={styles.input}
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>سعر الجملة *</label>
                    <input
                      type="number"
                      value={accessoryBuyPrice}
                      onChange={(e) => setAccessoryBuyPrice(e.target.value)}
                      className={styles.input}
                      placeholder="0.00"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>سعر البيع *</label>
                    <input
                      type="number"
                      value={accessorySellPrice}
                      onChange={(e) => setAccessorySellPrice(e.target.value)}
                      className={styles.input}
                      placeholder="0.00"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
              )}

              <div className={styles.submitSection}>
                {editingProduct && (
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
                  {isSaving ? 'جاري الحفظ...' : editingProduct ? 'تحديث المنتج' : 'إضافة المنتج'}
                </button>
              </div>
            </form>
              </div>
            </div>

            {/* العمود الأيمن: عرض المنتجات */}
            <div className={styles.rightColumn}>
              <div className={styles.productsCard}>
                <h2 className={styles.productsTitle}>المنتجات المضافة</h2>
                
                {/* حقل البحث مع datalist */}
                <div className={styles.searchSection}>
                  <input
                    type="text"
                    list="productsList"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className={styles.searchInput}
                    placeholder="ابحث بكود أو اسم المنتج..."
                  />
                  <datalist id="productsList">
                    {products.map((product) => (
                      <option key={product.id} value={`${product.code} - ${product.name}`}>
                        {product.code} - {product.name}
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* قائمة المنتجات */}
                <div className={styles.productsGrid}>
                  {filteredProducts.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>لا توجد منتجات</p>
                    </div>
                  ) : (
                    filteredProducts.map((product) => (
                      <div key={product.id} className={styles.productCard}>
                        <div className={styles.productInfo}>
                          <h3 className={styles.productName}>{product.name}</h3>
                          <p className={styles.productCode}>كود: {product.code}</p>
                        </div>
                        <div className={styles.productActions}>
                          <button
                            className={styles.editBtn}
                            onClick={() => handleEdit(product)}
                            title="تعديل"
                          >
                            <HiOutlinePencil className={styles.actionIcon} />
                          </button>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(product)}
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>تأكيد الحذف</h3>
            <p className={styles.modalMessage}>
              هل أنت متأكد من حذف المنتج &quot;{deleteConfirm.name}&quot; (كود: {deleteConfirm.code})؟
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setDeleteConfirm(null)}
              >
                إلغاء
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={confirmDelete}
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

