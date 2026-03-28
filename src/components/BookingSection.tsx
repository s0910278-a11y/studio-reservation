'use client';
import React, { useState, useRef, useEffect } from 'react';
import Calendar from './Calendar';
import BookingForm from './BookingForm';

export default function BookingSection() {
  const [selectedSlot, setSelectedSlot] = useState<{ studio: string, date: string, startTime: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSlotClick = (studio: string, dateObj: Date, time: string) => {
    // Format date as YYYY-MM-DD
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    // Map Studio A/B to simple string
    const studioStr = studio === 'Studio A' ? 'Studio A' : 'Studio B';

    setSelectedSlot({ studio: studioStr, date: dateStr, startTime: time });
    
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className="panel" style={{ marginBottom: '40px' }}>
        <Calendar 
          onSlotClick={handleSlotClick} 
          selectedSlot={selectedSlot ? { studio: selectedSlot.studio, dateStr: selectedSlot.date, time: selectedSlot.startTime } : null} 
        />
      </div>
      
      <div className="panel" style={{ maxWidth: '600px', margin: '0 auto' }} ref={formRef}>
        <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>予約フォーム</h3>
        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '30px' }}>
          {selectedSlot 
            ? <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>カレンダーで選択した日時が反映されています。</span>
            : '予約は即時確定となります。'
          }
          <br/>
          ※予約可能時間: 11:00〜19:00<br/>
          ※無断キャンセル等は次回以降のご予約をお断りする場合がございます。
        </p>
        <BookingForm 
          prefill={selectedSlot} 
          onSuccess={() => {
            if (formRef.current) {
              formRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        />
      </div>
    </>
  );
}
