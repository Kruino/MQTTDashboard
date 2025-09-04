import React, { useState, useEffect } from 'react';
import axios from 'axios';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  //login function called on login click
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('http://192.168.1.131:3000/login', {
        username,
        password,
      });

      const token = response.data.token; // token from response
      // Store the token in localStorage
      localStorage.setItem('authToken', token);


      console.log('Login successful, token saved!');
      // redirect to base page
      window.location.href = "/"

    } catch (err) {
      setError('Login failed. Check your credentials.');
      console.error(err);
    }
  };

  useEffect(() => {
    document.title = 'Login';
  }, []);

  return (
    <div style={{width: "100%", display:"flex", justifyContent: "center", alignItems: "center", marginTop: 5}}>
    <div className='dt-background' style={{maxWidth: '400px', padding: 25, margin: 'auto', }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", maxWidth: '400px', padding: 25, margin: 'auto', gap: 5 }}>
        <div style={{display: "flex", justifyContent: "space-between", gap: 20}}>
          <label>Username</label>
          <input style={{width: 250}}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div style={{display: "flex", justifyContent: "space-between"}}>
          <label>Password</label>
          <input style={{width: 207}}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
    </div>

  );
}

export default LoginPage;
