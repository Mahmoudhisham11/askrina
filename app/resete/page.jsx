'use client';
import { useEffect, useState } from "react";
import styles from "./styles.module.css";
import Image from "next/image";
import resetImage from "../../public/images/logo.png";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react"; // ✅ استيراد مكتبة QRCode

function Resete() {
  const router = useRouter();
  const [invoice, setInvoice] = useState(null);

  // ✅ نجيب التاريخ الحالي
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const lastInvoice = localStorage.getItem("lastInvoice");
    if (lastInvoice) setInvoice(JSON.parse(lastInvoice));

    // ✅ صياغة التاريخ
    const today = new Date();
    const formattedDate = today.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    setCurrentDate(formattedDate);
  }, []);

  const handlePrint = () => {
    if (!invoice) { 
      alert("لا توجد فاتورة للطباعة."); 
      return; 
    }
    window.print();
  };

  if (!invoice) return <div className={styles.resete}><p>لا توجد فاتورة لعرضها.</p></div>;

  return (
    <div className={`${styles.resete} invoice-print-root`}>
      <div className={styles.title}>
        <button onClick={() => router.push('/')} className={styles.btnBack}>رجوع</button>
        <h2>اسكرينا</h2>
        <div className={styles.imageContainer}>
          <Image src={resetImage} fill style={{ objectFit: 'cover' }} alt="logo" />
        </div>
      </div>

      {/* عرض الفاتورة على الشاشة */}
      <div className={styles.invoice}>
        <h3 style={{ textAlign: 'center' }}>فاتورة مبيعات</h3>
        <p><strong>رقم الفاتورة:</strong> {invoice.invoiceNumber}</p>
        {/* ✅ التاريخ */}
        <p><strong>التاريخ:</strong> {currentDate}</p>
        <p><strong>العميل:</strong> {invoice.customerName}</p>
        <p><strong>الهاتف:</strong> {invoice.customerPhone}</p>

        <table>
          <thead>
            <tr>
              <th>الكود</th>
              <th>المنتج</th>
              <th>الكمية</th>
              <th>السعر</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, index) => (
              <tr key={item.productId || item.productCode || index}>
                <td>{item.productCode}</td>
                <td>{item.productName}</td>
                <td>{item.quantity}</td>
                <td>{item.totalPrice} ج.م</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>الإجمالي: {invoice.total} ج.م</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className={styles.text}>
        <div className={styles.summarySection}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>المدفوع:</span>
            <span className={styles.summaryValue}>{invoice.total} ج.م</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>المتبقي:</span>
            <span className={styles.summaryValue}>0.00 ج.م</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>عدد الأصناف:</span>
            <span className={styles.summaryValue}>{invoice.items?.length || 0}</span>
          </div>
        </div>
        
        <div className={styles.divider}></div>
        
        <div className={styles.contactSection}>
          <p className={styles.contactInfo}>العنوان: الخصوص الشارع العمومي امام قسم الخصوص</p>
          <p className={styles.contactInfo}>رقم الهاتف: 01113865582</p>
        </div>
        
        <p className={styles.thankYou}>شكراً لتعاملكم معنا!</p>
      </div>

      {/* ✅ إضافة QR Code */}
      <div className={styles.qrContainer}>
        <QRCodeCanvas 
          value="https://www.tiktok.com/@s3edahmed1"
          size={80}
        />
      </div>

      <div className={styles.btn}>
        <button onClick={handlePrint}>طباعة الفاتورة</button>
      </div>

      <div className={styles.footer}>
        <strong>تم التوجيه بواسطة: Devoria</strong>
      </div>
    </div>
  );
}

export default Resete;
