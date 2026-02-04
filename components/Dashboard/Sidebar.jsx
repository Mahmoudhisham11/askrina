'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';
import { HiOutlineViewGrid } from 'react-icons/hi';
import { HiOutlineCube } from 'react-icons/hi';
import { HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi';
import { HiOutlineMinusCircle } from 'react-icons/hi';
import { HiOutlineCalendar } from 'react-icons/hi';
import { HiOutlinePlus } from 'react-icons/hi2';
import { HiOutlineListBullet } from 'react-icons/hi2';
import { HiOutlineArrowUturnLeft } from 'react-icons/hi2';
import { HiOutlineChartBar } from 'react-icons/hi2';

export default function Sidebar({ activeNav = 'لوحة التحكم' }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // الاستماع لحدث فتح/إغلاق Sidebar
  useEffect(() => {
    const handleSidebarToggle = (event) => {
      setIsOpen(event.detail);
    };

    window.addEventListener('sidebarToggle', handleSidebarToggle);
    return () => window.removeEventListener('sidebarToggle', handleSidebarToggle);
  }, []);

  // فتح القائمة المنسدلة تلقائياً إذا كان المستخدم في صفحة منتجات
  useEffect(() => {
    if (pathname === '/add-product' || pathname === '/products') {
      setIsProductsOpen(true);
    }
  }, [pathname]);

  const closeSidebar = () => {
    if (window.innerWidth <= 1024) {
      setIsOpen(false);
      window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: false }));
    }
  };

  const handleDashboardClick = () => {
    router.push('/');
    closeSidebar();
  };

  const handleAddProductClick = () => {
    router.push('/add-product');
    setIsProductsOpen(false);
    closeSidebar();
  };

  const handleViewProductsClick = () => {
    router.push('/products');
    setIsProductsOpen(false);
    closeSidebar();
  };

  const handleExpensesClick = () => {
    router.push('/expenses');
    closeSidebar();
  };

  const handleShiftsClick = () => {
    router.push('/shifts');
    closeSidebar();
  };

  const handleReturnsClick = () => {
    router.push('/returns');
    closeSidebar();
  };

  const handleReportsClick = () => {
    router.push('/reports');
    closeSidebar();
  };

  // التحقق من أن الصفحة الحالية هي صفحة منتجات
  const isProductsPage = pathname === '/add-product' || pathname === '/products';

  return (
    <>
      {/* Overlay للموبايل */}
      <div 
        className={`${styles.overlay} ${isOpen ? styles.show : ''}`}
        onClick={() => {
          setIsOpen(false);
          window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: false }));
        }}
      />
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      {/* لوحة التحكم */}
      <button
        className={`${styles.navItem} ${pathname === '/' ? styles.active : ''}`}
        onClick={handleDashboardClick}
      >
        <HiOutlineViewGrid className={styles.navIcon} />
        <span>لوحة التحكم</span>
      </button>

      {/* المنتجات مع قائمة منسدلة */}
      <div className={styles.dropdownContainer}>
        <button
          className={`${styles.navItem} ${styles.dropdownToggle} ${isProductsPage ? styles.active : ''}`}
          onClick={() => setIsProductsOpen(!isProductsOpen)}
        >
          <HiOutlineCube className={styles.navIcon} />
          <span>المنتجات</span>
          {isProductsOpen ? (
            <HiOutlineChevronUp className={styles.dropdownIcon} />
          ) : (
            <HiOutlineChevronDown className={styles.dropdownIcon} />
          )}
        </button>

        {isProductsOpen && (
          <div className={styles.dropdownMenu}>
            <button
              className={`${styles.dropdownItem} ${pathname === '/add-product' ? styles.active : ''}`}
              onClick={handleAddProductClick}
            >
              <HiOutlinePlus className={styles.dropdownItemIcon} />
              <span>إضافة منتج</span>
            </button>
            <button
              className={`${styles.dropdownItem} ${pathname === '/products' ? styles.active : ''}`}
              onClick={handleViewProductsClick}
            >
              <HiOutlineListBullet className={styles.dropdownItemIcon} />
              <span>عرض المنتجات</span>
            </button>
          </div>
        )}
      </div>

      {/* المصاريف */}
      <button
        className={`${styles.navItem} ${pathname === '/expenses' ? styles.active : ''}`}
        onClick={handleExpensesClick}
      >
        <HiOutlineMinusCircle className={styles.navIcon} />
        <span>المصاريف</span>
      </button>

      {/* الورديات */}
      <button
        className={`${styles.navItem} ${pathname === '/shifts' ? styles.active : ''}`}
        onClick={handleShiftsClick}
      >
        <HiOutlineCalendar className={styles.navIcon} />
        <span>الورديات</span>
      </button>

      {/* المرتجعات */}
      <button
        className={`${styles.navItem} ${pathname === '/returns' ? styles.active : ''}`}
        onClick={handleReturnsClick}
      >
        <HiOutlineArrowUturnLeft className={styles.navIcon} />
        <span>المرتجعات</span>
      </button>

      {/* التقارير */}
      <button
        className={`${styles.navItem} ${pathname === '/reports' ? styles.active : ''}`}
        onClick={handleReportsClick}
      >
        <HiOutlineChartBar className={styles.navIcon} />
        <span>التقارير</span>
      </button>
    </aside>
    </>
  );
}

