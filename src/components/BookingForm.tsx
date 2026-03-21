import React, { useState, useEffect } from 'react';

const TIME_SLOTS = [
  "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", 
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
];

interface BookingFormProps {
  prefill?: { studio: string, date: string, startTime: string } | null;
}

export default function BookingForm({ prefill }: BookingFormProps) {
  const [userType, setUserType] = useState<'member' | 'new'>('member');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    memberNo: '',
    studio: 'Studio A',
    date: '',
    startTime: '10:30',
    durationHours: 1,
    peopleCount: 1
  });

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

  // Calculate available durations based on selected start time
  const getAvailableDurations = () => {
    if (!formData.date || !formData.startTime) return [1];
    let max = 3; // Max 3 hours
    const [h, m] = formData.startTime.split(':').map(Number);
    const startMins = h * 60 + m;
    
    // Bounds check against 18:30 (1110 mins)
    if (startMins + 60 > 1110) max = 0;
    else if (startMins + 120 > 1110) max = 1;
    else if (startMins + 180 > 1110) max = 2;

    // Check bookedSlots to see if anything blocks us
    for (const b of bookedSlots) {
       if (b.studioId === formData.studio && b.date.startsWith(formData.date)) {
          const [bh, bm] = b.startTime.split(':').map(Number);
          const bStartMins = bh * 60 + bm;
          // If a booking starts AFTER our start time, the space between is our max limit.
          if (bStartMins > startMins) { 
             const diffHours = (bStartMins - startMins) / 60;
             if (diffHours < max) max = Math.floor(diffHours);
          }
       }
    }
    
    const options = [];
    if (max >= 1) options.push(1);
    if (max >= 2) options.push(2);
    if (max >= 3) options.push(3);
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
      <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid var(--accent-blue)', marginTop: '20px' }}>
        <h3 style={{ color: 'var(--accent-blue)', marginBottom: '20px', fontSize: '1.5rem', fontWeight: 'bold' }}>✔ 予約が確定しました</h3>
        <p style={{ color: '#ccc', marginBottom: '25px', lineHeight: '1.6' }}>
          ご入力のメールアドレス宛に「ご予約完了メールおよびキャンセルURL」をお送りしました。
        </p>

        <div style={{ backgroundColor: '#222', padding: '20px', borderRadius: '8px', display: 'inline-block', textAlign: 'left', marginBottom: '30px', border: '1px solid #333' }}>
          <p style={{ margin: '0 0 10px 0', color: '#888', fontSize: '0.9rem' }}>あなたのご予約者番号（会員ナンバー）</p>
          <p style={{ margin: '0', fontSize: '1.8rem', fontWeight: 'bold', color: 'white' }}>{issuedMemberNo || 'メールをご確認ください'}</p>
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
            borderColor: userType === 'member' ? 'var(--accent-blue)' : '#333',
            backgroundColor: userType === 'member' ? 'rgba(0, 112, 243, 0.1)' : '#222'
          }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>会員番号から予約</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>次回以降スムーズに予約可能</div>
        </div>
        <div 
          onClick={() => setUserType('new')}
          style={{ 
            flex: 1, padding: '15px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', border: '2px solid',
            borderColor: userType === 'new' ? 'var(--accent-blue)' : '#333',
            backgroundColor: userType === 'new' ? 'rgba(0, 112, 243, 0.1)' : '#222'
          }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>新規登録して予約</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>初めての方はこちら</div>
        </div>
      </div>

      {userType === 'member' ? (
        <div className="panel" style={{ backgroundColor: '#1a1a1a', marginBottom: '25px', padding: '20px' }}>
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
        <div className="panel" style={{ backgroundColor: '#1a1a1a', marginBottom: '25px', padding: '20px' }}>
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
              <p style={{ color: '#bbb', fontSize: '0.75rem', marginTop: '5px' }}>
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
          <label className="form-label">ご利用時間 (1〜3時間) <span style={{color: 'var(--error-color)'}}>*</span></label>
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
          {availableDurations.length < 3 && availableDurations[0] !== 0 && (
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

      <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px', marginTop: '20px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
          今回のご利用料金目安（{formData.studio} / {formData.peopleCount}名様 / {formData.durationHours}時間）
        </p>
        <h3 style={{ fontSize: '1.8rem', color: '#fff', fontWeight: 'bold' }}>
          ¥{(formData.peopleCount * 440 * formData.durationHours).toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>(税込)</span>
        </h3>
      </div>

      {/* 注意文の追加 */}
      <div style={{ marginTop: '25px', padding: '12px', border: '2px solid #e53935', borderRadius: '8px', backgroundColor: 'rgba(229, 57, 53, 0.1)' }}>
        <p style={{ color: '#ff5252', fontWeight: 'bold', fontSize: '0.85rem', margin: 0, lineHeight: '1.6', textAlign: 'center' }}>
          ⚠️ 重要：予約完了メールの受信をもって予約確定となります。<br/>
          ご利用当日、受付にて予約完了メールの画面をスタッフへご提示ください。
        </p>
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
    </form>
  );
}
