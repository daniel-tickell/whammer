'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      setError('Invalid password');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.glassCard}>
        <h1 className={styles.title}>Whammer Hub</h1>
        <p className={styles.subtitle}>Enter password to access your command center</p>
        <form onSubmit={handleLogin} className={styles.form}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            placeholder="Password"
            required
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.button}>Access System</button>
        </form>
      </div>
    </div>
  );
}
