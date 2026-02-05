'use client';
import { useEffect, useState } from "react";
import styles from "./styles.module.css";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";

function Resete() {
  const router = useRouter();
  const [invoice, setInvoice] = useState(null);
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const lastInvoice = localStorage.getItem("lastInvoice");
    if (lastInvoice) setInvoice(JSON.parse(lastInvoice));

    const today = new Date();
    setCurrentDate(
      today.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  const handlePrint = () => {
    if (!invoice) return alert("لا توجد فاتورة للطباعة");
    window.print();
  };

  if (!invoice) {
    return <div className={styles.resete}>لا توجد فاتورة</div>;
  }

  return (
    <div className={styles.resete}>

      {/* ❌ ده لا يطبع */}
      <button onClick={() => router.push('/')} className={styles.btnBack}>
        رجوع
      </button>

      {/* ✅ كل ما يُطبع داخل invoice فقط */}
      <div className={styles.invoice}>

        <h3>فاتورة مبيعات</h3>
        <p>رقم الفاتورة: {invoice.invoiceNumber}</p>
        <p>التاريخ: {currentDate}</p>
        <p>العميل: {invoice.customerName}</p>
        <p>الهاتف: {invoice.customerPhone}</p>

        <table>
          <thead>
            <tr>
              <th>كود</th>
              <th>المنتج</th>
              <th>الكمية</th>
              <th>السعر</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index}>
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

        <p>عدد الأصناف: {invoice.items.length}</p>
        <p>العنوان: الخصوص – الشارع العمومي</p>
        <p style={{ textAlign: "center" }}>01113865582</p>

        {/* QR */}
        <div className={styles.qrContainer}>
          <QRCodeCanvas
            value="https://www.tiktok.com/@s3edahmed1"
            size={90}
          />
        </div>

        <div className={styles.footer}>
          شكراً لتعاملكم معنا
        </div>

      </div>

      {/* ❌ زر الطباعة لا يُطبع */}
      <div className={styles.btn}>
        <button onClick={handlePrint}>طباعة</button>
      </div>
    </div>
  );
}

export default Resete;
