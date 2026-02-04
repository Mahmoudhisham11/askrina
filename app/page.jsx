'use client';
import { useEffect, useState } from 'react';
import Dashboard from "@/components/Dashboard/Dashboard";
import Login from "@/components/Login/page";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userName = localStorage.getItem('userName');
      setIsLoggedIn(!!userName);
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return null; // أو يمكنك إضافة loading spinner
  }

  return isLoggedIn ? <Dashboard /> : <Login />;
}
