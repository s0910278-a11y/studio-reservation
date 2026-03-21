'use client';
import React, { useState } from 'react';

interface CalendarProps {
  onSlotClick?: (studio: string, date: Date, time: string) => void;
  defaultStudio?: 'Studio A' | 'Studio B';
  hideTabs?: boolean;
  isAdmin?: boolean;
  hideNav?: boolean;
  hideLegend?: boolean;
  weekOffsetOverride?: number;
  isDisplayMode?: boolean; // 外部モニター等表示専用モード
  selectedSlot?: { studio: string, dateStr: string, time: string } | null; // クリックされた枠の視覚維持用
}

// 予約可能期間: 当日から最大4週先まで
const MAX_WEEK_OFFSET = 4;
const MIN_WEEK_OFFSET = 0;

// カレンダーの行は30分刻み（予約可能最終時刻を17:30とし、18:30まで表示）
const TIME_SLOTS = [
  "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", 
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
];

// Placeholder for generating a 7-day week map starting from today
const generateWeek = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
};

const DOW = ['(日)', '(月)', '(火)', '(水)', '(木)', '(金)', '(土)'];

export default function Calendar({ onSlotClick, defaultStudio = 'Studio A', hideTabs = false, isAdmin = false, hideNav = false, hideLegend = false, weekOffsetOverride, isDisplayMode = false, selectedSlot }: CalendarProps) {
  const [activeStudio, setActiveStudio] = useState<'Studio A' | 'Studio B'>(defaultStudio);
  const [internalWeekOffset, setInternalWeekOffset] = useState(0);
  const weekOffset = weekOffsetOverride !== undefined ? weekOffsetOverride : internalWeekOffset;
  const setWeekOffset = weekOffsetOverride !== undefined ? () => {} : setInternalWeekOffset;
  const [bookedSlots, setBookedSlots] = useState<{ studioId: string, date: string, startTime: string, endTime: string, status?: string, name?: string, memberNo?: string }[]>([]);
  const [hoveredCell, setHoveredCell] = useState<{ dateIdx: number, timeIdx: number } | null>(null);

  React.useEffect(() => {
    const loadBookings = () => {
      fetch(`/api/bookings${isAdmin ? '?admin=true' : ''}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setBookedSlots(data);
          } else if (data && Array.isArray(data.bookings)) {
            setBookedSlots(data.bookings);
          }
        })
        .catch(console.error);
    };
    
    // 初回と15秒ごとの自動更新
    loadBookings();
    const interval = setInterval(loadBookings, 15000);
    return () => clearInterval(interval);
  }, []);

  // Helper to fetch the actual booking object for a slot
  const getBookingForSlot = (studioName: string, dateStr: string, timeStr: string) => {
    const matched = bookedSlots.filter(b => {
      return b.studioId === studioName && b.date.startsWith(dateStr) && b.startTime <= timeStr && timeStr < b.endTime;
    });
    if (matched.length === 0) return undefined;
    const active = matched.find(b => b.status === 'ACTIVE');
    if (active) return active;
    if (isAdmin) {
      return matched.find(b => b.status && b.status.startsWith('CANCELED'));
    }
    return undefined;
  };

  const isSlotOccupiedByActive = (studioName: string, dateStr: string, timeStr: string) => {
     const booking = getBookingForSlot(studioName, dateStr, timeStr);
     return !!booking && booking.status === 'ACTIVE';
  };

  // Helper to check if a 1-hour block (2 slots) starting at timeIdx is available
  const canBook1HourFrom = (studioName: string, dateStr: string, timeIdx: number) => {
    // 18:00 (index 15) は開始不可
    if (timeIdx >= TIME_SLOTS.length - 1) return false;
    const time1 = TIME_SLOTS[timeIdx];
    // 17:30 (最後から2番目) の場合、次のスロット(18:00)は描画行だが予約開始不可枠
    // 17:30開始→18:30終了の1時間枠は有効。18:00スロット自体がACTIVE予約で塞がれていなければOK
    const time2 = TIME_SLOTS[timeIdx + 1];
    return !isSlotOccupiedByActive(studioName, dateStr, time1) && !isSlotOccupiedByActive(studioName, dateStr, time2);
  };

  const isCellHovered = (dateIdx: number, timeIdx: number) => {
    if (!hoveredCell) return false;
    // 自分自身、または自分がホバーされたセルの真下（+1）であればホバー状態とする
    return hoveredCell.dateIdx === dateIdx && (hoveredCell.timeIdx === timeIdx || hoveredCell.timeIdx === timeIdx - 1);
  };

  // Real logic would fetch bookings. Using empty grid for UI setup.
  const weekDates = generateWeek().map(d => {
    const adjusted = new Date(d);
    adjusted.setDate(d.getDate() + (weekOffset * 7));
    return adjusted;
  });

  return (
    <div>
      {!isAdmin && !isDisplayMode && (
        <h3 style={{ marginBottom: '20px', color: 'var(--accent-blue)', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <span style={{ backgroundColor: 'var(--accent-blue)', color: 'white', padding: '4px 10px', borderRadius: '4px', marginRight: '10px', fontSize: '0.9rem' }}>STEP 1</span>
          ご希望のスタジオと日時を選択
        </h3>
      )}

      {/* Studio Tabs and Nav */}
      {!hideNav && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          
          {hideTabs ? (
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--accent-blue)' }}>
              {activeStudio}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className={`btn-outline ${activeStudio === 'Studio A' ? 'active-tab' : ''}`}
                style={{ 
                  backgroundColor: activeStudio === 'Studio A' ? 'var(--accent-blue)' : 'transparent',
                  borderColor: activeStudio === 'Studio A' ? 'var(--accent-blue)' : 'var(--border-color)'
                }}
                onClick={() => setActiveStudio('Studio A')}
              >
                Studio A
              </button>
              <button 
                className={`btn-outline ${activeStudio === 'Studio B' ? 'active-tab' : ''}`}
                style={{ 
                  backgroundColor: activeStudio === 'Studio B' ? 'var(--accent-blue)' : 'transparent',
                  borderColor: activeStudio === 'Studio B' ? 'var(--accent-blue)' : 'var(--border-color)'
                }}
                onClick={() => setActiveStudio('Studio B')}
              >
                Studio B
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => setWeekOffset(weekOffset - 1)} disabled={weekOffset <= MIN_WEEK_OFFSET} className="btn-outline" style={{ padding: '5px 10px', opacity: weekOffset <= MIN_WEEK_OFFSET ? 0.3 : 1 }}>&lt; 前の週</button>
            <span style={{ fontWeight: 'bold' }}>
              {weekDates[0].getFullYear()}年 {weekDates[0].getMonth()+1}月 {weekDates[0].getDate()}日 〜
            </span>
            <button onClick={() => setWeekOffset(weekOffset + 1)} disabled={weekOffset >= MAX_WEEK_OFFSET} className="btn-outline" style={{ padding: '5px 10px', opacity: weekOffset >= MAX_WEEK_OFFSET ? 0.3 : 1 }}>次の週 &gt;</button>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      {!isAdmin && !isDisplayMode && (
        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#888', marginBottom: '10px' }} className="mobile-scroll-hint">
          ← 横にスクロールして日付を確認できます →
        </div>
      )}
      <div style={{ overflowX: 'auto', overflowY: 'visible', width: '100%', border: '1px solid var(--border-color)', borderRadius: '8px', maxHeight: 'none' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isDisplayMode ? 'auto' : '600px', textAlign: 'center' }}>
          <thead>
            <tr>
              <th style={{ padding: isDisplayMode ? '5px' : '10px 15px', borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', backgroundColor: '#222' }}></th>
              {weekDates.map((date, idx) => (
                <th key={idx} suppressHydrationWarning style={{ padding: isDisplayMode ? '5px' : '10px 15px', borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', backgroundColor: '#222', width: '12%' }}>
                  <div suppressHydrationWarning style={{ fontSize: isDisplayMode ? '0.8rem' : '0.9rem' }}>{date.getMonth()+1}/{date.getDate()}</div>
                  <div suppressHydrationWarning style={{ fontSize: isDisplayMode ? '0.7rem' : '0.8rem', color: 'var(--text-secondary)' }}>{DOW[date.getDay()]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time, idx) => (
              <tr key={idx}>
                <td style={{ 
                  padding: 0, 
                  height: isDisplayMode ? '45px' : '32px', 
                  borderRight: '1px solid var(--border-color)', 
                  borderBottom: '1px solid transparent',
                  color: 'var(--text-secondary)', 
                  backgroundColor: '#222',
                  position: 'relative',
                  width: isDisplayMode ? '80px' : '65px'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: 0,
                    right: '8px',
                    transform: 'translateY(-50%)',
                    backgroundColor: '#222',
                    padding: '0 4px',
                    lineHeight: '1',
                    fontSize: isDisplayMode ? '1.1rem' : '0.9rem',
                    fontWeight: isDisplayMode ? 'bold' : 'normal',
                    zIndex: 2
                  }}>
                    {time}
                  </span>
                </td>
                {weekDates.map((date, colIdx) => {
                  const yyyy = date.getFullYear();
                  const mm = String(date.getMonth() + 1).padStart(2, '0');
                  const dd = String(date.getDate()).padStart(2, '0');
                  const dateStr = `${yyyy}-${mm}-${dd}`;
                  
                  const targetStudioStr = activeStudio === 'Studio A' ? 'Studio A' : 'Studio B';
                  
                  // This cell is occupied by an existing booking
                  const bookingObj = getBookingForSlot(targetStudioStr, dateStr, time);
                  const isOccupied = !!bookingObj && bookingObj.status === 'ACTIVE';
                  const isCanceledHistory = !!bookingObj && bookingObj.status?.startsWith('CANCELED');
                  
                  const canStart = !isOccupied && canBook1HourFrom(targetStudioStr, dateStr, idx);
                  const isInteractive = !isOccupied && canStart;

                  const isHighlighted = isInteractive && isCellHovered(colIdx, idx);
                  const isHoveredFromAbove = idx > 0 && isCellHovered(colIdx, idx) && canBook1HourFrom(targetStudioStr, dateStr, idx - 1);
                  const showAsActiveHover = isHighlighted || isHoveredFromAbove;

                  let bgColor = '#1a1a1a';
                  let borderTopColor = 'var(--border-color)';
                  let hoverTitle = '';
                  let opacity = 1;

                  if (bookingObj) {
                     const durationMins = (parseInt(bookingObj.endTime.split(':')[0])*60 + parseInt(bookingObj.endTime.split(':')[1])) - (parseInt(bookingObj.startTime.split(':')[0])*60 + parseInt(bookingObj.startTime.split(':')[1]));
                     const hours = durationMins / 60;
                     
                     if (isCanceledHistory) {
                        bgColor = '#1e1e1e'; // 透過・無効感
                        opacity = 0.5;
                        if (isAdmin) hoverTitle = `[キャンセル済] ${bookingObj.name || ''}`;
                        if (time === bookingObj.startTime) borderTopColor = '#333';
                     } else if (targetStudioStr === 'Studio A') {
                        bgColor = hours >= 3 ? '#1e3a8a' : (hours >= 2 ? '#1d4ed8' : '#3b82f6');
                     } else {
                        bgColor = hours >= 3 ? '#312e81' : (hours >= 2 ? '#4338ca' : '#6366f1');
                     }

                     if (isOccupied && time === bookingObj.startTime) {
                        borderTopColor = '#ffffff';
                     }

                     if (isAdmin && bookingObj.name && !isCanceledHistory) {
                        hoverTitle = `${bookingObj.name}様 (${bookingObj.memberNo || 'GUEST'}) - ${hours}H`;
                     }
                  }
                  
                  // Interactive hover (if available) overrides cancel background if admin hovers onto a canceled spot
                  if (showAsActiveHover) {
                     bgColor = 'var(--accent-blue-hover)';
                     opacity = 1;
                  }
                  
                  // Check if this slot was selected by the user
                  const isCurrentlySelected = selectedSlot && 
                    selectedSlot.studio === targetStudioStr && 
                    selectedSlot.dateStr === dateStr && 
                    (selectedSlot.time === time || selectedSlot.time === TIME_SLOTS[idx - 1]);

                  let boxShadowCSS = isOccupied && time === bookingObj?.startTime ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'none';
                  
                  if (isCurrentlySelected) {
                     boxShadowCSS = 'inset 0 0 0 2px #ffc107, 0 0 10px rgba(255,193,7,0.5)';
                     bgColor = 'var(--accent-blue-hover)';
                  }

                  return (
                    <td 
                      key={`${idx}-${colIdx}`} 
                      title={hoverTitle}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)', 
                        borderRight: '1px solid var(--border-color)',
                        borderTop: isOccupied && time === bookingObj?.startTime ? '2px solid #ffffff' : `1px solid ${borderTopColor}`,
                        cursor: isInteractive ? 'pointer' : (isOccupied ? 'default' : 'not-allowed'),
                        backgroundColor: bgColor,
                        opacity: opacity,
                        transition: 'background-color 0.1s, box-shadow 0.2s',
                        position: 'relative',
                        boxShadow: boxShadowCSS
                      }}
                      onMouseEnter={() => {
                        if (isInteractive) setHoveredCell({ dateIdx: colIdx, timeIdx: idx });
                      }}
                      onMouseLeave={() => {
                        if (isInteractive) setHoveredCell(null);
                      }}
                      onClick={() => {
                        if (isInteractive && onSlotClick) {
                          onSlotClick(activeStudio, date, time);
                        } else if (isInteractive) {
                          window.location.assign('#booking-form');
                        }
                      }}
                    >
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* 18:30 終端境界ラベル */}
            <tr>
               <td style={{ 
                  padding: 0, 
                  height: isDisplayMode ? '20px' : '16px', 
                  borderRight: '1px solid var(--border-color)', 
                  color: 'var(--text-secondary)', 
                  backgroundColor: '#222', 
                  position: 'relative',
                }}>
                  <span style={{
                    position: 'absolute',
                    top: 0,
                    right: '8px',
                    transform: 'translateY(-50%)',
                    backgroundColor: '#222',
                    padding: '0 4px',
                    lineHeight: '1',
                    fontSize: isDisplayMode ? '1.1rem' : '0.9rem',
                    fontWeight: isDisplayMode ? 'bold' : 'normal',
                    zIndex: 2
                  }}>
                    18:30
                  </span>
               </td>
               {weekDates.map((_, colIdx) => (
                 <td key={`end-${colIdx}`} style={{ backgroundColor: 'transparent' }}></td>
               ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      {!hideLegend && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '15px', fontSize: '0.85rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#1a1a1a', border: '1px solid #555', borderRadius: '2px' }}></div>
            <span>空き枠 (予約可)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '2px' }}></div>
            <span>予約済 (Studio A)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#6366f1', borderRadius: '2px' }}></div>
            <span>予約済 (Studio B)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#222', borderRadius: '2px' }}></div>
            <span>時間外・選択不可</span>
          </div>
        </div>
      )}
    </div>
  );
}
