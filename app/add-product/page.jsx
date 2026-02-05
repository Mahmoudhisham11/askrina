'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/app/firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2';
import styles from './styles.module.css';
import Topbar from '@/components/Dashboard/Topbar';
import Sidebar from '@/components/Dashboard/Sidebar';

// Force dynamic rendering - this page uses useSearchParams, localStorage, and Firebase
export const dynamic = 'force-dynamic';

// Component that uses useSearchParams - must be wrapped in Suspense
function AddProductContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState('single'); // 'single' | 'invoice'
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
  
   // Invoice header fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [invoiceNote, setInvoiceNote] = useState('');
  // Invoice items
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [editingInvoiceItemIndex, setEditingInvoiceItemIndex] = useState(null);
  
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

  const [shop, setShop] = useState('');

  // Initialize shop from localStorage on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const shopValue = localStorage.getItem('shop') || '';
      setShop(shopValue);
    }
  }, []);

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

  // قراءة بيانات العميل من URL params
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    const urlCustomerName = searchParams.get('customerName');
    const urlCustomerPhone = searchParams.get('customerPhone');

    if (urlMode === 'invoice') {
      setMode('invoice');
    }

    if (urlCustomerName) {
      setCustomerName(decodeURIComponent(urlCustomerName));
    }

    if (urlCustomerPhone) {
      setCustomerPhone(decodeURIComponent(urlCustomerPhone));
    }
  }, [searchParams]);

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
    setMode('single');
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
    // Reset invoice fields
    setCustomerName('');
    setCustomerPhone('');
    setInvoiceNote('');
    setInvoiceItems([]);
    setEditingInvoiceItemIndex(null);
  };

  // إضافة أو تعديل سطر منتج داخل الفاتورة
  const handleAddInvoiceItem = (e) => {
    e.preventDefault();

    // التحقق من الحقول الأساسية حسب نوع المنتج
    if (productType === 'phone') {
      if (!phoneName || !phoneSellPrice || !phoneQuantity) {
        showNotification('يرجى ملء بيانات الجهاز (الاسم، الكمية، سعر البيع) للسطر', 'error');
        return;
      }
    } else {
      if (!accessoryName || !accessorySellPrice || !accessoryQuantity) {
        showNotification('يرجى ملء بيانات المنتج (الاسم، الكمية، سعر البيع) للسطر', 'error');
        return;
      }
    }

    const baseItem =
      productType === 'phone'
        ? {
            type: 'phone',
            name: phoneName,
            battery: battery || '0',
            storage: storage || '0',
            serial: serial || '0',
            box: hasBox,
            tax: hasTax,
            quantity: parseInt(phoneQuantity) || 1,
            buyPrice: parseFloat(phoneBuyPrice) || 0,
            sellPrice: parseFloat(phoneSellPrice) || 0,
          }
        : {
            type: 'accessory',
            name: accessoryName,
            quantity: parseInt(accessoryQuantity) || 0,
            buyPrice: parseFloat(accessoryBuyPrice) || 0,
            sellPrice: parseFloat(accessorySellPrice) || 0,
          };

    if (editingInvoiceItemIndex !== null) {
      const updated = [...invoiceItems];
      updated[editingInvoiceItemIndex] = baseItem;
      setInvoiceItems(updated);
      setEditingInvoiceItemIndex(null);
      showNotification('✅ تم تحديث سطر الفاتورة', 'success');
    } else {
      setInvoiceItems([...invoiceItems, baseItem]);
      showNotification('✅ تم إضافة السطر إلى الفاتورة', 'success');
    }

    // تفريغ الحقول بعد الإضافة/التعديل
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

  const handleEditInvoiceItem = (index) => {
    const item = invoiceItems[index];
    setEditingInvoiceItemIndex(index);
    setProductType(item.type || 'phone');

    if (item.type === 'phone') {
      setPhoneName(item.name || '');
      setBattery(item.battery || '');
      setStorage(item.storage || '');
      setSerial(item.serial || '');
      setHasBox(item.box !== undefined ? item.box : true);
      setHasTax(item.tax !== undefined ? item.tax : false);
      setPhoneQuantity(item.quantity || 1);
      setPhoneBuyPrice(item.buyPrice?.toString() || '');
      setPhoneSellPrice(item.sellPrice?.toString() || '');
    } else {
      setAccessoryName(item.name || '');
      setAccessoryQuantity(item.quantity?.toString() || '');
      setAccessoryBuyPrice(item.buyPrice?.toString() || '');
      setAccessorySellPrice(item.sellPrice?.toString() || '');
    }
  };

  const handleDeleteInvoiceItem = (index) => {
    const updated = invoiceItems.filter((_, i) => i !== index);
    setInvoiceItems(updated);
    if (editingInvoiceItemIndex === index) {
      setEditingInvoiceItemIndex(null);
    }
  };

  // حساب إجمالي الفاتورة من أسعار الجملة للمنتجات
  const calculateInvoiceTotal = () => {
    return invoiceItems.reduce((total, item) => {
      const itemTotal = (item.buyPrice || 0) * (item.quantity || 0);
      return total + itemTotal;
    }, 0);
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    if (!shop) {
      showNotification('يجب تسجيل الدخول أولاً', 'error');
      setIsSaving(false);
      return;
    }

    if (!customerName || invoiceItems.length === 0) {
      showNotification('يرجى إدخال اسم العميل وإضافة منتج واحد على الأقل للفاتورة', 'error');
      setIsSaving(false);
      return;
    }

    // حساب إجمالي الفاتورة تلقائياً
    const calculatedTotal = calculateInvoiceTotal();

    try {
      // البحث عن فاتورة موجودة لنفس العميل (بنفس الاسم ورقم الموبايل)
      // استخدام where واحد فقط لتجنب مشكلة الـ index المركب
      const existingInvoiceQuery = query(
        collection(db, 'invoices'),
        where('shop', '==', shop)
      );
      
      const existingInvoiceSnapshot = await getDocs(existingInvoiceQuery);
      
      // البحث يدوياً عن فاتورة لنفس العميل
      const trimmedCustomerName = customerName.trim();
      const trimmedCustomerPhone = (customerPhone.trim() || '');
      
      const existingInvoiceDoc = existingInvoiceSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.customerName === trimmedCustomerName && 
               (data.customerPhone || '') === trimmedCustomerPhone;
      });
      
      let invoiceRef;
      let existingInvoiceId = null;

      if (existingInvoiceDoc) {
        // يوجد فاتورة موجودة لنفس العميل - تحديثها
        existingInvoiceId = existingInvoiceDoc.id;
        const existingInvoiceData = existingInvoiceDoc.data();
        
        // دمج المنتجات الجديدة مع المنتجات الموجودة
        const mergedItems = [...(existingInvoiceData.items || []), ...invoiceItems];
        
        // حساب الإجمالي الجديد
        const newTotalDebt = (existingInvoiceData.totalDebt || 0) + calculatedTotal;
        
        // تحديث الفاتورة الموجودة
        await updateDoc(doc(db, 'invoices', existingInvoiceId), {
          items: mergedItems,
          totalDebt: newTotalDebt,
          date: new Date(), // تحديث التاريخ لآخر عملية
          // الاحتفاظ بالملاحظات القديمة أو دمجها
          note: invoiceNote.trim() 
            ? (existingInvoiceData.note ? `${existingInvoiceData.note}\n${invoiceNote}` : invoiceNote)
            : existingInvoiceData.note
        });
        
        invoiceRef = { id: existingInvoiceId };
        showNotification('✅ تم إضافة المنتجات إلى الفاتورة الموجودة للعميل', 'success');
      } else {
        // لا توجد فاتورة موجودة - إنشاء فاتورة جديدة
        const invoiceData = {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || '',
          totalDebt: calculatedTotal,
          note: invoiceNote.trim() || '',
          shop,
          date: new Date(),
          items: invoiceItems,
        };

        invoiceRef = await addDoc(collection(db, 'invoices'), invoiceData);
        showNotification('✅ تم حفظ الفاتورة وإضافة المنتجات بنجاح', 'success');
      }

      // حفظ المنتجات في products وربطها بالفاتورة
      let currentCode = nextCode;
      const productPromises = invoiceItems.map(async (item) => {
        const productData =
          item.type === 'phone'
            ? {
                name: item.name,
                battery: item.battery || '0',
                storage: item.storage || '0',
                serial: item.serial || '0',
                box: item.box,
                tax: item.tax,
                quantity: item.quantity,
                buyPrice: item.buyPrice,
                sellPrice: item.sellPrice,
                type: 'phone',
                shop,
                code: currentCode++,
                date: new Date(),
                invoiceId: invoiceRef.id,
              }
            : {
                name: item.name,
                quantity: item.quantity,
                buyPrice: item.buyPrice,
                sellPrice: item.sellPrice,
                type: 'accessory',
                shop,
                code: currentCode++,
                date: new Date(),
                invoiceId: invoiceRef.id,
              };

        await addDoc(collection(db, 'products'), productData);
      });

      await Promise.all(productPromises);
      setNextCode(currentCode);

      showNotification('✅ تم حفظ الفاتورة وإضافة المنتجات بنجاح', 'success');

      // إعادة تعيين الحقول
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error adding invoice:', error);
      showNotification('❌ حدث خطأ أثناء حفظ الفاتورة', 'error');
    } finally {
      setIsSaving(false);
    }
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
            <h1 className={styles.pageTitle}>
              {mode === 'single' ? 'إضافة منتج جديد' : 'إنشاء فاتورة جديدة'}
            </h1>
          </div>

          <div className={styles.twoColumns}>
            {/* العمود الأيسر: نموذج الإضافة */}
            <div className={styles.leftColumn}>
              <div className={styles.formCard}>
            {/* Toggle للتبديل بين وضع إضافة منتج ووضع الفاتورة */}
            <div className={styles.typeToggle}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${mode === 'single' ? styles.active : ''}`}
                onClick={() => {
                  setMode('single');
                  setEditingInvoiceItemIndex(null);
                  setInvoiceItems([]);
                }}
              >
                إضافة منتج
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${mode === 'invoice' ? styles.active : ''}`}
                onClick={() => {
                  setMode('invoice');
                  setEditingProduct(null);
                }}
              >
                إنشاء فاتورة
              </button>
            </div>

            {mode === 'single' ? (
              <form onSubmit={handleSubmit} className={styles.form}>
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
            ) : (
              <form onSubmit={handleInvoiceSubmit} className={styles.form}>
                {/* بيانات الفاتورة (الهيدر) */}
                <div className={styles.fieldsGrid}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>اسم العميل *</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={styles.input}
                      placeholder="ادخل اسم العميل"
                      required
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>رقم الموبايل</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className={styles.input}
                      placeholder="ادخل رقم الموبايل"
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>ملاحظات</label>
                    <input
                      type="text"
                      value={invoiceNote}
                      onChange={(e) => setInvoiceNote(e.target.value)}
                      className={styles.input}
                      placeholder="أي ملاحظات إضافية"
                    />
                  </div>
                </div>

                {/* المنتجات داخل الفاتورة */}
                <h3 className={styles.sectionTitle}>منتجات الفاتورة</h3>

                {/* Toggle نوع المنتج لكل سطر */}
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
                      <label className={styles.label}>الكمية *</label>
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
                      <label className={styles.label}>سعر الجملة</label>
                      <input
                        type="number"
                        value={phoneBuyPrice}
                        onChange={(e) => setPhoneBuyPrice(e.target.value)}
                        className={styles.input}
                        placeholder="0.00"
                        step="0.01"
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
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>سعر الجملة</label>
                      <input
                        type="number"
                        value={accessoryBuyPrice}
                        onChange={(e) => setAccessoryBuyPrice(e.target.value)}
                        className={styles.input}
                        placeholder="0.00"
                        step="0.01"
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
                      />
                    </div>
                  </div>
                )}

                <div className={styles.submitSection}>
                  <button
                    type="button"
                    className={styles.secondaryBtn || styles.cancelBtn}
                    onClick={handleAddInvoiceItem}
                    disabled={isSaving}
                  >
                    {editingInvoiceItemIndex !== null ? 'تحديث السطر' : 'إضافة للسطور'}
                  </button>
                </div>

                {/* جدول سطور الفاتورة */}
                <div className={styles.invoiceItemsSection}>
                  {invoiceItems.length === 0 ? (
                    <p className={styles.emptyStateText}>لا توجد منتجات مضافة للفاتورة بعد</p>
                  ) : (
                    <div className={styles.productsGrid}>
                      {invoiceItems.map((item, index) => (
                        <div key={index} className={styles.productCard}>
                          <div className={styles.productInfo}>
                            <h3 className={styles.productName}>{item.name}</h3>
                            <p className={styles.productCode}>
                              النوع: {item.type === 'phone' ? 'موبايل' : 'أكسسوار'} - الكمية: {item.quantity}
                            </p>
                            <p className={styles.productCode}>سعر البيع: {item.sellPrice}</p>
                          </div>
                          <div className={styles.productActions}>
                            <button
                              type="button"
                              className={styles.editBtn}
                              onClick={() => handleEditInvoiceItem(index)}
                              title="تعديل السطر"
                            >
                              <HiOutlinePencil className={styles.actionIcon} />
                            </button>
                            <button
                              type="button"
                              className={styles.deleteBtn}
                              onClick={() => handleDeleteInvoiceItem(index)}
                              title="حذف السطر"
                            >
                              <HiOutlineTrash className={styles.actionIcon} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* عرض إجمالي الفاتورة المحسوب تلقائياً */}
                {invoiceItems.length > 0 && (
                  <div className={styles.invoiceTotalSection}>
                    <div className={styles.totalDisplay}>
                      <span className={styles.totalLabel}>إجمالي الفاتورة (من أسعار الجملة):</span>
                      <span className={styles.totalValue}>{calculateInvoiceTotal().toFixed(2)} جنيه</span>
                    </div>
                  </div>
                )}

                <div className={styles.submitSection}>
                  <button 
                    type="button" 
                    className={styles.cancelBtn}
                    onClick={resetForm}
                    disabled={isSaving}
                  >
                    إلغاء
                  </button>
                  <button type="submit" className={styles.submitBtn} disabled={isSaving}>
                    {isSaving ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
                  </button>
                </div>
              </form>
            )}
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

// Loading fallback component
function AddProductLoading() {
  return (
    <div className={styles.loading}>
      <p>جاري التحميل...</p>
    </div>
  );
}

// Main export with Suspense boundary for useSearchParams
export default function AddProduct() {
  return (
    <Suspense fallback={<AddProductLoading />}>
      <AddProductContent />
    </Suspense>
  );
}
