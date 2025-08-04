'use client';
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, deleteDoc, doc, getDoc, getDocs, updateDoc, addDoc } from "firebase/firestore";
import { db } from "@/app/firebase";
import { FaTrashAlt } from "react-icons/fa";

function Reports() {
    const [selectedDate, setSelectedDate] = useState("");
    const [reports, setReports] = useState([]);
    const [openCard, setOpenCard] = useState(null);
    const [totalAmount, setTotalAmount] = useState(0);
    const shop = typeof window !== "undefined" ? localStorage.getItem("shop") : "";

    useEffect(() => {
        if (!shop) return;

        const q = query(collection(db, "reports"), where("shop", "==", shop));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const filteredReports = selectedDate
                ? allReports.filter((report) => {
                    if (!report.date) return false;
                    const reportDate = new Date(report.date.seconds * 1000).toDateString();
                    const selected = new Date(selectedDate).toDateString();
                    return reportDate === selected;
                })
                : allReports;

            setReports(filteredReports);

            let total = 0;
            filteredReports.forEach((report) => {
                report.cart?.forEach((item) => {
                    total += item.sellPrice * item.quantity;
                });
            });
            setTotalAmount(total);
        });

        return () => unsubscribe();
    }, [selectedDate, shop]);

const handleDelete = async (id) => {
  try {
    // 1. جلب التقرير من الـ reports
    const reportRef = doc(db, 'reports', id);
    const reportSnap = await getDoc(reportRef);

    if (!reportSnap.exists()) {
      alert("هذا التقرير غير موجود");
      return;
    }

    const reportData = reportSnap.data();
    const cartItems = reportData.cart;
    const shop = reportData.shop;

    // 2. استرجاع المنتجات للـ products
    for (const item of cartItems) {
      const q = query(
        collection(db, "products"),
        where("code", "==", item.code),
        where("shop", "==", shop)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // لو المنتج موجود بالفعل، زود الكمية
        const productDoc = snapshot.docs[0];
        const currentQty = productDoc.data().quantity || 0;

        await updateDoc(productDoc.ref, {
          quantity: currentQty + item.quantity,
        });
      } else {
        // لو المنتج مش موجود، ضيفه جديد
        await addDoc(collection(db, "products"), {
        name: item.name ?? "بدون اسم",
        code: item.code ?? 0,
        serial: item.serial ?? 0,
        sellPrice: item.sellPrice ?? item.price ?? 0,
        type: item.type ?? "product",    
        owner: item.owner,
        quantity: 1,    
        date: new Date(),
        shop: item.shop ?? shop,
        });


      }
    }

    // 3. حذف التقرير بعد استرجاع المنتجات
    await deleteDoc(reportRef);
    alert("تم حذف التقرير واسترجاع المنتجات بنجاح");
  } catch (error) {
    console.error("خطأ أثناء الحذف:", error);
    alert("حدث خطأ أثناء الحذف");
  }
};


    return (
        <div className={styles.reports}>
            <SideBar />
            <div className={styles.content}>
                <div className="inputContainer">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>
                <div className={styles.totalContainer}>
                    <h2>الاجمالي: {totalAmount} EGP</h2>
                </div>
                <div className={styles.tableContainer}>
                    <table>
                        <thead>
                            <tr>
                                <th>المنتج</th>
                                <th>السعر</th>
                                <th>السريال</th>
                                <th>الكمية</th>
                                <th>اسم العميل</th>
                                <th>رقم الهاتف</th>
                                <th>حذف</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report) =>
                                report.cart?.map((item, index) => (
                                    <tr key={`${report.id}-${index}`}>
                                        <td>{item.name}</td>
                                        <td>{item.sellPrice} EGP</td>
                                        <td>{item.serial || "-"}</td>
                                        <td>{item.quantity}</td>
                                        <td>{report.name}</td>
                                        <td>{report.phone}</td>
                                        <td>
                                            <button className={styles.delBtn} onClick={() => handleDelete(report.id)}><FaTrashAlt/></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={7} style={{ textAlign: "right", fontWeight: "bold" }}>
                                    الاجمالي: {totalAmount} EGP
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* الكروت بتفاصيل المنتجات داخل الـ cart */}
                <div className="moblieCardContainer">
                    {reports.map((report, reportIndex) =>
                        report.cart?.map((item, index) => {
                            const cardIndex = `${reportIndex}-${index}`;
                            return (
                                <div
                                    key={cardIndex}
                                    onClick={() =>
                                        setOpenCard(openCard === cardIndex ? null : cardIndex)
                                    }
                                    className={openCard === cardIndex ? 'card open' : 'card'}
                                >
                                    <div className="cardHead">
                                        <h3>{item.name}</h3>
                                    </div>
                                    <hr />
                                    <div className="cardBody">
                                        <strong>كود المنتج: {item.code || '-'}</strong>
                                        <strong>سعر الشراء: {item.buyPrice || '-'} EGP</strong>
                                        <strong>سعر البيع: {item.sellPrice || '-'} EGP</strong>
                                        <strong>الكمية: {item.quantity || '-'}</strong>
                                        <strong>البطارية: {item.battery || '-'}</strong>
                                        <strong>المساحة: {item.storage || '-'}</strong>
                                        <strong>اللون: {item.color || '-'}</strong>
                                        <strong>السريال: {item.serial || '-'}</strong>
                                        <strong>الضريبة: {item.tax || '-'}</strong>
                                        <strong>الكرتونة: {item.box || '-'}</strong>
                                        <strong>الحالة: {item.condition || '-'}</strong>
                                        <strong>الشريحة: {item.sim || '-'}</strong>
                                        <strong>التاجر: {item.owner || '-'}</strong>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

export default Reports;
