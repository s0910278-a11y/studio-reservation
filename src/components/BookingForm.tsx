import React, { useState, useEffect } from 'react';

const TIME_SLOTS = [
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", 
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
];

interface BookingFormProps {
  prefill?: { studio: string, date: string, startTime: string } | null;
  onSuccess?: () => void;
}

export default function BookingForm({ prefill, onSuccess }: BookingFormProps) {
  const [userType, setUserType] = useState<'member' | 'new'>('member');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    memberNo: '',
    studio: 'Studio A',
    date: '',
    startTime: '11:00',
    durationHours: 1,
    peopleCount: 1
  });
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [issuedMemberNo, setIssuedMemberNo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [bookedSlots, setBookedSlots] = useState<{ studioId: string, date: string, startTime: string, endTime: string }[]>([]);

  useEffect(() => {
    fetch('/api/bookings')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setBookedSlots(data);
        else if (data && Array.isArray(data.bookings)) setBookedSlots(data.bookings);
      })
      .catch(console.error);
  }, [prefill, success]);

  // Handle scroll on error (rejection)
  useEffect(() => {
    if (errorMsg && (errorMsg.includes('規約') || errorMsg.includes('受付不可'))) {
      const element = document.getElementById('booking-form');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [errorMsg]);

  // Calculate available durations based on selected start time
  const getAvailableDurations = () => {
    if (!formData.date || !formData.startTime) return [1];
    let max = 8; // Max 8 hours
    const [h, m] = formData.startTime.split(':').map(Number);
    const startMins = h * 60 + m;
    
    // Bounds check against 19:00 (1140 mins)
    const remainingMins = 1140 - startMins;
    max = Math.min(8, Math.floor(remainingMins / 60));

    // Check bookedSlots to see if anything blocks us
    for (const b of bookedSlots) {
       const bDate = (b.date || "").substring(0, 10);
       const fDate = (formData.date || "").substring(0, 10);
       if (b.studioId === formData.studio && bDate === fDate) {
          const [bh, bm] = b.startTime.split(':').map(Number);
          const bStartMins = bh * 60 + bm;
          if (bStartMins > startMins) { 
             const diffHours = (bStartMins - startMins) / 60;
             if (diffHours < max) max = Math.floor(diffHours);
          }
       }
    }
    
    const options = [];
    for (let i = 1; i <= max; i++) {
      options.push(i);
    }
    return options.length ? options : [1];
  };

  const availableDurations = getAvailableDurations();

  useEffect(() => {
    // If the currently selected duration is no longer allowed, reset to 1
    if (!availableDurations.includes(formData.durationHours)) {
      setFormData(prev => ({ ...prev, durationHours: availableDurations[0] || 1 }));
    }
  }, [formData.startTime, formData.date, formData.studio, bookedSlots]);

  useEffect(() => {
    if (prefill) {
      setFormData(prev => ({
        ...prev,
        studio: prefill.studio,
        date: prefill.date,
        startTime: prefill.startTime
      }));
    }
  }, [prefill]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      // ハイフン自動補完 (090-1234-5678 or 03-1234-5678)
      let cleaned = value.replace(/[^\d]/g, '');
      cleaned = cleaned.substring(0, 11); // 無限入力を防止 (最大11桁)
      let formatted = cleaned;
      if (cleaned.length > 10) {
        // 携帯電話など (11桁)
        formatted = cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
      } else if (cleaned.length === 10) {
        // 固定電話など (10桁)
        if (cleaned.startsWith('02') || cleaned.startsWith('03') || cleaned.startsWith('04') || cleaned.startsWith('05') || cleaned.startsWith('06') || cleaned.startsWith('07') || cleaned.startsWith('08') || cleaned.startsWith('09')) {
          // 一般的な市外局番の概算 (ここではざっくり2-4-4として扱う)
          formatted = cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
        } else {
          formatted = cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        }
      } else if (cleaned.length > 3) {
        // 入力途中の処理 (UX向上)
        if (cleaned.startsWith('090') || cleaned.startsWith('080') || cleaned.startsWith('070')) {
             if (cleaned.length > 7) formatted = cleaned.replace(/(\d{3})(\d{4})(\d{0,4})/, '$1-$2-$3');
             else formatted = cleaned.replace(/(\d{3})(\d{0,4})/, '$1-$2');
        } else if (cleaned.startsWith('03') || cleaned.startsWith('06')) {
             if (cleaned.length > 6) formatted = cleaned.replace(/(\d{2})(\d{4})(\d{0,4})/, '$1-$2-$3');
             else formatted = cleaned.replace(/(\d{2})(\d{0,4})/, '$1-$2');
        }
      }
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else if (name === 'memberNo') {
      // 半角英数字のみ・自動大文字化（全角や平仮名を弾く）
      let formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreed) {
      setErrorMsg('利用規約を確認し、同意のチェックを入れてください。');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Create payload based on user pattern
      const payload: any = {
        studio: formData.studio,
        date: formData.date,
        startTime: formData.startTime,
        durationHours: Number(formData.durationHours),
        peopleCount: Number(formData.peopleCount),
      };

      if (userType === 'member') {
        payload.memberNo = formData.memberNo;
      } else {
        payload.name = formData.name;
        payload.phone = formData.phone;
        payload.email = formData.email;
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message && (data.message.includes('規約') || data.message.includes('受付不可'))) {
          // BAN対象者への拒否メッセージ
          setErrorMsg(data.message);
          return;
        }
        setIssuedMemberNo(data.memberNo || formData.memberNo);
        setSuccess(true);
        if (onSuccess) onSuccess();
      } else {
        const data = await res.json();
        if (data.error && (data.error.includes("既に") || data.error.includes("occupied"))) {
          setErrorMsg('先に他のお客様の予約が確定したため、この枠は現在ご利用いただけません。');
        } else {
          setErrorMsg(data.error || '予約処理に失敗しました。');
        }
      }
    } catch (err) {
      setErrorMsg('ネットワークエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#fff', borderRadius: '12px', border: '2px solid var(--accent-blue)', marginTop: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <h3 style={{ color: 'var(--accent-blue)', marginBottom: '20px', fontSize: '1.5rem', fontWeight: 'bold' }}>✔ 予約が確定しました</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', lineHeight: '1.6' }}>
          ご入力のメールアドレス宛に「ご予約完了メールおよびキャンセルURL」をお送りしました。
        </p>

        <div style={{ backgroundColor: '#f0f7ff', padding: '20px', borderRadius: '8px', display: 'inline-block', textAlign: 'left', marginBottom: '30px', border: '1px solid var(--accent-blue)' }}>
          <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9rem' }}>あなたのご予約者番号（会員ナンバー）</p>
          <p style={{ margin: '0', fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{issuedMemberNo || 'メールをご確認ください'}</p>
          <p style={{ margin: '10px 0 0 0', color: '#666', fontSize: '0.8rem' }}>次回予約時や来店時にこちらの番号をお伝えください。</p>
        </div>

        <div>
          <button onClick={() => { setSuccess(false); setFormData(p => ({...p, name:'', phone:'', email:'', memberNo:''})) }} className="btn-primary" style={{ padding: '10px 30px' }}>
            新しい予約をする
          </button>
        </div>
      </div>
    );
  }

  // Calculate estimated price
  const estimatedPrice = formData.peopleCount * 440;

  return (
    <form id="booking-form" onSubmit={handleSubmit} style={{ marginTop: '30px' }}>
      <h3 style={{ marginBottom: '25px', color: 'var(--accent-blue)', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
        <span style={{ backgroundColor: 'var(--accent-blue)', color: 'white', padding: '4px 10px', borderRadius: '4px', marginRight: '10px', fontSize: '0.9rem' }}>STEP 2</span>
        お客様情報と予約内容の入力
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', marginBottom: '20px', fontWeight: 'bold' }}>
        ※予約は1ヶ月先まで可能です。
      </p>

      {errorMsg && (
        <div style={{ backgroundColor: 'rgba(229, 57, 53, 0.2)', color: '#e53935', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold' }}>
          {errorMsg}
        </div>
      )}

      {/* 2-Pattern User Type Toggle */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
        <div 
          onClick={() => setUserType('member')}
          style={{ 
            flex: 1, padding: '15px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', border: '2px solid',
            borderColor: userType === 'member' ? 'var(--accent-blue)' : 'var(--border-color)',
            backgroundColor: userType === 'member' ? 'rgba(0, 112, 243, 0.1)' : '#f5f5f5'
          }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>会員番号から予約</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>次回以降スムーズに予約可能</div>
        </div>
        <div 
          onClick={() => setUserType('new')}
          style={{ 
            flex: 1, padding: '15px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', border: '2px solid',
            borderColor: userType === 'new' ? 'var(--accent-blue)' : 'var(--border-color)',
            backgroundColor: userType === 'new' ? 'rgba(0, 112, 243, 0.1)' : '#f5f5f5'
          }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>新規登録して予約</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>初めての方はこちら</div>
        </div>
      </div>

      {userType === 'member' ? (
        <div className="panel" style={{ backgroundColor: '#ffffff', marginBottom: '25px', padding: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">会員ナンバー <span style={{color: 'var(--error-color)'}}>*</span></label>
            <input 
              type="text" 
              name="memberNo" 
              value={formData.memberNo}
              onChange={handleChange}
              className="form-input" 
              placeholder="英数字4桁" 
              required={userType === 'member'}
            />
          </div>
        </div>
      ) : (
        <div className="panel" style={{ backgroundColor: '#ffffff', marginBottom: '25px', padding: '20px' }}>
          <div className="form-group">
            <label className="form-label">お名前 <span style={{color: 'var(--error-color)'}}>*</span></label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required={userType === 'new'} className="form-input" placeholder="例: 八王子 太郎" />
          </div>
          <div className="form-group">
            <label className="form-label">お電話番号 <span style={{color: 'var(--error-color)'}}>*</span></label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required={userType === 'new'} className="form-input" placeholder="090-1234-5678" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">メールアドレス <span style={{color: 'var(--error-color)'}}>*</span></label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required={userType === 'new'} className="form-input" placeholder="example@email.com" />
            <div style={{ backgroundColor: 'rgba(229, 57, 53, 0.1)', padding: '10px', borderRadius: '6px', marginTop: '10px', border: '1px solid rgba(229, 57, 53, 0.4)' }}>
              <p className="form-error" style={{ color: '#ff8a80', fontSize: '0.85rem', lineHeight: '1.4', fontWeight: 'bold' }}>
                ※ご予約完了後に確認メールおよびキャンセルリンクを送信します。<br/>
                ※メールアドレスのスペル誤りがあるとメールが届きません。入力ミスがないか今一度ご確認ください。<br/>
              </p>
              <p style={{ color: '#666', fontSize: '0.75rem', marginTop: '5px' }}>
                (メールが届かない場合は、迷惑メールフォルダもご確認ください)<br/>
                ※予約完了後、次回以降に使える会員ナンバーが発行されます。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details */}
      <div className="form-group">
        <label className="form-label">ご希望スタジオ <span style={{color: 'var(--error-color)'}}>*</span></label>
        <select name="studio" value={formData.studio} onChange={handleChange} className="form-input" required>
          <option value="Studio A">Studio A</option>
          <option value="Studio B">Studio B</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
          <label className="form-label">ご利用日 <span style={{color: 'var(--error-color)'}}>*</span></label>
          <input 
            type="date" 
            name="date" 
            value={formData.date}
            onChange={handleChange}
            required 
            className="form-input" 
            min={new Date().toISOString().split('T')[0]}
            max={new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
          />
        </div>

        <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
          <label className="form-label">開始時間 <span style={{color: 'var(--error-color)'}}>*</span></label>
          <select 
            name="startTime" 
            value={formData.startTime}
            onChange={handleChange}
            required 
            className="form-input"
          >
            {TIME_SLOTS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
          <label className="form-label">ご利用時間 (1〜8時間) <span style={{color: 'var(--error-color)'}}>*</span></label>
          <select 
            name="durationHours" 
            value={formData.durationHours}
            onChange={handleChange}
            required 
            className="form-input"
          >
            {availableDurations.map(h => (
              <option key={h} value={h}>{h}時間</option>
            ))}
          </select>
          {availableDurations.length < 8 && availableDurations[0] !== 0 && (
            <p style={{ color: 'var(--accent-blue)', fontSize: '0.75rem', marginTop: '5px' }}>
              ※前後の予約枠により、最大{availableDurations[availableDurations.length - 1]}時間まで。
            </p>
          )}
        </div>
      </div>
      
      <div className="form-group">
        <label className="form-label">利用人数 <span style={{color: 'var(--error-color)'}}>*</span></label>
        <input 
          type="number" 
          name="peopleCount" 
          value={formData.peopleCount}
          onChange={handleChange}
          min="1"
          max="10"
          required 
          className="form-input" 
        />
      </div>

      <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '12px', marginTop: '20px', textAlign: 'center', border: '1px solid var(--accent-blue)' }}>
        <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '5px' }}>
          今回のご利用料金目安（{formData.studio} / {formData.peopleCount}名様 / {formData.durationHours}時間）
        </p>
        <h3 style={{ fontSize: '1.8rem', color: 'var(--accent-blue)', fontWeight: 'bold' }}>
          ¥{(formData.peopleCount * 440 * formData.durationHours).toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#555' }}>(税込)</span>
        </h3>
      </div>

      {/* 注意文の追加 */}
      <div style={{ marginTop: '25px', padding: '12px', border: '2px solid #e53935', borderRadius: '8px', backgroundColor: 'rgba(229, 57, 53, 0.1)' }}>
        <p style={{ color: '#ff5252', fontWeight: 'bold', fontSize: '0.85rem', margin: 0, lineHeight: '1.6', textAlign: 'center' }}>
          ⚠️ 重要：予約完了メールの受信をもって予約確定となります。<br/>
          ご利用当日、受付にて予約完了メールの画面をスタッフへご提示ください。
        </p>
      </div>

      <div style={{ marginTop: '25px', display: 'flex', alignItems: 'flex-start', gap: '10px', backgroundColor: '#fcfcfc', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <input 
          type="checkbox" 
          id="agreeTerms" 
          checked={agreed} 
          disabled={!hasScrolledToBottom && !agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          style={{ width: '20px', height: '20px', cursor: agreed || hasScrolledToBottom ? 'pointer' : 'not-allowed', marginTop: '2px' }}
        />
        <label htmlFor="agreeTerms" style={{ fontSize: '0.95rem', cursor: agreed || hasScrolledToBottom ? 'pointer' : 'not-allowed', flex: 1, opacity: agreed || hasScrolledToBottom ? 1 : 0.6 }}>
          <button 
            type="button" 
            onClick={() => setShowTerms(true)} 
            style={{ color: 'var(--accent-blue)', textDecoration: 'underline', fontWeight: 'bold', display: 'inline', padding: 0, background: 'none' }}
          >
            スタジオ利用規約
          </button>
          を確認し、同意しました <span style={{color: 'var(--error-color)'}}>*</span>
          {!hasScrolledToBottom && !agreed && <span style={{ fontSize: '0.8rem', marginLeft: '8px', color: 'var(--accent-blue)' }}>(規約を最後まで確認してください)</span>}
        </label>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '15px' }}>
          {loading ? '処理中...' : '▷ 予約を確定する'}
        </button>
      </div>

      <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
        <h4 style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>📍 スタジオ・店舗のロケーション確認</h4>
        <iframe 
          src="https://maps.google.com/maps?q=ハードオフ八王子大和田店&t=&z=15&ie=UTF8&iwloc=&output=embed" 
          width="100%" 
          height="300" 
          style={{ border: 0, borderRadius: '8px' }} 
          allowFullScreen 
          loading="lazy" 
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
        <div style={{ textAlign: 'right', marginTop: '10px' }}>
          <a href="https://maps.app.goo.gl/f3RwGf713h18qgaA6" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', fontSize: '0.9rem', textDecoration: 'underline' }}>
             Google Mapsアプリで開く
          </a>
        </div>
      </div>
      {/* Terms Modal */}
      {showTerms && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
          zIndex: 1000, padding: '20px' 
        }}>
          <div style={{ 
            backgroundColor: '#ffffff', maxWidth: '650px', width: '100%', maxHeight: '90vh', 
            borderRadius: '12px', display: 'flex', flexDirection: 'column', border: '1px solid #ddd', position: 'relative' 
          }}>
            <div style={{ padding: '20px 25px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
              <h3 style={{ margin: 0, color: 'var(--accent-blue)' }}>スタジオ利用規約</h3>
              <button onClick={() => setShowTerms(false)} style={{ fontSize: '1.5rem', color: '#999', padding: '5px' }}>&times;</button>
            </div>
            
            <div 
              onScroll={(e: any) => {
                const target = e.target;
                const isBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10; // 若干の余裕を持たせる
                if (isBottom) setHasScrolledToBottom(true);
              }}
              style={{ padding: '25px', fontSize: '0.95rem', lineHeight: '1.7', overflowY: 'auto', flex: 1, color: '#333' }}
            >
              <div style={{ whiteSpace: 'pre-wrap' }}>
                <p style={{ marginBottom: '20px', fontWeight: 'bold', color: '#1a1a1a', fontSize: '1.1rem', borderLeft: '4px solid var(--accent-blue)', paddingLeft: '10px' }}>
                  【スタジオ利用規約】
                </p>

                <p style={{ fontWeight: 'bold', color: '#1a1a1a', marginTop: '20px', marginBottom: '10px' }}>■ スタジオ利用料金について</p>
                <div style={{ marginLeft: '10px', marginBottom: '20px' }}>
                  1名様：400円（＋税）/1時間<br/>
                  2名様：800円（＋税）/1時間<br/>
                  3名様：1,200円（＋税）/1時間<br/>
                  <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>※年齢を問わず、上記の金額となります。</p>
                </div>

                <p style={{ fontWeight: 'bold', color: '#1a1a1a', marginTop: '20px', marginBottom: '10px' }}>■ スタジオ予約について</p>
                <div style={{ marginLeft: '10px', marginBottom: '20px' }}>
                  1か月先までの予約を受け付けします。<br/>
                  ご利用時間 11:00～19:00まで<br/>
                  <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>※当日の利用や時間延長は、アプリの予約空き状況により可能です。</p>
                </div>

                <p style={{ fontWeight: 'bold', color: '#1a1a1a', marginTop: '20px', marginBottom: '10px' }}>■ ご利用のキャンセルについて</p>
                <div style={{ marginLeft: '10px', marginBottom: '20px' }}>
                  キャンセル料金は原則発生いたしませんが、当日の利用時間の10分を過ぎてもご来店されない場合は、自動的にキャンセルとさせていただきます。<br/>
                  キャンセルを前提としての空予約は、ご遠慮願います。<br/>
                  <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>※同じお客様からの空予約が続く場合は、ご利用をお断りさせていただく場合がございますので、ご了承ください。</p>
                </div>

                <p style={{ fontWeight: 'bold', color: '#1a1a1a', marginTop: '20px', marginBottom: '10px' }}>■ スタジオ機材について</p>
                <div style={{ marginLeft: '10px', marginBottom: '20px' }}>
                  機材は修理などで予告なしに変更する場合がございます。<br/>
                  機材の不調や破損があった場合は、速やかにスタッフまでお知らせください。ご対応いたします。<br/>
                  <span style={{ color: 'var(--error-color)', fontSize: '0.85rem' }}>※スタジオご利用後にお伝えいただいても、その際のスタジオ利用料等はご返金できません。</span><br/><br/>
                  機材のお持ち込みは可能です。<br/>
                  <p style={{ fontSize: '0.9rem', color: '#555', marginTop: '5px' }}>
                    ※当店指定のエレキギター、エレキベースは、300円（＋税）/1時間でお貸し出しします。<br/>
                    ※電子ピアノ（ライトタッチ）、ダイナミックマイク、マイクケーブル、ギターシールドは無料貸出しです。<br/>
                    ※その他（ドラムスティックやスマホからイヤホン端子への変換アダプター等）の貸出しはございません。<br/>
                    ※レンタルについての詳細は、当店スタッフまでお尋ねください。<br/>
                    ※当スタジオ利用に際し、お持ち込みの機材の不調や破損があった場合は、ご対応いたしかねます。
                  </p>
                  <p style={{ marginTop: '10px' }}>
                    機材の破損については、故意に破損があった場合や、誤った使用方法、当店が定めるルール違反があった場合には、修理代金、または買い上げを請求させていただきます。<br/>
                    使用方法やご不明な点がございましたら、当店スタッフまでお尋ねください。
                  </p>
                </div>

                <p style={{ fontWeight: 'bold', color: '#1a1a1a', marginTop: '20px', marginBottom: '10px' }}>■ お願い</p>
                <div style={{ marginLeft: '10px', marginBottom: '20px', fontSize: '0.9rem' }}>
                  <ul style={{ paddingLeft: '20px', listStyleType: 'disc' }}>
                    <li style={{ marginBottom: '8px' }}>セルフスタジオとなりますので、基本セッティングを変えられた方は、お客様ご自身で元にお戻しください。</li>
                    <li style={{ marginBottom: '8px' }}>他のお客様のご迷惑にならないよう、お客様同士が気持ちよくスタジオをご利用いただくために、基本ルールとマナーを守ってください。</li>
                    <li style={{ marginBottom: '8px' }}>スタジオ内および八王子大和田店敷地内は禁煙です。</li>
                    <li style={{ marginBottom: '8px' }}>スタジオ内での飲酒や食べ物の持ち込みは禁止とさせていただきます。</li>
                    <li style={{ marginBottom: '8px' }}>アルコール以外の飲み物の持ち込みは、お一人様ペットボトル等（フタ付きの飲料）1本までとさせていただきます。</li>
                    <li style={{ marginBottom: '8px' }}>スタジオ内は火気厳禁です。</li>
                    <li style={{ marginBottom: '8px' }}>他のお客様のご迷惑にならないように、演奏中のスタジオへの入退出はなるべくご遠慮ください。</li>
                    <li style={{ marginBottom: '8px' }}>機材を移動させたり、セッティングを変更した場合は、必ず使用前の状態に戻してから退室をお願いします。<br/>（アンプやミキサーなどの設定、ドラムのセッティングなど）</li>
                    <li style={{ marginBottom: '8px' }}>アンプの電源を切る時や、シールドの抜き差しはボリュームをゼロにして行ってください。機材の故障につながります。お守りいただけず故障した場合は、料金を請求する場合がございます。</li>
                    <li style={{ marginBottom: '8px' }}>5分前には後片付けを始めて、時間内に退出できるようにお願いします。</li>
                    <li style={{ marginBottom: '8px' }}>忘れ物には十分にお気を付けください。当店では忘れ物の保管はいたしませんので、ご了承ください。</li>
                    <li style={{ marginBottom: '8px' }}>お客様の貴重品は、お客様ご自身で責任を持って管理してください。貴重品等の盗難や紛失があっても、責任を負いかねますのでご了承ください。</li>
                    <li style={{ marginBottom: '8px' }}>近隣周辺の迷惑にならないように、駐車場でのたむろ行為や路上駐車、ゴミやタバコのポイ捨てはおやめください。</li>
                    <li>度重なる違反や迷惑行為、悪質な違反があった時は、ご利用をお断りする場合があります。</li>
                  </ul>
                </div>
              </div>

              <div style={{ backgroundColor: '#f0f9ff', padding: '15px', borderRadius: '8px', border: '1px solid var(--accent-blue)', marginBottom: '10px', textAlign: 'center' }}>
                {!hasScrolledToBottom ? (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent-blue)', fontWeight: 'bold' }}>
                    ⬇ 規約を最後までスクロールして確認してください ⬇
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--success-color)', fontWeight: 'bold' }}>
                    ✔ 規約をすべて確認しました
                  </p>
                )}
              </div>

              <button 
                onClick={() => { setAgreed(true); setShowTerms(false); }} 
                className="btn-primary" 
                disabled={!hasScrolledToBottom}
                style={{ width: '100%', padding: '15px', opacity: hasScrolledToBottom ? 1 : 0.5, cursor: hasScrolledToBottom ? 'pointer' : 'not-allowed' }}
              >
                規約に同意して予約に進む
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
