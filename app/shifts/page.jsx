'use client';
import { useState, useEffect } from 'react';
import { db } from '@/app/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { HiOutlineCalendar } from 'react-icons/hi';
import { HiOutlineEye } from 'react-icons/hi';
import styles from './styles.module.css';
import Topbar from '@/components/Dashboard/Topbar';
import Sidebar from '@/components/Dashboard/Sidebar';

export default function Shifts() {
  const [selectedDate, setSelectedDate] = useState('');
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalSales, setTotalSales] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalProfitAmount, setTotalProfitAmount] = useState(0); // إجمالي الربح قبل خصم المصاريف
  const [viewMode, setViewMode] = useState('sales'); // 'sales' or 'expenses'
  const [selectedSale, setSelectedSale] = useState(null);
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'cash', 'wallet'
  const [filteredSales, setFilteredSales] = useState([]);
  const [filteredTotalSales, setFilteredTotalSales] = useState(0);
  const [filteredTotalProfit, setFilteredTotalProfit] = useState(0);

  const shop = typeof window !== 'undefined' ? localStorage.getItem('shop') : '';

  // تحويل Date إلى string للـ input type="date"
  const getDateString = (date) => {
    if (!date) return '';
    try {
      let dateObj;
      if (date.toDate) {
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        dateObj = new Date(date);
      }
      const year = dateObj.getFullYear();
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const day = dateObj.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      return '';
    }
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
        dateObj = new Date(date);
      }
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'غير محدد';
    }
  };

  // تنسيق التاريخ مع الوقت
  const formatDateTime = (date) => {
    if (!date) return 'غير محدد';
    try {
      let dateObj;
      if (date.toDate) {
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

  // تنسيق الأرقام
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // فتح modal عرض تفاصيل الفاتورة
  const handleViewSale = (sale) => {
    setSelectedSale(sale);
  };

  // إغلاق modal
  const handleCloseModal = () => {
    setSelectedSale(null);
  };

  // جلب التواريخ المتاحة من reports
  const fetchAvailableDates = async () => {
    if (!shop) return [];

    try {
      const q = query(collection(db, 'reports'), where('shop', '==', shop));
      const snapshot = await getDocs(q);
      
      const datesSet = new Set();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
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
          return;
        }
        
        const dateString = getDateString(invoiceDate);
        if (dateString) {
          datesSet.add(dateString);
        }
      });

      const datesArray = Array.from(datesSet).sort().reverse(); // الأحدث أولاً
      setAvailableDates(datesArray);
      
      // تحديد آخر تاريخ كافتراضي
      if (datesArray.length > 0 && !selectedDate) {
        setSelectedDate(datesArray[0]);
      }
      
      return datesArray;
    } catch (error) {
      console.error('Error fetching available dates:', error);
      return [];
    }
  };

  // جلب بيانات الوردية لتاريخ معين
  const fetchShiftData = async (dateString) => {
    if (!shop || !dateString) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // حساب بداية ونهاية اليوم
      const selectedDateObj = new Date(dateString);
      selectedDateObj.setHours(0, 0, 0, 0);
      const nextDay = new Date(selectedDateObj);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayStart = Timestamp.fromDate(selectedDateObj);
      const dayEnd = Timestamp.fromDate(nextDay);

      // جلب المبيعات
      let salesSnapshot;
      try {
        const salesQuery = query(
          collection(db, 'reports'),
          where('shop', '==', shop),
          where('date', '>=', dayStart),
          where('date', '<', dayEnd)
        );
        salesSnapshot = await getDocs(salesQuery);
      } catch (error) {
        // إذا فشل الاستعلام، جلب جميع المبيعات وتصفيتها يدوياً
        const salesQuery = query(
          collection(db, 'reports'),
          where('shop', '==', shop)
        );
        salesSnapshot = await getDocs(salesQuery);
      }

      const salesList = [];
      let salesTotal = 0;
      let profitTotal = 0;

      salesSnapshot.forEach((doc) => {
        const data = doc.data();
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
          return;
        }

        // التحقق من أن التاريخ ضمن اليوم المحدد
        if (invoiceDate >= selectedDateObj && invoiceDate < nextDay) {
          salesList.push({
            id: doc.id,
            ...data
          });
          salesTotal += data.total || 0;
          profitTotal += data.totalProfit || 0;
        }
      });

      // ترتيب المبيعات حسب التاريخ (الأحدث أولاً)
      salesList.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate().getTime() : (a.date?.getTime ? a.date.getTime() : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0));
        const dateB = b.date?.toDate ? b.date.toDate().getTime() : (b.date?.getTime ? b.date.getTime() : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0));
        return dateB - dateA;
      });

      setSales(salesList);
      setTotalSales(salesTotal);
      setTotalProfitAmount(profitTotal);

      // جلب المصاريف
      let expensesSnapshot;
      try {
        const expensesQuery = query(
          collection(db, 'expensesReports'),
          where('shop', '==', shop),
          where('date', '>=', dayStart),
          where('date', '<', dayEnd)
        );
        expensesSnapshot = await getDocs(expensesQuery);
      } catch (error) {
        // إذا فشل الاستعلام، جلب جميع المصاريف وتصفيتها يدوياً
        const expensesQuery = query(
          collection(db, 'expensesReports'),
          where('shop', '==', shop)
        );
        expensesSnapshot = await getDocs(expensesQuery);
      }

      const expensesList = [];
      let expensesTotal = 0;

      expensesSnapshot.forEach((doc) => {
        const data = doc.data();
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
          return;
        }

        // التحقق من أن التاريخ ضمن اليوم المحدد
        if (expenseDate >= selectedDateObj && expenseDate < nextDay) {
          expensesList.push({
            id: doc.id,
            ...data
          });
          expensesTotal += data.amount || 0;
        }
      });

      // ترتيب المصاريف حسب التاريخ (الأحدث أولاً)
      expensesList.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate().getTime() : (a.date?.getTime ? a.date.getTime() : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0));
        const dateB = b.date?.toDate ? b.date.toDate().getTime() : (b.date?.getTime ? b.date.getTime() : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0));
        return dateB - dateA;
      });

      setExpenses(expensesList);
      setTotalExpenses(expensesTotal);
      setTotalProfit(profitTotal - expensesTotal);
    } catch (error) {
      console.error('Error fetching shift data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // جلب التواريخ المتاحة عند تحميل الصفحة
  useEffect(() => {
    if (shop) {
      fetchAvailableDates().then((dates) => {
        // بعد جلب التواريخ، جلب بيانات آخر تاريخ
        if (dates.length > 0) {
          fetchShiftData(dates[0]);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  // جلب بيانات الوردية عند تغيير التاريخ
  useEffect(() => {
    if (selectedDate && shop) {
      fetchShiftData(selectedDate);
      setPaymentFilter('all'); // إعادة تعيين الفلترة عند تغيير التاريخ
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // فلترة المبيعات حسب طريقة الدفع
  useEffect(() => {
    let filtered = sales;
    
    if (paymentFilter === 'cash') {
      filtered = sales.filter(sale => sale.paymentMethod === 'cash');
    } else if (paymentFilter === 'wallet') {
      filtered = sales.filter(sale => sale.paymentMethod === 'wallet');
    }

    setFilteredSales(filtered);

    // حساب الإجماليات من المبيعات المفلترة
    let filteredSalesTotal = 0;
    let filteredProfitTotal = 0;

    filtered.forEach(sale => {
      filteredSalesTotal += sale.total || 0;
      filteredProfitTotal += sale.totalProfit || 0;
    });

    setFilteredTotalSales(filteredSalesTotal);
    setFilteredTotalProfit(filteredProfitTotal);
  }, [sales, paymentFilter]);

  if (isLoading && !selectedDate) {
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
            <h1 className={styles.pageTitle}>الورديات</h1>
          </div>

          {/* Date Picker */}
          <div className={styles.datePickerSection}>
            <label className={styles.dateLabel}>
              <HiOutlineCalendar className={styles.dateIcon} />
              <span>اختر تاريخ الوردية:</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={styles.dateInput}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Summary Cards */}
          {selectedDate && (
            <div className={styles.summaryCards}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryCardHeader}>
                  <span className={styles.summaryCardTitle}>إجمالي المبيع</span>
                </div>
                <div className={styles.summaryCardValue}>{formatNumber(paymentFilter === 'all' ? totalSales : filteredTotalSales)} ج.م</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryCardHeader}>
                  <span className={styles.summaryCardTitle}>إجمالي المصاريف</span>
                </div>
                <div className={styles.summaryCardValue}>{formatNumber(totalExpenses)} ج.م</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryCardHeader}>
                  <span className={styles.summaryCardTitle}>صافي المبيع</span>
                </div>
                <div className={styles.summaryCardValue}>
                  {formatNumber((paymentFilter === 'all' ? totalSales : filteredTotalSales) - totalExpenses)} ج.م
                </div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryCardHeader}>
                  <span className={styles.summaryCardTitle}>صافي الربح</span>
                </div>
                <div className={`${styles.summaryCardValue} ${styles.profitValue}`}>
                  {formatNumber((paymentFilter === 'all' ? totalProfitAmount : filteredTotalProfit) - totalExpenses)} ج.م
                </div>
              </div>
            </div>
          )}

          {/* View Toggle */}
          {selectedDate && (
            <div className={styles.viewToggleSection}>
              <div className={styles.typeToggle}>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${viewMode === 'sales' ? styles.active : ''}`}
                  onClick={() => setViewMode('sales')}
                >
                  المبيعات ({filteredSales.length})
                </button>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${viewMode === 'expenses' ? styles.active : ''}`}
                  onClick={() => setViewMode('expenses')}
                >
                  المصاريف ({expenses.length})
                </button>
              </div>
            </div>
          )}

          {/* Sales Section */}
          {selectedDate && viewMode === 'sales' && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>المبيعات</h2>
                <div className={styles.filterContainer}>
                  <label className={styles.filterLabel}>فلترة حسب طريقة الدفع:</label>
                  <select
                    className={styles.filterSelect}
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                  >
                    <option value="all">الكل</option>
                    <option value="cash">كاش</option>
                    <option value="wallet">محفظة</option>
                  </select>
                </div>
              </div>
              {filteredSales.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>لا توجد مبيعات في هذا التاريخ</p>
                </div>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.shiftsTable}>
                    <thead>
                      <tr>
                        <th>رقم الفاتورة</th>
                        <th>اسم العميل</th>
                        <th>طريقة الدفع</th>
                        <th>الإجمالي</th>
                        <th>الربح</th>
                        <th>التاريخ</th>
                        <th>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.map((sale) => (
                        <tr key={sale.id}>
                          <td className={styles.numberCell}>{sale.invoiceNumber || 'غير محدد'}</td>
                          <td>{sale.customerName || 'عميل نقدي'}</td>
                          <td>{sale.paymentMethod === 'cash' ? 'كاش' : 'محفظة'}</td>
                          <td className={styles.priceCell}>{formatNumber(sale.total || 0)} ج.م</td>
                          <td className={styles.priceCell}>{formatNumber(sale.totalProfit || 0)} ج.م</td>
                          <td>{formatDateTime(sale.date || sale.createdAt)}</td>
                          <td>
                            <button
                              className={styles.viewBtn}
                              onClick={() => handleViewSale(sale)}
                              title="عرض الفاتورة"
                            >
                              <HiOutlineEye className={styles.viewIcon} />
                              <span>عرض</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Expenses Section */}
          {selectedDate && viewMode === 'expenses' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>المصاريف</h2>
              {expenses.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>لا توجد مصاريف في هذا التاريخ</p>
                </div>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.shiftsTable}>
                    <thead>
                      <tr>
                        <th>الوصف</th>
                        <th>المبلغ</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense) => (
                        <tr key={expense.id}>
                          <td>{expense.description || 'غير محدد'}</td>
                          <td className={styles.priceCell}>{formatNumber(expense.amount || 0)} ج.م</td>
                          <td>{formatDateTime(expense.date || expense.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!selectedDate && availableDates.length === 0 && (
            <div className={styles.emptyState}>
              <p>لا توجد ورديات مسجلة</p>
            </div>
          )}

          {/* Modal عرض تفاصيل الفاتورة */}
          {selectedSale && (
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
                    <h4 className={styles.modalSectionTitle}>معلومات العميل</h4>
                    <div className={styles.infoGrid}>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>اسم العميل:</span>
                        <span className={styles.infoValue}>{selectedSale.customerName || 'غير محدد'}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>رقم الموبايل:</span>
                        <span className={styles.infoValue}>{selectedSale.customerPhone || 'غير محدد'}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>طريقة الدفع:</span>
                        <span className={styles.infoValue}>
                          {selectedSale.paymentMethod === 'wallet' ? 'محفظة' : 'نقدي'}
                        </span>
                      </div>
                      {selectedSale.paymentMethod === 'wallet' && selectedSale.walletNumber && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>رقم المحفظة:</span>
                          <span className={styles.infoValue}>{selectedSale.walletNumber}</span>
                        </div>
                      )}
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>رقم الفاتورة:</span>
                        <span className={styles.infoValue}>{selectedSale.invoiceNumber || 'غير محدد'}</span>
                      </div>
                    </div>
                  </div>

                  {/* المنتجات */}
                  <div className={styles.modalSection}>
                    <h4 className={styles.modalSectionTitle}>المنتجات</h4>
                    <div className={styles.itemsTableContainer}>
                      <div className={styles.itemsTable}>
                        <div className={styles.tableHeader}>
                          <div className={styles.tableCell}>اسم المنتج</div>
                          <div className={styles.tableCell}>الكود</div>
                          <div className={styles.tableCell}>الكمية</div>
                          <div className={styles.tableCell}>سعر الوحدة</div>
                          <div className={styles.tableCell}>الخصم</div>
                          <div className={styles.tableCell}>الإجمالي</div>
                        </div>
                        {selectedSale.items && Array.isArray(selectedSale.items) && selectedSale.items.length > 0 ? (
                          selectedSale.items.map((item, index) => (
                            <div key={index} className={styles.tableRow}>
                              <div className={styles.tableCell}>{item.productName || 'غير محدد'}</div>
                              <div className={styles.tableCell}>{item.productCode || '-'}</div>
                              <div className={styles.tableCell}>{item.quantity || 0}</div>
                              <div className={styles.tableCell}>{formatNumber(item.unitPrice || 0)} ج.م</div>
                              <div className={styles.tableCell}>{formatNumber(item.itemDiscount || 0)} ج.م</div>
                              <div className={styles.tableCell}>{formatNumber(item.totalPrice || 0)} ج.م</div>
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
                    <h4 className={styles.modalSectionTitle}>الملخص</h4>
                    <div className={styles.summaryGrid}>
                      <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>الإجمالي الفرعي:</span>
                        <span className={styles.summaryValue}>{formatNumber(selectedSale.subtotal || 0)} ج.م</span>
                      </div>
                      {selectedSale.items && selectedSale.items.some(item => (item.itemDiscount || 0) > 0) && (
                        <div className={styles.summaryItem}>
                          <span className={styles.summaryLabel}>إجمالي الخصومات:</span>
                          <span className={styles.summaryValue}>
                            {formatNumber(
                              selectedSale.items.reduce((sum, item) => sum + (item.itemDiscount || 0) * (item.quantity || 0), 0)
                            )} ج.م
                          </span>
                        </div>
                      )}
                      <div className={`${styles.summaryItem} ${styles.totalItem}`}>
                        <span className={styles.summaryLabel}>الإجمالي النهائي:</span>
                        <span className={styles.summaryValue}>{formatNumber(selectedSale.total || 0)} ج.م</span>
                      </div>
                      <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>إجمالي الربح:</span>
                        <span className={styles.summaryValue} style={{ color: 'var(--success)' }}>
                          {formatNumber(selectedSale.totalProfit || 0)} ج.م
                        </span>
                      </div>
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
        </main>
      </div>
    </div>
  );
}

