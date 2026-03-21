'use client';
import React, { useState } from 'react';

// Data structure for the equipment list
type EquipmentItem = { name: string, subCategory: string, image: string, imagePos?: string };

const equipmentData: Record<string, { category: string, items: EquipmentItem[] }[]> = {
  'Studio A': [
    {
      category: 'GUITAR AMP',
      items: [
        { name: 'Fender FM212R', subCategory: 'Combo', image: 'https://rvb-img.reverb.com/i/s--PllrDFkx--/quality=medium-low,height=800,width=800,fit=contain/ba711208-e189-4933-9167-cf20fd7040f5.jpg' },
        { name: 'Jet City50', subCategory: 'Amp Head', image: 'https://rvb-img.reverb.com/i/s--Qbi9gpBx--/quality=medium-low,height=800,width=800,fit=contain/judxainulva9mge1fjp9.jpg' },
        { name: 'MESA BOOGIE 12インチ×2', subCategory: 'Cabinet', image: 'https://rvb-img.reverb.com/i/s--vu_Iue76--/quality=medium-low,height=800,width=800,fit=contain/us7qtcrwgq9fderlfbbr.jpg' },
      ]
    },
    {
      category: 'BASS AMP',
      items: [
        { name: 'TRACE ELLIOT GP7', subCategory: 'Combo', image: 'https://rvb-img.reverb.com/i/s--t90_TS8i--/quality=medium-low,height=800,width=800,fit=contain/vypzy2y46tiexqevbxup.jpg' },
      ]
    },
    {
      category: 'DRUMS',
      items: [
        { name: 'Pearl Standard Maple', subCategory: 'Drum Kit', image: 'https://drumcenternh.com/cdn/shop/files/Pearl_MM6P943XPSCMastersMaple103PianoBlack.webp?v=1719152329' },
      ]
    }
  ],
  'Studio B': [
    {
      category: 'GUITAR AMP',
      items: [
        { name: 'Roland JC-120', subCategory: 'Combo', image: 'https://static.roland.com/assets/images/products/gallery/jc-120_front_panel_gal.jpg' },
        { name: 'PEAVEY 5150', subCategory: 'Combo', image: 'https://rvb-img.reverb.com/i/s--JR-gDD4G--/quality=medium-low,height=800,width=800,fit=contain/e54d127c-5146-479e-ab62-8fca2ce3d4bc.jpeg' },
      ]
    },
    {
      category: 'BASS AMP',
      items: [
        { name: 'Ampeg BA-115', subCategory: 'Combo', image: 'https://rvb-img.reverb.com/i/s--9usBFqmH--/quality=medium-low,height=800,width=800,fit=contain/nzc0uxcvwkrs1ubpfkyt.jpg' },
      ]
    },
    {
      category: 'DRUMS',
      items: [
        { name: 'Pearl Forum Series', subCategory: 'Drum Kit', image: 'https://rvb-img.reverb.com/i/s--nDpo00g4--/quality=medium-low,height=800,width=800,fit=contain/dzfa8r8myls44qlh3asc.jpg' },
      ]
    }
  ]
};

export default function Equipment() {
  const [activeStudio, setActiveStudio] = useState<'Studio A' | 'Studio B'>('Studio A');

  return (
    <div>
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

      {/* Equipment List */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
        {equipmentData[activeStudio].flatMap(sec => sec.items.map(item => ({...item, categoryName: sec.category}))).map((item, itemIdx) => (
          <div key={itemIdx} className="panel" style={{ width: '200px', flex: '0 0 auto', padding: '15px' }}>
            <img 
              src={item.image} 
              alt={item.name} 
              style={{ 
                width: '100%', 
                height: '110px', 
                objectFit: 'cover', 
                objectPosition: item.imagePos || 'center',
                backgroundColor: '#333', 
                marginBottom: '10px', 
                borderRadius: '6px' 
              }} 
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{item.name}</h4>
            </div>
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '0.8rem', 
              marginTop: '5px',
              display: 'inline-block',
              backgroundColor: '#333',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              {item.categoryName} - {item.subCategory}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
