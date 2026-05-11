import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.logo}>Whammer Hub</div>
        <nav className={styles.nav}>
          <Link href="/minis" className={styles.navLink}>Minis Database</Link>
          <a href="/api/auth/logout" className={styles.logoutBtn}>Logout</a>
        </nav>
      </header>

      <section className={styles.hero}>
        <h1 className={styles.title}>Command Center</h1>
        <p className={styles.subtitle}>Select an application to launch</p>
      </section>

      <div className={styles.grid}>
        <Link href="/tokengen" className={styles.card}>
          <div className={styles.icon}>🪙</div>
          <h2>TokenGen &rarr;</h2>
          <p>Generate 3D tokens with projected images for your armies.</p>
        </Link>

        <Link href="/traygen" className={styles.card}>
          <div className={styles.icon}>📦</div>
          <h2>TrayGen &rarr;</h2>
          <p>Parametric 3D printable tray generator for storing your models.</p>
        </Link>

        <Link href="/datacards" className={styles.card}>
          <div className={styles.icon}>📇</div>
          <h2>Datacards &rarr;</h2>
          <p>Browse factions, build card decks, and export print-ready PDFs.</p>
        </Link>

        <Link href="/minis" className={`${styles.card} ${styles.highlightCard}`}>
          <div className={styles.icon}>💂</div>
          <h2>Miniatures Database &rarr;</h2>
          <p>Track your army's assembly and painting progress.</p>
        </Link>
      </div>
    </main>
  );
}
