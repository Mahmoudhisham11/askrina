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
    <div className={`${styles.resete} invoice-print-root`}>
      {/* Navigation button - hidden when printing */}
      <button onClick={() => router.push('/')} className={styles.btnBack}>
        رجوع
      </button>

      {/* Invoice Container */}
      <div className={styles.invoice}>
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.logoPlaceholder}>
            <span>اسكرينا</span>
          </div>
          <h1 className={styles.invoiceTitle}>فاتورة مبيعات</h1>
        </div>

        {/* Invoice Details Section */}
        <div className={styles.invoiceDetails}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>رقم الفاتورة:</span>
            <span className={styles.detailValue}>{invoice.invoiceNumber || 'غير متوفر'}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>التاريخ:</span>
            <span className={styles.detailValue}>{currentDate}</span>
          </div>
        </div>

        {/* Customer Details Section */}
        <div className={styles.customerDetails}>
          <div className={styles.sectionTitle}>بيانات العميل</div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>الاسم:</span>
            <span className={styles.detailValue}>{invoice.customerName || 'غير معروف'}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>الهاتف:</span>
            <span className={styles.detailValue}>{invoice.customerPhone || 'غير متوفر'}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>العنوان:</span>
            <span className={styles.detailValue}>الخصوص – الشارع العمومي</span>
          </div>
        </div>

        {/* Items Table */}
        <div className={styles.tableContainer}>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>كود المنتج</th>
                <th>اسم المنتج</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item, index) => {
                  const itemTotal = (item.totalPrice || item.unitPrice * (item.quantity || 0) || 0);
                  return (
                    <tr key={item.productId || index}>
                      <td>{item.productCode || item.code || '—'}</td>
                      <td className={styles.productNameCell}>{item.productName || item.name || '—'}</td>
                      <td>{item.quantity || 0}</td>
                      <td className={styles.priceCell}>{item.unitPrice || item.finalPrice || 0} ج.م</td>
                      <td className={styles.priceCell}>{itemTotal} ج.م</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>لا توجد منتجات</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Total Section */}
        <div className={styles.totalSection}>
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>عدد الأصناف:</span>
            <span className={styles.totalValue}>{invoice.items?.length || 0}</span>
          </div>
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>الإجمالي الكلي:</span>
            <span className={styles.totalAmount}>{invoice.total || 0} ج.م</span>
          </div>
        </div>

        {/* Contact Info */}
        <div className={styles.contactInfo}>
          <p className={styles.contactText}>رقم الهاتف: 01113865582</p>
        </div>

        {/* QR Code Section */}
        <div className={styles.qrContainer}>
          <QRCodeCanvas
            value="https://www.tiktok.com/@s3edahmed1"
            size={90}
          />
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerText}>شكراً لتعاملكم معنا</p>
        </div>
      </div>

      {/* Print Button - hidden when printing */}
      <div className={styles.btn}>
        <button onClick={handlePrint} className={styles.printBtn}>
          طباعة الفاتورة
        </button>
      </div>
    </div>
  );
}

export default Resete;
