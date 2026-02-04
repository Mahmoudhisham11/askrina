'use client';
import { useState } from 'react';
import styles from './FavoriteProducts.module.css';
import { HiOutlineStar } from 'react-icons/hi';
import { HiOutlineSearch } from 'react-icons/hi';

const products = [
  {
    id: 1,
    name: 'برجر كلاسيكي',
    category: 'أطعمة',
    orders: 250,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100&h=100&fit=crop',
  },
  {
    id: 2,
    name: 'كابتشينو بالبندق',
    category: 'قهوة',
    orders: 225,
    image: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=100&h=100&fit=crop',
  },
  {
    id: 3,
    name: 'كيك الشوكولاتة',
    category: 'حلويات',
    orders: 180,
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=100&h=100&fit=crop',
  },
  {
    id: 4,
    name: 'عصير الفراولة والموز',
    category: 'عصائر',
    orders: 120,
    image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=100&h=100&fit=crop',
  },
  {
    id: 5,
    name: 'أجنحة الدجاج الحارة',
    category: 'وجبات خفيفة',
    orders: 96,
    image: 'https://images.unsplash.com/photo-1527477396000-e27137b2a0b8?w=100&h=100&fit=crop',
  },
];

export default function FavoriteProducts() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <HiOutlineStar className={styles.titleIcon} />
          <h2 className={styles.title}>المنتجات المفضلة</h2>
        </div>
        <div className={styles.searchContainer}>
          <HiOutlineSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="بحث"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.productList}>
        {filteredProducts.map((product) => (
          <div key={product.id} className={styles.productItem}>
            <div className={styles.productImage}>
              <img src={product.image} alt={product.name} />
            </div>
            <div className={styles.productInfo}>
              <h3 className={styles.productName}>{product.name}</h3>
              <div className={styles.productMeta}>
                <span className={styles.categoryTag}>{product.category}</span>
                <span className={styles.orderCount}>{product.orders} مرة</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

