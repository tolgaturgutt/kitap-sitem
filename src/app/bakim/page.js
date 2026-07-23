'use client';

import Image from 'next/image';
import styles from './page.module.css';

const steps = [
  'Altyapımızı güçlendiriyoruz',
  'Hikâyelerinizi güvenle taşıyoruz',
  'Son kontrolleri tamamlıyoruz',
];

export default function MaintenancePage() {
  return (
    <div className={styles.page}>
      <div className={styles.ambientOne} aria-hidden="true" />
      <div className={styles.ambientTwo} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      <main className={styles.shell}>
        <section className={styles.card}>
          <div className={styles.brandRow}>
            <div className={styles.logoWrap}>
              <Image
                src="/logo-gunduz.png"
                alt="KitapLab"
                width={92}
                height={92}
                priority
                className={styles.logoLight}
              />
              <Image
                src="/logo-gece.png"
                alt="KitapLab"
                width={92}
                height={92}
                priority
                className={styles.logoDark}
              />
            </div>

            <div>
              <p className={styles.brandName}>KİTAPLAB</p>
              <p className={styles.brandLine}>Oku · Yaz · Keşfet</p>
            </div>
          </div>

          <div className={styles.status}>
            <span className={styles.statusDot} aria-hidden="true" />
            Kısa bir bakım molası
          </div>

          <h1>
            Hikâyeler birazdan
            <span> kaldığı yerden devam edecek.</span>
          </h1>

          <p className={styles.description}>
            KitapLab&apos;ı daha hızlı, daha güvenli ve daha güçlü bir
            altyapıya taşıyoruz. Kitapların, bölümlerin ve tüm paylaşımların
            güvende.
          </p>

          <div className={styles.progressBlock} aria-label="Bakım ilerlemesi">
            <div className={styles.progressTop}>
              <span>Çalışmalar sürüyor</span>
              <span>Çok yakında</span>
            </div>
            <div className={styles.progressTrack}>
              <span className={styles.progressFill} />
            </div>
          </div>

          <ul className={styles.steps}>
            {steps.map((step, index) => (
              <li key={step}>
                <span className={styles.stepNumber}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{step}</span>
                <span className={styles.check} aria-hidden="true">
                  {index < 2 ? '✓' : '•'}
                </span>
              </li>
            ))}
          </ul>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.refreshButton}
              onClick={() => window.location.reload()}
            >
              <span aria-hidden="true">↻</span>
              Tekrar kontrol et
            </button>
            <p>Bir kahve molası ver, biz buradayız.</p>
          </div>
        </section>

        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} KitapLab</span>
          <span className={styles.footerDot} aria-hidden="true" />
          <span>Hikâyelerin buluşma noktası</span>
        </footer>
      </main>
    </div>
  );
}
