import React, { useState } from 'react';

interface AdminBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { memberNo?: string; name?: string; phone?: string; email?: string; durationHours?: number; }) => void;
  studio: string;
  dateStr: string;
  time: string;
}

export default function AdminBookingModal({ isOpen, onClose, onSubmit, studio, dateStr, time }: AdminBookingModalProps) {
  const [activeTab, setActiveTab] = useState<'ID' | 'NEW'>('ID');
  const [memberNo, setMemberNo] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [durationHours, setDurationHours] = useState(1);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'ID') {
      if (!memberNo.trim()) {
        alert('会員番号を入力してください。');
        return;
      }
      onSubmit({ memberNo: memberNo.trim().toUpperCase(), durationHours });
    } else {
      if (!name.trim()) {
        alert('氏名は必須です。');
        return;
      }
      onSubmit({ name: name.trim(), phone: phone.trim(), email: email.trim(), durationHours });
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '35px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '5px', fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>手動予約の登録</h3>
        <p style={{ color: 'var(--accent-blue)', marginBottom: '25px', fontSize: '0.95rem', fontWeight: 'bold' }}>{studio} - {dateStr} {time}〜</p>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', backgroundColor: '#f5f5f5', padding: '5px', borderRadius: '10px' }}>
          <button 
            type="button"
            onClick={() => setActiveTab('ID')} 
            style={{ 
              flex: 1, 
              padding: '10px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              backgroundColor: activeTab === 'ID' ? '#ffffff' : 'transparent', 
              color: activeTab === 'ID' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'ID' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >会員番号で登録</button>
          <button 
            type="button"
            onClick={() => setActiveTab('NEW')} 
            style={{ 
              flex: 1, 
              padding: '10px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              backgroundColor: activeTab === 'NEW' ? '#ffffff' : 'transparent', 
              color: activeTab === 'NEW' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'NEW' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >情報手入力で登録</button>
        </div>

        <form onSubmit={handleSubmit}>
          {activeTab === 'ID' ? (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>会員番号 (必須)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="例: A9AR" 
                value={memberNo} 
                onChange={e => setMemberNo(e.target.value)} 
                required 
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>氏名 (必須)</label>
                <input type="text" className="form-input" placeholder="例: 楽器太郎" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>電話番号 (任意)</label>
                <input type="tel" className="form-input" placeholder="例: 090-0000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>メールアドレス (任意)</label>
                <input type="email" className="form-input" placeholder="例: example@zero-emission.co.jp" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
          )}

          {/* 共通: 利用時間選択 */}
          <div style={{ marginBottom: '25px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>利用時間 (最大8時間)</label>
            <select 
              className="form-input" 
              value={durationHours} 
              onChange={e => setDurationHours(Number(e.target.value))}
              style={{ backgroundColor: '#fcfcfc' }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(h => (
                <option key={h} value={h}>{h}時間</option>
              ))}
            </select>
          </div>
 
          <div style={{ display: 'flex', gap: '15px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s ease' }}>キャンセル</button>
            <button type="submit" className="btn-primary" style={{ flex: 2, padding: '14px' }}>予約を確定する</button>
          </div>
        </form>
      </div>
    </div>
  );
}
