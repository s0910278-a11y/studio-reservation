'use client';
import React, { useState, useEffect } from 'react';

// Data structure for the equipment item from sheet
type EquipmentItem = {
  studio: string;
  category: string;
  name: string;
  subCategory: string;
};

export default function Equipment() {
  const [activeStudio, setActiveStudio] = useState<'Studio A' | 'Studio B'>('Studio A');
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEquipment = async () => {
      try {
        const res = await fetch('/api/equipment');
        const data = await res.json();
        
        if (Array.isArray(data)) {
          const mapped = data.map((item: any) => ({
            studio: item['スタジオ'] || '',
            category: item['カテゴリー'] || '',
            name: item['名称'] || '',
            subCategory: item['サブカテゴリー'] || ''
          }));
          setEquipment(mapped);
        }
      } catch (err) {
        console.error('Failed to load equipment:', err);
      } finally {
        setLoading(false);
      }
    };
    loadEquipment();
  }, []);

  // Filter and Grouping Logic
  const filtered = equipment.filter(item => item.studio === activeStudio);
  const categories = Array.from(new Set(filtered.map(item => item.category)));
  const grouped = categories.map(cat => ({
    category: cat,
    items: filtered.filter(item => item.category === cat)
  }));

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>
        機材情報を読み込み中...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <p style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        ※機材はメンテナンス等により予告なく変更される場合があります。
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '40px' }}>
        <button 
          className={`btn-outline ${activeStudio === 'Studio A' ? 'active-tab' : ''}`}
          style={{ 
            backgroundColor: activeStudio === 'Studio A' ? 'var(--accent-blue)' : 'transparent',
            borderColor: activeStudio === 'Studio A' ? 'var(--accent-blue)' : 'var(--border-color)',
            padding: '10px 30px',
            fontSize: '1.1rem'
          }}
          onClick={() => setActiveStudio('Studio A')}
        >
          Studio A
        </button>
        <button 
          className={`btn-outline ${activeStudio === 'Studio B' ? 'active-tab' : ''}`}
          style={{ 
            backgroundColor: activeStudio === 'Studio B' ? 'var(--accent-blue)' : 'transparent',
            borderColor: activeStudio === 'Studio B' ? 'var(--accent-blue)' : 'var(--border-color)',
            padding: '10px 30px',
            fontSize: '1.1rem'
          }}
          onClick={() => setActiveStudio('Studio B')}
        >
          Studio B
        </button>
      </div>

      {/* Empty State */}
      {grouped.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          現在、機材データが登録されていません。
        </div>
      )}

      {/* Equipment List by Category */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {grouped.map((sec, secIdx) => (
          <div key={secIdx} className="panel" style={{ padding: '20px' }}>
            <h3 style={{ 
              fontSize: '1rem', 
              color: 'var(--accent-blue)', 
              borderBottom: '2px solid var(--accent-blue)', 
              paddingBottom: '8px',
              marginBottom: '15px',
              fontWeight: 'bold'
            }}>
              {sec.category}
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {sec.items.map((item, itemIdx) => (
                <li key={itemIdx} style={{ 
                  padding: '10px 0', 
                  borderBottom: itemIdx === sec.items.length - 1 ? 'none' : '1px solid #333',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: '500' }}>{item.name}</span>
                  {item.subCategory && (
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--text-secondary)',
                      backgroundColor: '#2a2a2a',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {item.subCategory}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
