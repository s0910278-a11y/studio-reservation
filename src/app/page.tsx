import React from 'react';
import BookingSection from '../components/BookingSection';
import Pricing from '../components/Pricing';
import Equipment from '../components/Equipment';

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section style={{ 
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.7), rgba(255,255,255,0.8)), url("/hero-bg-v4.jpg")', 
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        padding: '120px 20px',
        textAlign: 'center'
      }}>
        <div className="container">
          <h1 style={{ fontSize: '3.5rem', marginBottom: '15px', fontWeight: 'bold' }}>ハードオフ八王子大和田店<br/>楽器スタジオ予約</h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '40px' }}>ハードオフ八王子大和田店 楽器スタジオ</p>
          <a href="#booking" className="btn-primary" style={{ display: 'inline-block', maxWidth: '300px' }}>
            <span style={{ marginRight: '8px' }}>📅</span>予約・空き状況
          </a>
          <p style={{ marginTop: '20px', fontSize: '1rem', color: '#666' }}>ネット予約 受付中（即時確定）</p>
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
      <section id="price" className="section" style={{ backgroundColor: '#f9f9f9' }}>
        <div className="container">
          <h2 className="section-title">ご利用料金</h2>
          <Pricing />
        </div>
      </section>

      {/* Equipment List Section */}
      <section id="equipment" className="section" style={{ backgroundColor: '#ffffff' }}>
        <div className="container">
          <h2 className="section-title">機材リスト</h2>
          <Equipment />
        </div>
      </section>

      {/* Access Section */}
      <section id="access" className="section" style={{ backgroundColor: '#f5f5f5' }}>
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
