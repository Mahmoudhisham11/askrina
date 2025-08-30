'use client';
import JsBarcode from "jsbarcode";
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { useState, useEffect, useRef } from "react";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { GiMoneyStack } from "react-icons/gi";
import { CiSearch } from "react-icons/ci";
import { FaRegTrashAlt } from "react-icons/fa";
import { CiEdit } from "react-icons/ci";
import { IoIosCloseCircle } from "react-icons/io";

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  Timestamp,
  deleteDoc,
  doc,
  getDocs,
  updateDoc 
} from "firebase/firestore";
import { db } from "../firebase";

function Phones() {
  const [editId, setEditId] = useState(null);
  const [openEdit, setOpenEdit] = useState(false)
  const [active, setActive] = useState(false);
  const [openCard, setOpenCard] = useState('')
  const [form, setForm] = useState({
    name: '',
    buyPrice: '',
    sellPrice: '',
    battery: '',
    storage: '',
    color: '',
    serial: '',
    tax: 'معفي',
    box: 'يوجد',
    condition: 'جديد',
    owner: '',
    sim: '' // ✅ حقل الشريحة
  });

  const [products, setProducts] = useState([]);
  const [searchCode, setSearchCode] = useState('');
  const shop = typeof window !== "undefined" ? localStorage.getItem("shop") : "";

  useEffect(() => {
    if (!shop) return;
    const productsRef = collection(db, "products");
    const q = query(productsRef, where("shop", "==", shop), where('type', '==', 'phone'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(data);
    });
    return () => unsubscribe();
  }, [shop]);

  const filteredProducts = searchCode
    ? products.filter(p => p.name?.toLowerCase().includes(searchCode.toLowerCase()))
    : products;

  const getNextCode = async () => {
    const q = query(collection(db, "products"), where("shop", "==", shop));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return 1000;
    const codes = snapshot.docs.map(doc => Number(doc.data().code)).filter(code => !isNaN(code));
    const maxCode = Math.max(...codes);
    return maxCode + 1;
  };

  const handleAddProduct = async () => {
    try {
      if (!form.name || !form.buyPrice || !form.sellPrice || !form.battery || !form.storage || !form.color || !form.serial || !form.owner || !form.sim) {
        alert("❗️يرجى ملء جميع الحقول المطلوبة");
        return;
      }
      const newCode = await getNextCode();
      await addDoc(collection(db, "products"), {
        code: newCode,
        name: form.name,
        buyPrice: Number(form.buyPrice),
        sellPrice: Number(form.sellPrice),
        quantity: Number(1),
        battery: form.battery,
        storage: form.storage,
        color: form.color,
        serial: form.serial,
        tax: form.tax,
        box: form.box,
        condition: form.condition,
        owner: form.owner,
        sim: form.sim, // ✅ إضافة إلى قاعدة البيانات
        date: Timestamp.now(),
        type: "phone",
        shop: shop,
        userEmail: localStorage.getItem("email"),
      });
      alert("✅ تم إضافة المنتج بنجاح");
      setForm({
        name: '',
        buyPrice: '',
        sellPrice: '',
        battery: '',
        storage: '',
        color: '',
        serial: '',
        tax: 'يوجد',
        box: 'يوجد',
        condition: 'جديد',
        owner: '',
        sim: '' // ✅ تصفير الحقل
      });
    } catch (error) {
      console.error("❌ خطأ أثناء الإضافة:", error);
      alert("حدث خطأ أثناء الإضافة");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      console.error("❌ خطأ أثناء الحذف:", error);
      alert("حدث خطأ أثناء الحذف");
    }
  };


const handlePrintLabel = (product) => {
  const printWindow = window.open('', '', 'width=400,height=300');
  const htmlContent = `
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
        @media print {
          @page {
            size: auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
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
          /* خلي الـ SVG نفسه بمقاس ملي فعلي */
          svg.barcode {
            width: calc(var(--w) - 6mm);
            height: 12mm;
          }
          /* شيل أي هوامش افتراضية للباركود */
          .barcode rect, .barcode path { shape-rendering: crispEdges; }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="name">${product.name ?? ''}</div>
          <div class="content">
            <div><strong>B:</strong> ${product.battery ?? ''}</div>
            <div><strong>S:</strong> ${product.storage ?? ''}</div>
            <div><strong>C:</strong> ${product.code ?? ''}</div>
          </div>
          <svg id="barcode" class="barcode"></svg>
        </div>

        <script>
          window.onload = function () {
            // ⚠️ JsBarcode بيستخدم px داخليًا؛ هنخليه بدون قيم تحجيم ويُقاس بالـ CSS (mm) اللي فوق
            JsBarcode("#barcode", "${'${product.code}'}", {
              format: "CODE128",
              displayValue: false,
              margin: 0,     // بدون هوامش داخلية
            });

            // اطبع واقفل النافذة
            setTimeout(() => {
              window.print();
              window.onafterprint = () => window.close();
            }, 100);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};



  const handleEdit = (product) => {
    setOpenEdit(true);
    setEditId(product.id); // نحدد المنتج اللي بنعدله
    setForm({
      name: product.name || '',
      buyPrice: product.buyPrice || '',
      sellPrice: product.sellPrice || '',
      battery: product.battery || '',
      storage: product.storage || '',
      color: product.color || '',
      serial: product.serial || '',
      tax: product.tax || 'يوجد',
      box: product.box || 'يوجد',
      condition: product.condition || 'جديد',
      owner: product.owner || '',
      sim: product.sim || ''
    });
  };

  const handleUpdateProduct = async () => {
  if (!editId) return alert("❗ لا يوجد منتج محدد للتعديل");
  setOpenEdit(true)
  try {
    await updateDoc(doc(db, "products", editId), {
      name: form.name,
      buyPrice: Number(form.buyPrice),
      sellPrice: Number(form.sellPrice),
      battery: form.battery,
      storage: form.storage,
      color: form.color,
      serial: form.serial,
      tax: form.tax,
      box: form.box,
      condition: form.condition,
      owner: form.owner,
      sim: form.sim
    });
    alert("✅ تم تعديل المنتج بنجاح");
    setForm({
      name: '',
      buyPrice: '',
      sellPrice: '',
      battery: '',
      storage: '',
      color: '',
      serial: '',
      tax: 'يوجد',
      box: 'يوجد',
      condition: 'جديد',
      owner: '',
      sim: ''
    });
    setOpenEdit(false);
    setEditId(null);
  } catch (error) {
    console.error("❌ خطأ أثناء التعديل:", error);
    alert("حدث خطأ أثناء التعديل");
  }
};




  const totalBuy = filteredProducts.reduce((acc, product) => acc + Number(product.buyPrice || 0), 0);
  const totalSell = filteredProducts.reduce((acc, product) => acc + Number(product.sellPrice || 0), 0);

  return (
    <div className={styles.phones}>
      <SideBar />
      <div className={styles.boxContainer} style={{display: openEdit ? 'flex' : 'none'}}>
        <div className={styles.boxTitle}>
          <h2>تعديل منتج</h2>
          <button onClick={() => setOpenEdit(false)}><IoIosCloseCircle/></button>
        </div>
        <div className={styles.boxContent}>
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
            <div className="inputContainer">
              <label><MdDriveFileRenameOutline /></label>
              <input
                type="text"
                placeholder="التاجر"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
              />
            </div>
            <div className="inputContainer">
                <select
                      value={form.sim}
                      onChange={(e) => setForm({ ...form, sim: e.target.value })}
                >
                  <option value="">حالة الشريحة</option>
                  <option value="خط">خط</option>
                  <option value="خطين">خطين</option>
                </select>
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
            <div className="inputContainer">
              <label>السريال</label>
              <input
                type="text"
                placeholder="السريال"
                value={form.serial}
                onChange={(e) => setForm({ ...form, serial: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.inputBox}>
            <div className="inputContainer">
              <label>البطارية</label>
              <input
                type="text"
                placeholder="البطارية"
                value={form.battery}
                onChange={(e) => setForm({ ...form, battery: e.target.value })}
              />
            </div>
            <div className="inputContainer">
              <label>المساحة</label>
              <input
                type="text"
                placeholder="المساحة"
                value={form.storage}
                onChange={(e) => setForm({ ...form, storage: e.target.value })}
              />
            </div>
            <div className="inputContainer">
              <label>اللون</label>
              <input
                type="text"
                placeholder="اللون"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.inputBox}>
            <div className="inputContainer">
              <label>الضريبة</label>
              <select
                value={form.tax}
                onChange={(e) => setForm({ ...form, tax: e.target.value })}
              >
                <option value="معفي">معفي</option>
                <option value="بضريبة">بضريبة</option>
              </select>
            </div>
            <div className="inputContainer">
              <label>الكرتونة</label>
              <select
                value={form.box}
                onChange={(e) => setForm({ ...form, box: e.target.value })}
              >
                <option value="يوجد">يوجد</option>
                <option value="لا يوجد">لا يوجد</option>
              </select>
            </div>
            <div className="inputContainer">
              <label>الحالة</label>
              <select
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
              >
                <option value="جديد">جديد</option>
                <option value="مستعمل">مستعمل</option>
              </select>
            </div>
          </div>

          <button className={styles.addBtn} onClick={handleUpdateProduct}>
            تعديل المنتج
          </button>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.btns}>
          <button onClick={() => setActive(false)}>كل الموبايلات</button>
          <button onClick={() => setActive(true)}>اضف موبايل جديد</button>
        </div>
        <div className={styles.phoneContainer} style={{ display: active ? 'none' : 'flex' }}>
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
                  <th>الشراء</th>
                  <th>البيع</th>
                  <th>البطارية</th>
                  <th>المساحة</th>
                  <th>اللون</th>
                  <th>السريال</th>
                  <th>الضريبة</th>
                  <th>الكرتونة</th>
                  <th>الحالة</th>
                  <th>الشريحة</th>
                  <th>التاجر</th>
                  <th>التاريخ</th>
                  <th>تفاعل</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.code}</td>
                    <td>{product.name}</td>
                    <td>{product.buyPrice} EGP</td>
                    <td>{product.sellPrice} EGP</td>
                    <td>{product.battery}</td>
                    <td>{product.storage}</td>
                    <td>{product.color}</td>
                    <td>{product.serial}</td>
                    <td>{product.tax}</td>
                    <td>{product.box}</td>
                    <td>{product.condition}</td>
                    <td>{product.sim}</td>
                    <td>{product.owner}</td>
                    <td>{product.date?.toDate().toLocaleDateString("ar-EG")}</td>
                    <td className={styles.actionBtns}>
                      <button className={styles.delBtn} onClick={() => handleDelete(product.id)}>
                        <FaRegTrashAlt />
                      </button>
                      <button onClick={() => handlePrintLabel(product)} className={styles.print}>
                        🖨️
                      </button>
                      <button onClick={() => handleEdit(product)} className={styles.print}>
                        <CiEdit/>
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
                    <button onClick={() => handleEdit(product)} className={styles.print}><CiEdit/></button>
                    <button onClick={() => handlePrintLabel(product)} className={styles.print}>🖨️</button>
                    <button className={styles.delBtn} onClick={() => handleDelete(product.id)}><FaRegTrashAlt /></button>
                  </div>
                </div>
                <hr />
                <div className="cardBody">
                  <strong>كود المنتج: {product.code}</strong>
                  <strong>سعر الشراء: {product.buyPrice} EGP</strong>
                  <strong>سعر البيع: {product.sellPrice} EGP</strong>
                  <strong>البطارية: {product.battery}</strong>
                  <strong>المساحة: {product.storage}</strong>
                  <strong>اللون: {product.color}</strong>
                  <strong>السريال: {product.serial}</strong>
                  <strong>الضريبة: {product.tax}</strong>
                  <strong>الكرتونة: {product.box}</strong>
                  <strong>الحالة: {product.condition}</strong>
                  <strong>الشريحة: {product.sim}</strong>
                  <strong>التاجر: {product.owner}</strong>
                  <strong></strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.addContainer} style={{ display: active ? 'flex' : 'none' }}>
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
            <div className="inputContainer">
              <label><MdDriveFileRenameOutline /></label>
              <input
                type="text"
                placeholder="التاجر"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
              />
            </div>
            <div className="inputContainer">
                <select
                      value={form.sim}
                      onChange={(e) => setForm({ ...form, sim: e.target.value })}
                >
                  <option value="">حالة الشريحة</option>
                  <option value="خط">خط</option>
                  <option value="خطين">خطين</option>
                </select>
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
            <div className="inputContainer">
              <label>السريال</label>
              <input
                type="text"
                placeholder="السريال"
                value={form.serial}
                onChange={(e) => setForm({ ...form, serial: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.inputBox}>
            <div className="inputContainer">
              <label>البطارية</label>
              <input
                type="text"
                placeholder="البطارية"
                value={form.battery}
                onChange={(e) => setForm({ ...form, battery: e.target.value })}
              />
            </div>
            <div className="inputContainer">
              <label>المساحة</label>
              <input
                type="text"
                placeholder="المساحة"
                value={form.storage}
                onChange={(e) => setForm({ ...form, storage: e.target.value })}
              />
            </div>
            <div className="inputContainer">
              <label>اللون</label>
              <input
                type="text"
                placeholder="اللون"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.inputBox}>
            <div className="inputContainer">
              <label>الضريبة</label>
              <select
                value={form.tax}
                onChange={(e) => setForm({ ...form, tax: e.target.value })}
              >
                <option value="معفي">معفي</option>
                <option value="بضريبة">بضريبة</option>
              </select>
            </div>
            <div className="inputContainer">
              <label>الكرتونة</label>
              <select
                value={form.box}
                onChange={(e) => setForm({ ...form, box: e.target.value })}
              >
                <option value="يوجد">يوجد</option>
                <option value="لا يوجد">لا يوجد</option>
              </select>
            </div>
            <div className="inputContainer">
              <label>الحالة</label>
              <select
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
              >
                <option value="جديد">جديد</option>
                <option value="مستعمل">مستعمل</option>
              </select>
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

export default Phones;
