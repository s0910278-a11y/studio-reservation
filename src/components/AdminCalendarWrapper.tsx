'use client';
import React, { useState, useEffect } from 'react';
import Calendar from './Calendar';
import AdminBookingModal from './AdminBookingModal';

const generateWeekStartDates = (offset: number) => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i + (offset * 7));
    dates.push(d);
  }
  return dates;
};

export default function AdminCalendarWrapper() {
  const [loading, setLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ studio: string, dateStr: string, time: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const weekDates = generateWeekStartDates(weekOffset);

  const handleAdminSlotClick = (studio: string, dateObj: Date, time: string) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    console.log(`[AdminWrapper] Slot Clicked! Studio: ${studio}, Date: ${dateStr}, Time: ${time}`);
    setSelectedSlot({ studio, dateStr, time });
    setModalOpen(true);
  };

  const handleModalSubmit = async (data: any) => {
    if (!selectedSlot) return;
    setModalOpen(false);
    setLoading(true);

    const payload = data.memberNo 
      ? { memberNo: data.memberNo, name: `【手動登録】`, phone: '(管理者代行入力)', email: '', studio: selectedSlot.studio, date: selectedSlot.dateStr, startTime: selectedSlot.time, peopleCount: 1, durationHours: data.durationHours || 1 }
      : { name: `【手動登録】${data.name}`, phone: data.phone || '(管理者代行入力)', email: data.email || 'admin@zero-emission.co.jp', memberNo: 'ADMIN', studio: selectedSlot.studio, date: selectedSlot.dateStr, startTime: selectedSlot.time, peopleCount: 1, durationHours: data.durationHours || 1 };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('✅ 手動予約が登録され、枠がブロックされました。');
        window.location.reload();
      } else {
        const error = await res.json();
        alert(`❌ エラーが発生しました: ${error.error}`);
      }
    } catch (err) {
      alert('ネットワークエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {loading && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>登録中...</span>
        </div>
      )}

      {/* Shared Nav */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
          <button onClick={() => setWeekOffset(weekOffset - 1)} className="btn-outline" style={{ padding: '5px 15px' }}>&lt; 前の週</button>
          <span suppressHydrationWarning style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
            <span suppressHydrationWarning>{weekDates[0].getFullYear()}</span>年 <span suppressHydrationWarning>{weekDates[0].getMonth()+1}</span>月 <span suppressHydrationWarning>{weekDates[0].getDate()}</span>日 〜
          </span>
          <button onClick={() => setWeekOffset(weekOffset + 1)} className="btn-outline" style={{ padding: '5px 15px' }}>次の週 &gt;</button>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent-blue)', marginBottom: '10px', textAlign: 'center' }}>Studio A</div>
          <Calendar onSlotClick={handleAdminSlotClick} defaultStudio="Studio A" hideTabs={true} isAdmin={true} hideNav={true} hideLegend={true} weekOffsetOverride={weekOffset} selectedSlot={selectedSlot} />
        </div>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent-blue)', marginBottom: '10px', textAlign: 'center' }}>Studio B</div>
          <Calendar onSlotClick={handleAdminSlotClick} defaultStudio="Studio B" hideTabs={true} isAdmin={true} hideNav={true} hideLegend={true} weekOffsetOverride={weekOffset} selectedSlot={selectedSlot} />
        </div>
      </div>

      {/* Shared Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '30px', fontSize: '0.9rem', flexWrap: 'wrap', backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#1a1a1a', border: '1px solid #555', borderRadius: '3px' }}></div>
          <span>空き枠（予約可）</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#3b82f6', borderRadius: '3px' }}></div>
          <span>予約済（Studio A）</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#6366f1', borderRadius: '3px' }}></div>
          <span>予約済（Studio B）</span>
        </div>
      </div>

      {selectedSlot && (
        <AdminBookingModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          onSubmit={handleModalSubmit}
          studio={selectedSlot.studio}
          dateStr={selectedSlot.dateStr}
          time={selectedSlot.time}
        />
      )}
    </div>
  );
}
