import React from 'react';
import Calendar from '../../components/Calendar';
import AutoRefresh from '../../components/AutoRefresh';
export const dynamic = 'force-dynamic';

export default function DisplayPage() {
  return (
    <div style={{ backgroundColor: '#111', height: '100vh', padding: '5px 15px', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AutoRefresh intervalMs={15000} />
      
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #333', paddingBottom: '8px', width: '100%', flexShrink: 0 }}>
        <div style={{ 
          backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold', 
          padding: '6px 12px', fontSize: '1.2rem', letterSpacing: '1px' 
        }}>
          HARD OFF<span style={{ color: '#ffea00', marginLeft: '8px' }}>MUSIC STUDIO</span>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.8rem', color: '#ffd700', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>本日の空き状況</h1>
        </div>
        <div style={{ width: '220px' }}></div> {/* Right Spacer for centering */}
      </header>
      
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', width: '100%', maxWidth: '1400px', margin: '0 auto', flex: 1, minHeight: 0 }}>
        {/* Studio A */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h2 style={{ fontSize: '1.6rem', color: '#3b82f6', margin: '0 0 4px 0', textAlign: 'center', fontWeight: 900, textShadow: '0 2px 5px rgba(0,0,0,0.8)', flexShrink: 0 }}>
            Studio A
          </h2>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Calendar defaultStudio="Studio A" hideTabs={true} hideNav={true} hideLegend={true} isDisplayMode={true} />
          </div>
        </div>
        
        {/* Studio B */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h2 style={{ fontSize: '1.6rem', color: '#6366f1', margin: '0 0 4px 0', textAlign: 'center', fontWeight: 900, textShadow: '0 2px 5px rgba(0,0,0,0.8)', flexShrink: 0 }}>
            Studio B
          </h2>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Calendar defaultStudio="Studio B" hideTabs={true} hideNav={true} hideLegend={true} isDisplayMode={true} />
          </div>
        </div>
      </div>

      {/* Shared Legend at bottom */}
      <div style={{ marginTop: '6px', marginBottom: '4px', display: 'flex', justifyContent: 'center', gap: '30px', fontSize: '1rem', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', padding: '6px 25px', borderRadius: '8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#1a1a1a', border: '1px solid #555', borderRadius: '3px' }}></div>
          <span>空き枠 (予約可)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#3b82f6', borderRadius: '3px' }}></div>
          <span>Studio A 予約済</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#6366f1', borderRadius: '3px' }}></div>
          <span>Studio B 予約済</span>
        </div>
      </div>
    </div>
  );
}
