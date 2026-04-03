'use client';
import React, { useState } from 'react';

// Pricing UI Component
export default function Pricing() {
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [hours, setHours] = useState<number>(1);
  
  const calcPeople = Math.min(5, Math.max(1, peopleCount));
  const calcHours = Math.min(8, Math.max(1, hours));
  
  const basePricePerHour = 440;
  const totalPrice = calcPeople * basePricePerHour * calcHours;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <p style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--text-secondary)' }}>
        人数と時間に応じたシンプルな料金体系です（税込）。Aスタジオ・Bスタジオ共通。
      </p>

      {/* Calculator Tool */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', justifyContent: 'center' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <label style={{ marginBottom: '10px', fontWeight: 'bold' }}>利用人数</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button 
                onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                className="btn-outline" style={{ padding: '5px 15px', fontSize: '1.2rem' }}>-</button>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '40px', textAlign: 'center' }}>{peopleCount}</span>
              <button 
                onClick={() => setPeopleCount(Math.min(5, peopleCount + 1))}
                disabled={peopleCount >= 5}
                className="btn-outline" style={{ padding: '5px 15px', fontSize: '1.2rem', opacity: peopleCount >= 5 ? 0.3 : 1 }}>+</button>
              <span style={{ marginLeft: '5px' }}>名様</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <label style={{ marginBottom: '10px', fontWeight: 'bold' }}>利用時間</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button 
                onClick={() => setHours(Math.max(1, hours - 1))}
                className="btn-outline" style={{ padding: '5px 15px', fontSize: '1.2rem' }}>-</button>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '40px', textAlign: 'center' }}>{hours}</span>
              <button 
                onClick={() => setHours(Math.min(8, hours + 1))}
                disabled={hours >= 8}
                className="btn-outline" style={{ padding: '5px 15px', fontSize: '1.2rem', opacity: hours >= 8 ? 0.3 : 1 }}>+</button>
              <span style={{ marginLeft: '5px' }}>時間</span>
            </div>
          </div>

        </div>

        <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '20px', width: '100%' }}>
          <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>合計料金: </span>
          <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>¥{totalPrice.toLocaleString()}</span>
        </div>
      </div>

      <div style={{ marginTop: '30px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li style={{ color: 'var(--accent-blue)' }}>予約は1ヶ月先まで可能です。</li>
        </ul>
      </div>
    </div>
  );
}
