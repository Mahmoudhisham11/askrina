'use client';
import styles from './StatCard.module.css';
import { HiCurrencyDollar } from 'react-icons/hi';
import { HiOutlineShoppingBag } from 'react-icons/hi';
import { HiOutlineUsers } from 'react-icons/hi';
import { HiOutlineTrendingUp } from 'react-icons/hi';
import { HiOutlineMinusCircle } from 'react-icons/hi';
import { IoIosArrowUp } from 'react-icons/io';
import { IoIosArrowDown } from 'react-icons/io';
import { HiArrowUpRight } from 'react-icons/hi2';

const iconMap = {
  'dollar-sign': HiCurrencyDollar,
  'package': HiOutlineShoppingBag,
  'users': HiOutlineUsers,
  'trending-up': HiOutlineTrendingUp,
  'expenses': HiOutlineMinusCircle,
};

export default function StatCard({ title, value, trend, trendType, icon, change }) {
  const Icon = iconMap[icon] || HiOutlineDollar;
  const isPositive = trendType === 'positive';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.iconContainer} style={{ backgroundColor: isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
          <Icon className={styles.icon} style={{ color: isPositive ? '#22C55E' : '#EF4444' }} />
        </div>
        <button className={styles.arrowBtn}>
          <HiArrowUpRight className={styles.arrowIcon} />
        </button>
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.value}>{value}</p>
        <div className={styles.trend}>
          <div className={`${styles.trendIndicator} ${isPositive ? styles.positive : styles.negative}`}>
            {isPositive ? (
              <IoIosArrowUp className={styles.trendIcon} />
            ) : (
              <IoIosArrowDown className={styles.trendIcon} />
            )}
            <span className={styles.trendValue}>{trend}</span>
          </div>
          {change && (
            <span className={styles.change} style={{ color: isPositive ? '#22C55E' : '#EF4444' }}>
              {change}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

