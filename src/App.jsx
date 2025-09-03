
import React from 'react';
import {useEffect, useState} from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { parseJwt } from "./utils/jwt";
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './ProtectedRoute';
import MainPage from './pages/MainPage'; // protected page
import StatsPage from './pages/StatsPage'; // protected page

function App() {
      const [username, setUsername] = useState(null);

      //Keeps track of time to log user out when an expiration of token has passed
useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token && window.location != "/login") {
      const payload = parseJwt(token);
      setUsername(payload?.username || null);

      if (payload?.exp) {
        const expiryTime = payload.exp; 

        let expDate = new Date(expiryTime * 1000); 
        let now = Date.now();

        console.log(expiryTime);
        if (expDate <= now) {

          handleLogout();
        } else {

          const timeout = setTimeout(() => {
            handleLogout();
          }, expDate - now);

          return () => clearTimeout(timeout); 
        }
      }
    }
  }, []);


 const handleLogout = () => {
    localStorage.removeItem("authToken");

    window.location.href = "/"
  };
  

   return (
    <div style={{width: "100%", height: "100%"}}>
      <div className="header dt-background">
        <h3>Hello {username}!</h3>
        <div style={{display: "flex", gap: 5}}>

          <button onClick={handleLogout}>Logout</button>
        </div>

      </div>
         <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stats"
          element={
            <ProtectedRoute>
              <StatsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
    </div>
 
  );
}

export default App
