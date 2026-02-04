import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";


export const metadata = {
  title: "لوحة تحكم POSNova",
  description: "لوحة تحكم POSNova - نظام نقاط البيع الحديث",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link rel="preconnect" href="https://fonts.googleapis.com"/>
          <link rel="preconnect" href="https://fonts.gstatic.com"/>
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet"/>
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;700;800;900&display=swap" rel="stylesheet"/>
     
          <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <link rel="shortcut icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="manifest" href="/site.webmanifest" />

     
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
