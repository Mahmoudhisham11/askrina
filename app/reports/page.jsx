'use client';
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    onSnapshot,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    addDoc,
} from "firebase/firestore";
import { db } from "@/app/firebase";
import { FaTrashAlt } from "react-icons/fa";

function Reports() {
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [reports, setReports] = useState([]);
    const [openCard, setOpenCard] = useState(null);
    const [totalAmount, setTotalAmount] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);            
    const shop = typeof window !== "undefined" ? localStorage.getItem("shop") : "";

    useEffect(() => {
        if (!shop) return;

        const q = query(collection(db, "reports"), where("shop", "==", shop));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const filteredByDate = allReports.filter((report) => {
                if (!report.date) return false;
                const reportTime = new Date(report.date.seconds * 1000).getTime();

                let fromTime = fromDate ? new Date(fromDate) : null;
                let toTime = toDate ? new Date(toDate) : null;

                if (fromTime) {
                    fromTime.setHours(0, 0, 0, 0);
                    fromTime = fromTime.getTime();
                }

                if (toTime) {
                    toTime.setHours(23, 59, 59, 999);
                    toTime = toTime.getTime();
                }

                if (fromTime && toTime) return reportTime >= fromTime && reportTime <= toTime;
                if (fromTime) return reportTime >= fromTime;

                return true;
            });

            const filteredReports = filteredByDate.map((report) => {
                if (filterType === "all") return report;
                return {
                    ...report,
                    cart: report.cart?.filter((item) => item.type === filterType)
                };
            }).filter(report => report.cart?.length);

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
    }, [fromDate, toDate, filterType, shop]);


const handleDeleteSingleProduct = async (reportId, productCode) => {
    if (isDeleting) return; // منع التكرار
    setIsDeleting(true);

    try {
        const reportRef = doc(db, 'reports', reportId);
        const reportSnap = await getDoc(reportRef);

        if (!reportSnap.exists()) {
            alert("هذا التقرير غير موجود");
            setIsDeleting(false);
            return;
        }

        const reportData = reportSnap.data();
        const cartItems = reportData.cart;
        const shop = reportData.shop;

        const updatedCart = cartItems.filter((item) => item.code !== productCode);
        const deletedItem = cartItems.find((item) => item.code === productCode);

        if (!deletedItem) {
            alert("هذا المنتج غير موجود في التقرير");
            setIsDeleting(false);
            return;
        }

        const q = query(
            collection(db, "products"),
            where("code", "==", deletedItem.code),
            where("shop", "==", shop)
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const productDoc = snapshot.docs[0];
            const currentQty = productDoc.data().quantity || 0;

            await updateDoc(productDoc.ref, {
                quantity: currentQty + deletedItem.quantity,
            });
        } else {
            await addDoc(collection(db, "products"), {
                name: deletedItem.name ?? "بدون اسم",
                code: deletedItem.code ?? 0,
                serial: deletedItem.serial ?? 0,
                sellPrice: deletedItem.sellPrice ?? deletedItem.price ?? 0,
                buyPrice: deletedItem.buyPrice,
                type: deletedItem.type ?? "product",
                sim: deletedItem.sim || 0,
                battery: deletedItem.battery || 0,
                storage: deletedItem.storage || 0,
                color: deletedItem.color || 0,
                box: deletedItem.box || 0,
                condition: deletedItem.condition || 0,
                tax: deletedItem.tax || 0,
                quantity: deletedItem.quantity,
                date: new Date(),
                shop: deletedItem.shop ?? shop,
            });
        }

        if (updatedCart.length === 0) {
            await deleteDoc(reportRef);
            alert("تم حذف التقرير لأنه لم يتبق فيه منتجات");
        } else {
            await updateDoc(reportRef, {
                cart: updatedCart,
            });
            alert("تم حذف المنتج من التقرير واسترجاعه إلى المخزون");
        }

    } catch (error) {
        console.error("خطأ أثناء الحذف:", error);
        alert("حدث خطأ أثناء حذف المنتج");
    }

    setIsDeleting(false);
};


    return (
        <div className={styles.reports}>
            <SideBar />
            <div className={styles.content}>
                <div className={styles.filterBar}>
                    <div className="inputContainer">
                        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    </div>
                    <div className="inputContainer">
                        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />    
                    </div>
                    <div className="inputContainer">
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                            <option value="all">الكل</option>
                            <option value="product">المنتجات</option>
                            <option value="phone">الموبايلات</option>
                        </select>
                    </div>
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
                                <th>مرتجع</th>
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
                                        <td>{report.clientName}</td>
                                        <td>{report.phone}</td>
                                        <td>
                                            <button className={styles.delBtn} onClick={() => handleDeleteSingleProduct(report.id, item.code)}><FaTrashAlt /></button>
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

                <div className="moblieCardContainer">
                    {reports.map((report, reportIndex) =>
                        report.cart?.map((item, index) => {
                            const cardIndex = `${reportIndex}-${index}`;
                            return (
                                <div
                                    key={cardIndex}
                                    onClick={() => setOpenCard(openCard === cardIndex ? null : cardIndex)}
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
