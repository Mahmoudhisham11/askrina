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
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 10,
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
      <div className="barcode-label">
        {product.name || 'غير محدد'}
      </div>
      
      <svg ref={barcodeRef} className="barcode"></svg>
      
      <div className="barcode-info">
        {product.type === 'phone' && (
          <>
            <div className="info-row">
              <span className="info-label">S:</span>
              <span className="info-value">{product.storage?.toUpperCase() || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">B:</span>
              <span className="info-value">{product.battery?.toUpperCase() || '-'}</span>
            </div>
          </>
        )}
        <div className="info-row">
          <span className="info-label">C:</span>
          <span className="info-value">{product.code?.toString().toUpperCase() || '-'}</span>
        </div>
        <div className="info-row">
          <span className="info-label">PRICE:</span>
          <span className="info-value">{formatNumber(product.sellPrice || 0)} EGP</span>
        </div>
      </div>
    </div>
  );
}

