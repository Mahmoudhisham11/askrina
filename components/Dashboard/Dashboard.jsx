'use client';
import { useState, useEffect } from 'react';
import { db } from '@/app/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import styles from './styles.module.css';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import StatCard from './StatCard';
import Cart from './Cart';
import Invoices from './Invoices';

export default function Dashboard() {
  const [showStatistics, setShowStatistics] = useState(true);
  const [dailySales, setDailySales] = useState(0);
  const [dailyProfit, setDailyProfit] = useState(0);
  const [dailyExpenses, setDailyExpenses] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [netSales, setNetSales] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const shop = typeof window !== 'undefined' ? localStorage.getItem('shop') : '';

  // تنسيق الأرقام
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // جلب الإحصائيات (جميع البيانات بدون فلترة بالتاريخ)
  const fetchDailyStats = async () => {
    if (!shop) {
      setIsLoadingStats(false);
      return;
    }

    try {
      // جلب جميع الفواتير من sales collection
      let salesSnapshot;
      try {
        const salesQuery = query(
          collection(db, 'sales'),
          where('shop', '==', shop)
        );
        salesSnapshot = await getDocs(salesQuery);
      } catch (error) {
        console.error('Error fetching sales:', error);
        salesSnapshot = { docs: [] };
      }

      let totalSales = 0;
      let totalProfit = 0;

      salesSnapshot.forEach((doc) => {
        const data = doc.data();
        totalSales += data.total || 0;
        totalProfit += data.totalProfit || 0;
      });

      // جلب جميع المصاريف من expenses collection
      let totalExpenses = 0;
      let totalAmountExpenses = 0; // مصروفات المبلغ (تخصم من صافي المبيع)
      let totalProfitExpenses = 0; // مصروفات الربح (تخصم من صافي الربح)
      
      try {
        let expensesSnapshot;
        try {
          const expensesQuery = query(
            collection(db, 'expenses'),
            where('shop', '==', shop)
          );
          expensesSnapshot = await getDocs(expensesQuery);
        } catch (error) {
          console.error('Error fetching expenses:', error);
          expensesSnapshot = { docs: [] };
        }

        expensesSnapshot.forEach((doc) => {
          const data = doc.data();
          const amount = data.amount || 0;
          const description = data.description || '';
          
          totalExpenses += amount;
          
          // فصل مصروفات المبلغ عن مصروفات الربح بناءً على الوصف
          if (description.includes('(مبلغ)')) {
            totalAmountExpenses += amount;
          } else if (description.includes('(ربح)')) {
            totalProfitExpenses += amount;
          } else {
            // للمصاريف العادية (غير المرتجعات)، نضيفها لكلا النوعين
            totalAmountExpenses += amount;
            totalProfitExpenses += amount;
          }
        });
      } catch (error) {
        // إذا لم يكن collection موجوداً، تجاهل الخطأ
        console.log('Expenses collection not found or error:', error);
      }

      setDailySales(totalSales);
      setDailyProfit(totalProfit);
      setDailyExpenses(totalExpenses);
      setNetProfit(totalProfit - totalProfitExpenses);
      setNetSales(totalSales - totalAmountExpenses);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (shop) {
      fetchDailyStats();
      // إعادة جلب الإحصائيات كل دقيقة
      const interval = setInterval(() => {
        fetchDailyStats();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [shop]);

  // دالة لتحديث الإحصائيات بعد حفظ فاتورة جديدة
  const handleInvoiceSaved = () => {
    fetchDailyStats();
  };

  // إعداد الكروت
  const statCards = [
    {
      title: 'إجمالي المبيعات',
      value: showStatistics ? `${formatNumber(dailySales)} ج.م` : '***',
      trend: 'إجمالي',
      trendType: 'positive',
      icon: 'dollar-sign',
      change: null,
    },
    {
      title: 'صافي المبيع',
      value: showStatistics ? `${formatNumber(netSales)} ج.م` : '***',
      trend: 'إجمالي',
      trendType: netSales >= 0 ? 'positive' : 'negative',
      icon: 'trending-up',
      change: null,
    },
    {
      title: 'المصاريف',
      value: showStatistics ? `${formatNumber(dailyExpenses)} ج.م` : '***',
      trend: 'إجمالي',
      trendType: dailyExpenses > 0 ? 'negative' : 'positive',
      icon: 'expenses',
      change: null,
    },
    {
      title: 'صافي الربح',
      value: showStatistics ? `${formatNumber(netProfit)} ج.م` : '***',
      trend: 'إجمالي',
      trendType: netProfit >= 0 ? 'positive' : 'negative',
      icon: 'trending-up',
      change: null,
    },
  ];

  return (
    <div className={styles.dashboard}>
      <Topbar />
      <div className={styles.content}>
        <Sidebar activeNav="لوحة التحكم" />
        <main className={styles.main}>
          <div className={styles.header}>
            <h1 className={styles.pageTitle}>لوحة التحكم</h1>
            <div className={styles.controls}>
              <div className={styles.toggleContainer}>
                <span className={styles.toggleLabel}>إظهار الإحصائيات</span>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={showStatistics}
                    onChange={(e) => setShowStatistics(e.target.checked)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
          </div>

          <div className={styles.statCards}>
            {statCards.map((card, index) => (
              <StatCard 
                key={index} 
                {...card}
              />
            ))}
          </div>

          <div className={styles.invoicesSection}>
            <Invoices />
          </div>
        </main>
        <div className={styles.cartSidebar}>
          <Cart onInvoiceSaved={handleInvoiceSaved} />
        </div>
      </div>
    </div>
  );
}

