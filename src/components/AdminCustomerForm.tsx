'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminCustomerForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({ memberNo: '', name: '', phone: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); 
    setMsg('');
    try {
      const res = await fetch('/api/users', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(formData) 
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`登録完了: 会員証 [${data.memberNo}]`);
        setFormData({ memberNo: '', name: '', phone: '', email: '' });
        router.refresh();
      } else {
        setMsg(`エラー: ${data.error}`);
      }
    } catch(err) { 
      setMsg('ネットワークエラーが発生しました'); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
      <h4 style={{ marginBottom: '15px', fontSize: '1rem', color: '#fff' }}>新規顧客 手動登録</h4>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          placeholder="任意の会員番号 (空欄でランダム自動生成)" 
          value={formData.memberNo} 
          onChange={e=>setFormData({...formData, memberNo: e.target.value})} 
          className="form-input" 
          style={{marginBottom: '10px'}}
        />
        <input 
          type="text" 
          placeholder="氏名 (必須)" 
          value={formData.name} 
          onChange={e=>setFormData({...formData, name: e.target.value})} 
          required 
          className="form-input" 
          style={{marginBottom: '10px'}}
        />
        <input 
          type="tel" 
          placeholder="電話番号 (必須)" 
          value={formData.phone} 
          onChange={e=>setFormData({...formData, phone: e.target.value})} 
          required 
          className="form-input" 
          style={{marginBottom: '10px'}}
        />
        <input 
          type="email" 
          placeholder="メールアドレス (任意)" 
          value={formData.email} 
          onChange={e=>setFormData({...formData, email: e.target.value})} 
          className="form-input" 
          style={{marginBottom: '15px'}}
        />
        <button type="submit" className="btn-primary" disabled={loading} style={{width: '100%', padding: '10px'}}>
          {loading ? '登録中...' : '手入力で会員番号を発行'}
        </button>
        {msg && <p style={{marginTop: '10px', fontSize: '0.85rem', color: msg.includes('エラー') ? '#e53935' : '#4caf50', fontWeight: 'bold'}}>{msg}</p>}
      </form>
    </div>
  )
}
