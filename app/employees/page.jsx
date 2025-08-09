'use client';
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { useState, useEffect, useMemo } from "react";
import { MdPersonAddAlt1 } from "react-icons/md";
import {
    addDoc,
    collection,
    onSnapshot,
    query,
    where,
    deleteDoc,
    doc,
} from "firebase/firestore";
import { db } from "../firebase";

function Employees() {
    const [active, setActive] = useState(false);
    const [newEmployee, setNewEmployee] = useState("");
    const [reports, setReports] = useState([]);
    const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
    const [employeeNames, setEmployeeNames] = useState([]);
    const [shop, setShop] = useState("");

    // جلب shop من localStorage فقط
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storageShop = localStorage.getItem('shop');
            if (storageShop) {
                setShop(storageShop);
            }
        }
    }, []);

    // جلب تقارير الموظفين بناءً على shop
    useEffect(() => {
        if (!shop) return;

        const q = query(collection(db, 'employeesReports'), where('shop', '==', shop));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setReports(data);

            const names = Array.from(new Set(data.map(r => r.employee).filter(Boolean)));
            setEmployeeNames(names);
        });

        return () => unsubscribe();
    }, [shop]);

    // حساب العمولة حسب الموظف المحدد أو الكل
    const totalCommission = useMemo(() => {
        const filtered = selectedEmployeeName
            ? reports.filter(r => r.employee === selectedEmployeeName)
            : reports;

        return filtered.reduce((sum, report) => {
            const productCount = report.cart?.reduce((count, item) => count + item.quantity, 0) || 0;
            return sum + (productCount * 5);
        }, 0);
    }, [reports, selectedEmployeeName]);

    const handleAddEmployee = async () => {
        if (!newEmployee.trim()) {
            alert("من فضلك أدخل اسم الموظف");
            return;
        }

        try {
            await addDoc(collection(db, "employees"), {
                name: newEmployee.trim(),
                createdAt: new Date(),
            });
            alert("تمت إضافة الموظف بنجاح");
            setNewEmployee("");
        } catch (error) {
            console.error("خطأ أثناء إضافة الموظف:", error);
            alert("حدث خطأ أثناء إضافة الموظف");
        }
    };

    const filteredReports = selectedEmployeeName
        ? reports.filter((r) => r.employee === selectedEmployeeName)
        : reports;

    const handleClearReports = async () => {
        const confirm = window.confirm("هل أنت متأكد أنك تريد تقفيل الشهر وحذف جميع التقارير؟");
        if (!confirm) return;

        try {
            const reportsToDelete = reports.filter(r => r.shop === shop);

            for (const report of reportsToDelete) {
                const ref = doc(db, "employeesReports", report.id);
                await deleteDoc(ref);
            }

            alert("تم تقفيل الشهر بنجاح وتم حذف جميع التقارير.");
        } catch (error) {
            console.error("حدث خطأ أثناء تقفيل الشهر:", error);
            alert("حدث خطأ أثناء تقفيل الشهر.");
        }
    };

    return (
        <div className={styles.employees}>
            <SideBar />
            <div className={styles.content}>
                <div className={styles.btns}>
                    <button onClick={handleClearReports}>تقفيل الشهر</button>
                    <button onClick={() => setActive(!active)}>اضف موظف جديد</button>
                </div>

                {/* جدول الموظفين */}
                <div className={styles.employeesContent} style={{ display: active ? 'none' : 'flex' }}>
                    <div className={styles.total}>
                        <div className="inputContainer">
                            <select
                                value={selectedEmployeeName}
                                onChange={(e) => setSelectedEmployeeName(e.target.value)}
                            >
                                <option value="">اختر اسم الموظف</option>
                                {employeeNames.map((name, idx) => (
                                    <option key={idx} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <h2>اجمالي العمولة: {totalCommission} جنيه</h2>
                    </div>
                    <div className={styles.tableContainer}>
                        <table>
                            <thead>
                                <tr>
                                    <th>الموظف</th>
                                    <th>المنتج</th>
                                    <th>العمولة</th>
                                    <th>التاريخ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReports.map((report) =>
                                    report.cart?.map((item, index) => (
                                        <tr key={`${report.id}-${index}`}>
                                            <td>{report.employee || "غير معروف"}</td>
                                            <td>{item.name}</td>
                                            <td>5</td>
                                            <td>{new Date(report.date?.seconds * 1000).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* إضافة موظف جديد */}
                <div className={styles.addEmployees} style={{ display: active ? 'flex' : 'none' }}>
                    <div className="inputContainer">
                        <label><MdPersonAddAlt1 /></label>
                        <input
                            type="text"
                            value={newEmployee}
                            onChange={(e) => setNewEmployee(e.target.value)}
                            placeholder="اسم الموظف"
                        />
                    </div>
                    <button className={styles.addBtn} onClick={handleAddEmployee}>
                        اضف الموظف
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Employees;
