'use client';
import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function BarcodePrintContent({ product, formatNumber }) {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (barcodeRef.current && product) {
      // مسح الباركود السابق
      barcodeRef.current.innerHTML = '';
      
      try {
        JsBarcode(barcodeRef.current, product.code.toString(), {
          format: 'CODE128',
          width: 1,
          height: 30,
          displayValue: false,
          margin: 3,
          textAlign: 'center',
          textPosition: 'bottom'
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [product]);

  if (!product) return null;

  return (
    <div className="barcode-print-content">
      {/* اسم المنتج - كبير وواضح */}
      <div className="barcode-label">
        {product.name || 'غير محدد'}
      </div>
      
      {/* الكود - واضح */}
      <div className="barcode-code">
        {product.code?.toString() || '-'}
      </div>
      
      {/* الباركود - صغير */}
      <svg ref={barcodeRef} className="barcode"></svg>
      
      {/* السعر - كبير وواضح */}
      <div className="barcode-price">
        {formatNumber(product.sellPrice || 0)} ج.م
      </div>
    </div>
  );
}

