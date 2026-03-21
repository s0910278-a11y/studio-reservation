import React from 'react';
import BookingSection from '../components/BookingSection';
import Pricing from '../components/Pricing';
import Equipment from '../components/Equipment';

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section style={{ 
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url("/hero-bg-v4.jpg")', 
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        padding: '120px 20px',
        textAlign: 'center'
      }}>
        <div className="container">
          <h1 style={{ fontSize: '3.5rem', marginBottom: '15px', fontWeight: 'bold' }}>八王子で、<br/>最高の音を。</h1>
          <p style={{ fontSize: '1.2rem', color: '#e0e0e0', marginBottom: '40px' }}>ハードオフ八王子大和田店 楽器スタジオ</p>
          <a href="#booking" className="btn-primary" style={{ display: 'inline-block', maxWidth: '300px' }}>
            <span style={{ marginRight: '8px' }}>📅</span>予約・空き状況
          </a>
          <p style={{ marginTop: '20px', fontSize: '1rem', color: '#ccc' }}>ネット予約 受付中（即時確定）</p>
        </div>
      </section>

      {/* Booking Section */}
      <section id="booking" className="section">
        <div className="container">
          <h2 className="section-title">スタジオ予約</h2>
          <p style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--text-secondary)' }}>
            以下の空き状況カレンダーから、ご希望の時間帯を選択してください。
          </p>
          <BookingSection />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="price" className="section" style={{ backgroundColor: '#111' }}>
        <div className="container">
          <h2 className="section-title">ご利用料金</h2>
          <Pricing />
        </div>
      </section>

      {/* Equipment List Section */}
      <section id="equipment" className="section" style={{ backgroundColor: '#151515' }}>
        <div className="container">
          <h2 className="section-title">機材リスト</h2>
          <Equipment />
        </div>
      </section>

      {/* Access Section */}
      <section id="access" className="section" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 className="section-title">アクセス</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '1.1rem' }}>ハードオフ八王子大和田店 楽器スタジオ</p>
          <iframe 
            src="https://maps.google.com/maps?q=ハードオフ八王子大和田店&t=&z=15&ie=UTF8&iwloc=&output=embed" 
            width="100%" 
            height="400" 
            style={{ border: 0, borderRadius: '8px', maxWidth: '800px', margin: '0 auto', display: 'block' }} 
            allowFullScreen 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <a href="https://maps.app.goo.gl/f3RwGf713h18qgaA6" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', fontSize: '1rem', textDecoration: 'underline' }}>
               Google Mapsで開く
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
