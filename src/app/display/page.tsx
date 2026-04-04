import React from 'react';
import Calendar from '../../components/Calendar';
import AutoRefresh from '../../components/AutoRefresh';
export const dynamic = 'force-dynamic';

export default function DisplayPage() {
  return (
    <div style={{ backgroundColor: '#ffffff', height: '100vh', padding: '5px 15px', color: '#1a1a1a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AutoRefresh intervalMs={15000} />
      
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', borderBottom: '2px solid #efefef', paddingBottom: '8px', width: '100%', flexShrink: 0 }}>
        <div style={{ 
          backgroundColor: '#0066cc', color: 'white', fontWeight: 'bold', 
          padding: '6px 12px', fontSize: '1.2rem', letterSpacing: '1px', borderRadius: '4px'
        }}>
          HARD OFF<span style={{ color: '#ffea00', marginLeft: '8px' }}>MUSIC STUDIO</span>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.8rem', color: '#333', margin: 0, fontWeight: 'bold' }}>本日の空き状況</h1>
        </div>
        <div style={{ width: '220px' }}></div> {/* Right Spacer for centering */}
      </header>
      
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', width: '100%', maxWidth: '1400px', margin: '0 auto', flex: 1, minHeight: 0 }}>
        {/* Studio A */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h2 style={{ fontSize: '1.6rem', color: '#0066cc', margin: '0 0 4px 0', textAlign: 'center', fontWeight: 900, flexShrink: 0 }}>
            Studio A
          </h2>
          <div style={{ flex: 1, minHeight: 0, border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
            <Calendar defaultStudio="Studio A" hideTabs={true} hideNav={true} hideLegend={true} isDisplayMode={true} />
          </div>
        </div>
        
        {/* Studio B */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h2 style={{ fontSize: '1.6rem', color: '#4f46e5', margin: '0 0 4px 0', textAlign: 'center', fontWeight: 900, flexShrink: 0 }}>
            Studio B
          </h2>
          <div style={{ flex: 1, minHeight: 0, border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
            <Calendar defaultStudio="Studio B" hideTabs={true} hideNav={true} hideLegend={true} isDisplayMode={true} />
          </div>
        </div>
      </div>

      {/* Shared Legend at bottom */}
      <div style={{ marginTop: '10px', marginBottom: '8px', display: 'flex', justifyContent: 'center', gap: '40px', fontSize: '1.1rem', fontWeight: 'bold', backgroundColor: '#f8f9fa', padding: '10px 30px', borderRadius: '12px', border: '1px solid #eee', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#ffffff', border: '2px solid #ccc', borderRadius: '4px' }}></div>
          <span>空き枠 (予約可)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#3b82f6', borderRadius: '4px' }}></div>
          <span>Studio A 予約済</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#6366f1', borderRadius: '4px' }}></div>
          <span>Studio B 予約済</span>
        </div>
      </div>
    </div>
  );
}
