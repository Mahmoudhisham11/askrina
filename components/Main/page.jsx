'use client';
import SideBar from "../SideBar/page";
import styles from "./styles.module.css";
import { useState, useEffect, useRef } from "react";
import { IoMdSearch } from "react-icons/io";
import { CiShoppingCart } from "react-icons/ci";
import { FaRegTrashAlt } from "react-icons/fa";
import { IoIosCloseCircle } from "react-icons/io";
import { FaUser } from "react-icons/fa";
import { FaPhone } from "react-icons/fa";
import { FaBars } from "react-icons/fa6";
import {   
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs 
} from "firebase/firestore";
import { db } from "@/app/firebase";

function Main() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [savePage, setSavePage] = useState(false)
  const [openSideBar, setOpenSideBar] = useState(false)
  const [customPrices, setCustomPrices] = useState({});
  const [searchCode, setSearchCode] = useState("");
  const [filterType, setFilterType] = useState("all");
  const nameRef = useRef();
  const phoneRef = useRef();
  const shop = typeof window !== "undefined" ? localStorage.getItem("shop") : "";

  useEffect(() => {
    if (!shop) return;
    const q = query(collection(db, "products"), where("shop", "==", shop));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
    });
    return () => unsubscribe();
  }, [shop]);

  useEffect(() => {
    if (!shop) return;
    const q = query(collection(db, "cart"), where("shop", "==", shop));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCart(data);
    });
    return () => unsubscribe();
  }, [shop]);

const handleAddToCart = async (product) => {
  const customPrice = Number(customPrices[product.id]);
  const finalPrice = !isNaN(customPrice) && customPrice > 0 ? customPrice : product.sellPrice;

  await addDoc(collection(db, "cart"), {
    name: product.name,
    sellPrice: finalPrice,
    productPrice: product.sellPrice,
    serial: product.serial || 0,
    code: product.code,
    owner: product.owner, // ✅ أضف الكود هنا
    quantity: 1,
    type: product.type,
    total: finalPrice,
    date: new Date(),
    shop: shop,
  });

  setCustomPrices(prev => {
    const updated = { ...prev };
    delete updated[product.id];
    return updated;
  });
};


  const handleQtyChange = async (cartItem, delta) => {
    const newQty = cartItem.quantity + delta;
    if (newQty < 1) return;
    const newTotal = newQty * cartItem.sellPrice;
    await updateDoc(doc(db, "cart", cartItem.id), {
      quantity: newQty,
      total: newTotal,
    });
  };

  const handleDeleteCartItem = async (id) => {
    await deleteDoc(doc(db, "cart", id));
  };

  const totalAmount = cart.reduce((acc, item) => acc + item.total, 0);

  const filteredProducts = products.filter((p) => {
    const matchCode = searchCode.trim() === "" || p.name === searchCode.trim();
    const matchType =
      filterType === "all"
        ? true
        : filterType === "phone"
        ? p.type === "phone"
        : p.type !== "phone";
    return matchCode && matchType;
  });

  const phonesCount = products.filter(p => p.type === "phone").length;
  const otherCount = products.filter(p => p.type !== "phone").length;

const handleSaveReport = async () => {
  const clientName = nameRef.current.value;
  const phone = phoneRef.current.value;

  if (cart.length === 0 || clientName.trim() === "" || phone.trim() === "") {
    alert("يرجى ملء جميع الحقول وإضافة منتجات إلى السلة");
    return;
  }

  try {
    for (const item of cart) {
      const q = query(
        collection(db, "products"),
        where("code", "==", item.code),
        where("shop", "==", shop)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const productDoc = snapshot.docs[0];
        const productData = productDoc.data();
        const productRef = productDoc.ref;

        const availableQty = productData.quantity || 0;
        const sellQty = item.quantity;

        if (sellQty > availableQty) {
          alert(`الكمية غير كافية للمنتج: ${item.name}`);
          return;
        } else if (sellQty === availableQty) {
          await deleteDoc(productRef); // حذف المنتج لو الكمية خلصت
        } else {
          await updateDoc(productRef, {
            quantity: availableQty - sellQty, // خصم الكمية
          });
        }
      }
    }

    // حساب إجمالي الفاتورة
    const total = cart.reduce((sum, item) => sum + item.total, 0);

    // حفظ التقرير
    await addDoc(collection(db, "reports"), {
      cart,
      clientName,
      phone,
      total,
      date: new Date(),
      shop,
    });

    // حذف كل عناصر السلة
    const cartSnapshot = await getDocs(collection(db, "cart"));
    for (const doc of cartSnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    alert("تم حفظ التقرير بنجاح");
  } catch (error) {
    console.error("حدث خطأ أثناء حفظ التقرير:", error);
    alert("حدث خطأ أثناء حفظ التقرير");
  }
  setSavePage(false)
};









  return (
    <div className={styles.mainContainer}>
      <SideBar openSideBar={openSideBar} setOpenSideBar={setOpenSideBar}/>
      <div className={styles.boxContainer} style={{display: savePage ? 'block' : 'none'}}>
        <div className={styles.boxTitle}>
          <h2>تقفيل البيعة</h2>
          <button onClick={() => setSavePage(false)}><IoIosCloseCircle/></button>
        </div>
        <div className={styles.boxContent}>
          <div className="inputContainer">
            <label htmlFor=""><FaUser/></label>
            <input ref={nameRef} type="text" placeholder="اسم العميل"/>
          </div>
          <div className="inputContainer">
            <label htmlFor=""><FaPhone/></label>
            <input ref={phoneRef} type="text" placeholder="رقم الهاتف"/>
          </div>
          <button onClick={handleSaveReport}>تقفيل البيعة</button>
        </div>
      </div>

      <div className={styles.middleSection}>
        <div className={styles.title}>
          <div className={styles.rightSide}>
            <button onClick={() => setOpenSideBar(true)}><FaBars/></button>
            <h3>المبيعات</h3>
          </div>
          <div className={styles.inputBox}>
            <div className="inputContainer">
              <label><IoMdSearch /></label>
              <input type="text" list="codeList" placeholder="ابحث عن منتج" value={searchCode} onChange={(e) => setSearchCode(e.target.value)}/>
              <datalist id="codeList">
                {products.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
          </div>
        </div>
        {/* ✅ تصنيفات المنتج */}
        <div className={styles.categoryContainer}>
          <div
            className={styles.category}
            style={{
              backgroundColor: '#00bcd4',
              opacity: filterType === "all" ? 1 : 0.6,
              cursor: "pointer",
            }}
            onClick={() => setFilterType("all")}
          >
            <h3>كل المنتجات</h3>
            <p>{products.length} منتج</p>
          </div>
          <div
            className={styles.category}
            style={{
              backgroundColor: '#ba68c8',
              opacity: filterType === "phone" ? 1 : 0.6,
              cursor: "pointer",
            }}
            onClick={() => setFilterType("phone")}
          >
            <h3>الموبايلات</h3>
            <p>{phonesCount} منتج</p>
          </div>
          <div
            className={styles.category}
            style={{
              backgroundColor: '#ffa726',
              opacity: filterType === "other" ? 1 : 0.6,
              cursor: "pointer",
            }}
            onClick={() => setFilterType("other")}
          >
            <h3>المنتجات</h3>
            <p>{otherCount} منتج</p>
          </div>
        </div>
        <hr />
        {/* ✅ جدول عرض المنتجات */}
        <div className={styles.tableContainer}>
          <table>
                <thead>
                    <tr>
                        <th className={styles.lastRow}>الكود</th>
                        <th>السعر</th>
                        <th>السعر</th>
                        <th>السريال</th>
                        <th className={styles.lastRow}>تحديد</th>
                        <th className={styles.lastRow}>تفاعل</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredProducts.map((product) => (
                        <tr key={product.id}>
                        <td className={styles.lastRow}>{product.code}</td>
                        <td>{product.name}</td>
                        <td>{product.sellPrice} EGP</td>
                        <td>{product.serial}</td>
                        <td  className={styles.lastRow}>
                          <input
                          type="number"
                          placeholder="سعر مخصص"
                          value={customPrices[product.id] || ""}
                          onChange={(e) =>
                            setCustomPrices({ ...customPrices, [product.id]: e.target.value })
                          }
                        />
                        </td>
                        <td className="actions">
                            <button onClick={() => handleAddToCart(product)}>
                            <CiShoppingCart />
                            </button>
                        </td>
                        </tr>
                    ))}
                </tbody>
          </table>
        </div>
       </div>
     {/* ✅ الفاتورة */}
      <div className={styles.resetContainer}>
        <div className={styles.reset}>
          <div className={styles.resetTitle}>
            <h3>الفاتورة</h3>
            <hr />
          </div>

          <div className={styles.orderBox}>
            {cart.map((item) => (
              <div className={styles.ordersContainer} key={item.id}>
                <div className={styles.orderInfo}>
                  <div className={styles.content}>
                    <button onClick={() => handleDeleteCartItem(item.id)}><FaRegTrashAlt /></button>
                    <div className={styles.text}>
                      <h4>{item.name}</h4>
                      <p>{item.total} EGP</p>
                    </div>
                  </div>
                  <div className={styles.qtyInput}>
                    <button onClick={() => handleQtyChange(item, -1)}>-</button>
                    <input type="text" value={item.quantity} readOnly />
                    <button onClick={() => handleQtyChange(item, 1)}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.totalContainer}>
            <hr />
            <div className={styles.totalBox}>
              <h3>الاجمالي</h3>
              <strong>{totalAmount} EGP</strong>
            </div>
            <div className={styles.resetBtns}>
              <button onClick={() => setSavePage(true)}>حفظ</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Main;
