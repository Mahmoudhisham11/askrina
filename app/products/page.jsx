'use client';
import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { db } from '@/app/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import JsBarcode from 'jsbarcode';
import { HiOutlinePrinter } from 'react-icons/hi2';
import styles from './styles.module.css';
import Topbar from '@/components/Dashboard/Topbar';
import Sidebar from '@/components/Dashboard/Sidebar';
import BarcodePrintContent from '@/components/BarcodePrintContent';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'phone' | 'accessory'
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [printProduct, setPrintProduct] = useState(null);
  const barcodeRef = useRef(null);

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
      
      // ترتيب حسب الكود تنازلياً
      productsList.sort((a, b) => {
        const codeA = a.code || 0;
        const codeB = b.code || 0;
        return codeB - codeA;
      });
      
      setProducts(productsList);
      setFilteredProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // جلب المنتجات عند تحميل الصفحة
  useEffect(() => {
    if (shop) {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  // تصفية المنتجات حسب النوع والبحث
  useEffect(() => {
    let filtered = [...products];

    // تصفية حسب النوع
    if (filterType !== 'all') {
      filtered = filtered.filter(product => product.type === filterType);
    }

    // تصفية حسب البحث
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => {
        const codeMatch = product.code?.toString().includes(searchQuery);
        const nameMatch = product.name?.toLowerCase().includes(query);
        return codeMatch || nameMatch;
      });
    }

    setFilteredProducts(filtered);
  }, [products, filterType, searchQuery]);

  // حساب الإحصائيات
  const calculateStats = () => {
    const totalBuyPrice = filteredProducts.reduce((sum, product) => {
      const buyPrice = product.buyPrice || 0;
      const quantity = product.quantity || 0;
      return sum + (buyPrice * quantity);
    }, 0);

    const totalQuantity = filteredProducts.reduce((sum, product) => {
      return sum + (product.quantity || 0);
    }, 0);

    const totalSellPrice = filteredProducts.reduce((sum, product) => {
      const sellPrice = product.sellPrice || 0;
      const quantity = product.quantity || 0;
      return sum + (sellPrice * quantity);
    }, 0);

    return {
      totalBuyPrice,
      totalQuantity,
      totalSellPrice
    };
  };

  const stats = calculateStats();

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

  // فتح نافذة طباعة الباركود
  const handlePrintBarcode = (product) => {
    setPrintProduct(product);
  };

  // طباعة الباركود
  const handlePrint = () => {
    if (!printProduct || typeof window === 'undefined') return;

    // إنشاء عنصر طباعة منفصل مباشرة في document.body
    const printRoot = document.createElement('div');
    printRoot.className = 'barcode-print-root';
    document.body.appendChild(printRoot);

    // Render المكون في العنصر المنفصل
    const root = createRoot(printRoot);
    root.render(
      <BarcodePrintContent 
        product={printProduct} 
        formatNumber={formatNumber}
      />
    );

    // انتظار render ثم توليد الباركود ثم الطباعة
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // استدعاء window.print
        window.print();
        
        // Cleanup بعد الطباعة
        setTimeout(() => {
          try {
            // Unmount الـ React root أولاً
            if (root) {
              root.unmount();
            }
            
            // التحقق من أن العنصر موجود في DOM قبل محاولة إزالته
            if (printRoot && typeof window !== 'undefined' && document.body.contains(printRoot)) {
              printRoot.remove();
            }
          } catch (error) {
            console.error('Error cleaning up print root:', error);
            // محاولة إزالة العنصر بطريقة بديلة فقط إذا كان موجوداً
            if (printRoot && typeof window !== 'undefined' && document.body.contains(printRoot)) {
              try {
                printRoot.remove();
              } catch (e) {
                // العنصر تم إزالته بالفعل أو غير موجود
                console.warn('Print root already removed or not found');
              }
            }
          }
        }, 100);
      });
    });
  };

  // إغلاق نافذة الطباعة
  const handleClosePrint = () => {
    setPrintProduct(null);
  };

  // توليد الباركود للعرض في modal (ليس للطباعة)
  useEffect(() => {
    if (printProduct && barcodeRef.current) {
      // مسح الباركود السابق
      barcodeRef.current.innerHTML = '';
      
      // استخدام requestAnimationFrame لضمان أن DOM جاهز
      requestAnimationFrame(() => {
        try {
          JsBarcode(barcodeRef.current, printProduct.code.toString(), {
            format: 'CODE128',
            width: 1,
            height: 30,
            displayValue: false,
            margin: 3,
            textAlign: 'center',
            textPosition: 'bottom'
          });
        } catch (error) {
          console.error('Error generating barcode:', error);
        }
      });
    }
  }, [printProduct]);

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
            <h1 className={styles.pageTitle}>المنتجات</h1>
          </div>

          {/* كروت الإحصائيات */}
          <div className={styles.statsCards}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                💰
              </div>
              <div className={styles.statInfo}>
                <h3 className={styles.statTitle}>إجمالي سعر الجملة</h3>
                <p className={styles.statValue}>{formatNumber(stats.totalBuyPrice)} ج.م</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }}>
                📦
              </div>
              <div className={styles.statInfo}>
                <h3 className={styles.statTitle}>إجمالي عدد القطع</h3>
                <p className={styles.statValue}>{stats.totalQuantity.toLocaleString('en-US')} قطعة</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                💵
              </div>
              <div className={styles.statInfo}>
                <h3 className={styles.statTitle}>إجمالي سعر البيع</h3>
                <p className={styles.statValue}>{formatNumber(stats.totalSellPrice)} ج.م</p>
              </div>
            </div>
          </div>

          {/* Toggle والبحث */}
          <div className={styles.filtersSection}>
            <div className={styles.typeToggle}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${filterType === 'all' ? styles.active : ''}`}
                onClick={() => setFilterType('all')}
              >
                الكل
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${filterType === 'phone' ? styles.active : ''}`}
                onClick={() => setFilterType('phone')}
              >
                موبايلات
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${filterType === 'accessory' ? styles.active : ''}`}
                onClick={() => setFilterType('accessory')}
              >
                أكسسوارات
              </button>
        </div>

            <div className={styles.searchSection}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
                placeholder="ابحث بكود أو اسم المنتج..."
              />
            </div>
          </div>

          {/* جدول المنتجات */}
          <div className={styles.tableContainer}>
            <table className={styles.productsTable}>
              <thead>
                <tr>
                  {filterType === 'phone' ? (
                    <>
                      <th>الكود</th>
                      <th>اسم المنتج</th>
                      <th>البطارية</th>
                      <th>المساحة</th>
                      <th>السريال</th>
                      <th>بكرتونة</th>
                      <th>الضريبة</th>
                      <th>الكمية</th>
                      <th>سعر الجملة</th>
                      <th>سعر البيع</th>
                      <th>التاريخ</th>
                      <th>طباعة</th>
                    </>
                  ) : (
                    <>
                  <th>الكود</th>
                      <th>اسم المنتج</th>
                      <th>النوع</th>
                      <th>سعر الجملة</th>
                  <th>سعر البيع</th>
                  <th>الكمية</th>
                  <th>التاريخ</th>
                      <th>طباعة</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={filterType === 'phone' ? 12 : 8} className={styles.emptyRow}>
                      لا توجد منتجات
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id}>
                      {filterType === 'phone' ? (
                        <>
                          <td className={styles.numberCell}>{product.code || 'غير محدد'}</td>
                          <td className={styles.productNameCell}>{product.name || 'غير محدد'}</td>
                          <td className={styles.numberCell}>{product.battery || '-'}</td>
                          <td className={styles.numberCell}>{product.storage || '-'}</td>
                          <td className={styles.serialCell}>{product.serial || '-'}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${product.box ? styles.yes : styles.no}`}>
                              {product.box ? 'نعم' : 'لا'}
                            </span>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${product.tax ? styles.tax : styles.paid}`}>
                              {product.tax ? 'بضريبة' : 'مدفوع'}
                            </span>
                          </td>
                          <td className={styles.numberCell}>{product.quantity || 0}</td>
                          <td className={styles.priceCell}>{formatNumber(product.buyPrice || 0)} ج.م</td>
                          <td className={styles.priceCell}>{formatNumber(product.sellPrice || 0)} ج.م</td>
                          <td>{formatDate(product.date)}</td>
                          <td>
                            <button
                              className={styles.printBtn}
                              onClick={() => handlePrintBarcode(product)}
                              title="طباعة الباركود"
                            >
                              <HiOutlinePrinter className={styles.printIcon} />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={styles.numberCell}>{product.code || 'غير محدد'}</td>
                          <td className={styles.productNameCell}>{product.name || 'غير محدد'}</td>
                          <td>
                            <span className={`${styles.typeBadge} ${styles[product.type]}`}>
                              {product.type === 'phone' ? 'موبايل' : 'أكسسوار'}
                            </span>
                          </td>
                          <td className={styles.priceCell}>{formatNumber(product.buyPrice || 0)} ج.م</td>
                          <td className={styles.priceCell}>{formatNumber(product.sellPrice || 0)} ج.م</td>
                          <td className={styles.numberCell}>{product.quantity || 0}</td>
                          <td>{formatDate(product.date)}</td>
                          <td>
                            <button
                              className={styles.printBtn}
                              onClick={() => handlePrintBarcode(product)}
                              title="طباعة الباركود"
                            >
                              <HiOutlinePrinter className={styles.printIcon} />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
        </div>

      {/* نافذة طباعة الباركود */}
      {printProduct && (
        <div className={`${styles.printModal} barcode-print-modal`}>
          <div className={styles.printContent}>
            <div className={styles.printHeader}>
              <h2>طباعة الباركود</h2>
              <div className={styles.printActions}>
                <button 
                  className={styles.printButton} 
                  onClick={handlePrint}
                >
                  طباعة
                </button>
                <button className={styles.closeButton} onClick={handleClosePrint}>
                  إغلاق
                </button>
              </div>
            </div>
            
            <div className={styles.barcodeContainer}>
              <div className={styles.barcodeLabel}>
                {printProduct.name || 'غير محدد'}
              </div>
              
              <div className={styles.barcodeCode}>
                {printProduct.code?.toString() || '-'}
              </div>
              
              <svg ref={barcodeRef} className={styles.barcode}></svg>
              
              <div className={styles.barcodePrice}>
                {formatNumber(printProduct.sellPrice || 0)} ج.م
              </div>
            </div>
          </div>
          </div>
        )}
    </div>
  );
}

