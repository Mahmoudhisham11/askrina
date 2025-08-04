'use client';
import Login from "@/components/Login/page";
import Main from "@/components/Main/page";
import { useEffect, useState } from "react";

export default function Home() {
  const [login, setlogin] = useState(false)

  useEffect(() => {
    if(typeof window !== "undefined") {
      const storageEmail = localStorage.getItem("email")
      if(storageEmail) {
        setlogin(true)
      }else {
        setlogin(false)
      }
    }
  }, [])

  return (
    <div className="main">
      {login ? <Main/> : <Login/>}
    </div>
  );
}
