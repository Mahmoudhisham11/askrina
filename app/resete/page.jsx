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

  if (!invoice) {
    return (
      <div className={styles.resete}>
        <p>لا توجد فاتورة لعرضها.</p>
      </div>
    );
  }

  // التحقق من وجود البيانات الأساسية
  if (!invoice.items || !Array.isArray(invoice.items)) {
    return (
      <div className={styles.resete}>
        <p>بيانات الفاتورة غير صحيحة.</p>
      </div>
    );
  }

  return (
    <div className={styles.resete}>
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
        <p><strong>رقم الفاتورة:</strong> {invoice.invoiceNumber || 'غير متوفر'}</p>
        {/* ✅ التاريخ */}
        <p><strong>التاريخ:</strong> {currentDate}</p>
        <p><strong>العميل:</strong> {invoice.customerName || 'غير معروف'}</p>
        <p><strong>الهاتف:</strong> {invoice.customerPhone || 'غير متوفر'}</p>

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
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((item, index) => (
                <tr key={item.productId || item.id || index}>
                  <td>{item.productCode || item.code || 'غير متوفر'}</td>
                  <td>{item.productName || item.name || 'غير متوفر'}</td>
                  <td>{item.quantity || 0}</td>
                  <td>{item.totalPrice || item.total || 0} ج.م</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center' }}>لا توجد منتجات</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>الإجمالي: {invoice.total || 0} ج.م</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className={styles.text}>
        <p>المدفوع: {invoice.total || 0} ج.م</p>
        <p>المتبقي: 0.00 ج.م</p>
        <p>عدد الاصناف:<span style={{border: '2px solid black', padding: "5px"}}>{invoice.items?.length || 0}</span></p>
        <p>العنوان: الخصوص الشارع العمومي امام قسم الخصوص</p>
        <p style={{ textAlign: 'center', marginTop: '5px'}}>رقم الهاتف: 01113865582</p>
        <p style={{ textAlign: 'center', marginTop: '5px'}}>شكراً لتعاملكم معنا!</p>
      </div>

      {/* ✅ إضافة QR Code */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px' }}>
        <QRCodeCanvas 
          value="https://www.tiktok.com/@s3edahmed1"
          size={100}
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