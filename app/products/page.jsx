'use client';
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { useState, useEffect } from "react";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { GiMoneyStack } from "react-icons/gi";
import { CiSearch } from "react-icons/ci";
import { FaRegTrashAlt } from "react-icons/fa";
import { GoNumber } from "react-icons/go";
import { MdOutlinePersonOutline } from "react-icons/md";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import { db } from "../firebase";

function Products() {
  const [active, setActive] = useState(false);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [openCard, setOpenCard] = useState('')
  const [searchCode, setSearchCode] = useState("");
  const [totalBuy, setTotalBuy] = useState(0); // ✅ إجمالي الشراء
  const [totalSell, setTotalSell] = useState(0); // ✅ إجمالي البيع

  const [form, setForm] = useState({
    name: "",
    buyPrice: "",
    sellPrice: "",
    quantity: "",
  });

  useEffect(() => {
    const shop = localStorage.getItem("shop");
    if (!shop) return;

    const q = query(collection(db, "products"), where("shop", "==", shop), where("type", "==", "product"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(data);

      // ✅ حساب الإجماليات
      let totalBuyAmount = 0;
      let totalSellAmount = 0;
      data.forEach((product) => {
        totalBuyAmount += (product.buyPrice || 0) * (product.quantity || 1);
        totalSellAmount += (product.sellPrice || 0) * (product.quantity || 1);
      });
      setTotalBuy(totalBuyAmount);
      setTotalSell(totalSellAmount);

      if (searchCode.trim()) {
        const filtered = data.filter((p) =>
          p.name?.toLowerCase().includes(searchCode.trim().toLowerCase())
        );
        setFilteredProducts(filtered);
      } else {
        setFilteredProducts(data);
      }
    });

    return () => unsubscribe();
  }, [searchCode]);

  const getNextCode = async () => {
    const shop = localStorage.getItem("shop");
    const q = query(collection(db, "products"), where("shop", "==", shop));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return 1000;

    const codes = snapshot.docs
      .map(doc => Number(doc.data().code))
      .filter(code => !isNaN(code));

    const maxCode = Math.max(...codes);
    return maxCode + 1;
  };

  const handleAddProduct = async () => {
    const shop = localStorage.getItem("shop");

    if (!form.name || !form.buyPrice || !form.sellPrice || !form.quantity) {
      alert("❗️يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const newCode = await getNextCode();

    await addDoc(collection(db, "products"), {
      code: newCode,
      name: form.name,
      buyPrice: Number(form.buyPrice),
      sellPrice: Number(form.sellPrice),
      quantity: Number(form.quantity),
      date: Timestamp.now(),
      shop: shop,
      userEmail: localStorage.getItem('email'),
      type: "product"
    });

    alert("✅ تم إضافة المنتج");
    setForm({ name: "", buyPrice: "", sellPrice: "", quantity: ""});
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (err) {
      console.error("❌ خطأ أثناء الحذف:", err);
    }
  };

const handlePrintLabel = (product) => {
  const printWindow = window.open('', '', 'width=300,height=200');

const htmlContent = `
  <html>
    <head>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
      <style>
        @media print {
          @page {
            size: auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
        .label {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          padding: 2mm;
          display: flex;
          flex-direction: column;
          justify-content: start;
          align-items: center;
          font-family: Arial, sans-serif;
          font-size: 8pt;
          gap: 1mm;
          page-break-inside: avoid;
          overflow: hidden;
          text-align: center;
        }
        .name {
          max-width: 100%;
          font-weight: 600;
          line-height: 1.1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .content {
          display: flex;
          gap: 2mm;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          font-size: 7pt;
        }
        svg.barcode {
          width: 40mm;
          height: 12mm;
        }
        .barcode rect, .barcode path { shape-rendering: crispEdges; }
      </style>
    </head>
    <body onload="
      JsBarcode('#barcode', '${product.code}', {
        format: 'CODE128',
        displayValue: true,
        fontSize: 12,
        width: 2,
        height: 40
      });
      setTimeout(() => { window.print(); setTimeout(() => window.close(), 500); }, 500);
    ">
      <div class="label">
        <div><strong>${product.name}</strong></div>
        <div><strong>${product.sellPrice}</strong></div>
        <svg id="barcode"></svg>
      </div>
    </body>
  </html>
`;


  printWindow.document.write(htmlContent);
  printWindow.document.close();
};


  return (
    <div className={styles.products}>
      <SideBar />
      <div className={styles.content}>
        <div className={styles.btns}>
          <button onClick={() => setActive(false)}>كل المنتجات</button>
          <button onClick={() => setActive(true)}>اضف منتج جديد</button>
        </div>

        {/* عرض المنتجات */}
        <div className={styles.phoneContainer} style={{ display: active ? "none" : "flex" }}>
          <div className={styles.searchBox}>
            <div className="inputContainer">
              <label><CiSearch /></label>
              <input
                type="text"
                list="code"
                placeholder="ابحث بالاسم"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
              />
              <datalist id="code">
                {products.map((product) => (
                  <option key={product.id} value={product.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className={styles.totals}>
            <p>اجمالي الشراء: {totalBuy} EGP</p>
            <p>اجمالي البيع: {totalSell} EGP</p>
          </div>

          <div className={styles.tableContainer}>
            <table>
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>الاسم</th>
                  <th>سعر الشراء</th>
                  <th>سعر البيع</th>
                  <th>الكمية</th>
                  <th>التاريخ</th>
                  <th>حذف</th>
                  <th>طباعة</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.code}</td>
                    <td>{product.name}</td>
                    <td>{product.buyPrice} EGP</td>
                    <td>{product.sellPrice} EGP</td>
                    <td>{product.quantity}</td>
                    <td>{product.date?.toDate().toLocaleDateString("ar-EG")}</td>
                    <td>
                      <button className={styles.delBtn} onClick={() => handleDelete(product.id)}>
                        <FaRegTrashAlt />
                      </button>
                    </td>
                    <td>
                      <button className={styles.delBtn} onClick={() => handlePrintLabel(product)}>
                        🖨️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="moblieCardContainer">
            {filteredProducts.map((product, index) => (
              <div onClick={() => setOpenCard(openCard === index ? null : index)} className={openCard === index ? 'card open' : 'card'} key={product.id}>
                <div className="cardHead">
                  <h3>{product.name}</h3>
                  <div className="btns">
                    <button onClick={() => handlePrintLabel(product)} className={styles.print}>🖨️</button>
                    <button className={styles.delBtn} onClick={() => handleDelete(product.id)}><FaRegTrashAlt /></button>
                  </div>
                </div>
                <hr />
                <div className="cardBody">
                  <strong>كود المنتج: {product.code}</strong>
                  <strong>سعر الشراء: {product.buyPrice} EGP</strong>
                  <strong>سعر البيع: {product.sellPrice} EGP</strong>
                  <strong>الكمية: {product.quantity}</strong>
                  <strong>التاريخ: {product.date?.toDate().toLocaleDateString("ar-EG")}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* إضافة منتج جديد */}
        <div className={styles.addContainer} style={{ display: active ? "flex" : "none" }}>
          <div className={styles.inputBox}>
            <div className="inputContainer">
              <label><MdDriveFileRenameOutline /></label>
              <input
                type="text"
                placeholder="اسم المنتج"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>
          <div className={styles.inputBox}>
            <div className="inputContainer">
              <label><GiMoneyStack /></label>
              <input
                type="number"
                placeholder="سعر الشراء"
                value={form.buyPrice}
                onChange={(e) => setForm({ ...form, buyPrice: e.target.value })}
              />
            </div>
            <div className="inputContainer">
              <label><GiMoneyStack /></label>
              <input
                type="number"
                placeholder="سعر البيع"
                value={form.sellPrice}
                onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
              />
            </div>
          </div>
          <div className={styles.inputBox}>
            <div className="inputContainer">
              <label><GoNumber /></label>
              <input
                type="number"
                placeholder="الكمية"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
          </div>
          <button className={styles.addBtn} onClick={handleAddProduct}>
            اضف المنتج
          </button>
        </div>
      </div>
    </div>
  );
}

export default Products;
