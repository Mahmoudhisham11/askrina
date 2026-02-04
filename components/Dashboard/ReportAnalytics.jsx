'use client';
import { useState } from 'react';
import styles from './ReportAnalytics.module.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { HiOutlineChartBar } from 'react-icons/hi';
import { HiOutlineCalendar } from 'react-icons/hi';

const chartData = [
  { day: 'الاثنين', value: 450, avg: 450 },
  { day: 'الأربعاء', value: 320, avg: 320 },
  { day: 'الثلاثاء', value: 380, avg: 380 },
  { day: 'الخميس', value: 420, avg: 420 },
  { day: 'الجمعة', value: 25000, avg: 250 },
  { day: 'السبت', value: 480, avg: 480 },
  { day: 'الأحد', value: 350, avg: 350 },
];

const categories = ['الكل', 'أطعمة', 'حلويات', 'مشروبات', 'وجبات خفيفة', 'معجنات'];

export default function ReportAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('أسبوعي');
  const [selectedCategory, setSelectedCategory] = useState('الكل');

  const CustomBar = (props) => {
    const { x, y, width, height, payload } = props;
    const isFriday = payload.day === 'الجمعة';
    const isSaturday = payload.day === 'السبت';
    
    return (
      <g>
        <defs>
          <pattern id={`diagonalHatch-${payload.day}`} patternUnits="userSpaceOnUse" width="4" height="4">
            <path d="M 0,4 l 4,-4" stroke="#94A3B8" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={isFriday ? '#3B82F6' : '#E5E7EB'}
          rx={8}
          ry={8}
        />
        {!isFriday && (
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={`url(#diagonalHatch-${payload.day})`}
            rx={8}
            ry={8}
          />
        )}
        {isSaturday && (
          <ellipse
            cx={x + width / 2}
            cy={y - 10}
            rx={width / 2 + 10}
            ry={8}
            fill="rgba(148, 163, 184, 0.2)"
          />
        )}
      </g>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <HiOutlineChartBar className={styles.titleIcon} />
          <h2 className={styles.title}>تحليلات التقارير</h2>
        </div>
        <div className={styles.periodSelector}>
          <HiOutlineCalendar className={styles.calendarIcon} />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className={styles.select}
          >
            <option value="أسبوعي">أسبوعي</option>
            <option value="شهري">شهري</option>
          </select>
        </div>
      </div>
      
      <div className={styles.categoryFilters}>
        {categories.map((category) => (
          <button
            key={category}
            className={`${styles.categoryBtn} ${selectedCategory === category ? styles.active : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="day"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--border)' }}
              domain={[0, 50000]}
              ticks={[0, 5000, 10000, 20000, 50000]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
              }}
              formatter={(value) => `$${value.toLocaleString()}`}
            />
            <Bar dataKey="value" shape={<CustomBar />} />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="var(--text-secondary)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>المبلغ</span>
          <span className={styles.summaryValue}>$17,879.00</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>النمو</span>
          <span className={styles.summaryValue} style={{ color: '#22C55E' }}>+$7.879</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>نسبة النمو</span>
          <span className={styles.summaryValue} style={{ color: '#22C55E' }}>17.00%</span>
        </div>
      </div>
    </div>
  );
}

