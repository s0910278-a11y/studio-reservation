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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: '#222', borderRadius: '12px', padding: '30px', width: '100%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
        <h3 style={{ marginBottom: '5px', fontSize: '1.3rem' }}>手動予約の登録</h3>
        <p style={{ color: 'var(--accent-blue)', marginBottom: '20px', fontWeight: 'bold' }}>{studio} - {dateStr} {time}〜</p>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            type="button"
            onClick={() => setActiveTab('ID')} 
            className={`btn-outline ${activeTab === 'ID' ? 'active-tab' : ''}`}
            style={{ flex: 1, backgroundColor: activeTab === 'ID' ? 'var(--accent-blue)' : 'transparent', color: activeTab === 'ID' ? '#fff' : 'var(--text-secondary)' }}
          >会員番号で登録</button>
          <button 
            type="button"
            onClick={() => setActiveTab('NEW')} 
            className={`btn-outline ${activeTab === 'NEW' ? 'active-tab' : ''}`}
            style={{ flex: 1, backgroundColor: activeTab === 'NEW' ? 'var(--accent-blue)' : 'transparent', color: activeTab === 'NEW' ? '#fff' : 'var(--text-secondary)' }}
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
          <div style={{ marginBottom: '20px', borderTop: '1px solid #444', paddingTop: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>利用時間 (最大8時間)</label>
            <select 
              className="form-input" 
              value={durationHours} 
              onChange={e => setDurationHours(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(h => (
                <option key={h} value={h}>{h}時間</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', border: '1px solid #555', color: '#ccc', borderRadius: '4px', cursor: 'pointer' }}>キャンセル</button>
            <button type="submit" className="btn-primary" style={{ flex: 2, padding: '12px' }}>この枠を予約済みに変更</button>
          </div>
        </form>
      </div>
    </div>
  );
}
