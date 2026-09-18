"use client"
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

function RecenterMap({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, 17, { animate: true });
  }, [coords, map]);
  return null;
}

function ClickHandler({ setCoords }: { setCoords: (c: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setCoords([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function MapaLeaflet({ coords, setCoords }: { coords: [number, number], setCoords: (c: [number, number]) => void }) {
  const [tipoCamada, setTipoCamada] = useState<'satelite' | 'ruas'>('satelite');

  const customPin = L.divIcon({
    className: 'custom-pin',
    html: `<div style="background-color: #62c073; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #000; box-shadow: 0 0 20px #62c073;"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-3 right-3 z-[1000] bg-zinc-900/90 border border-white/20 p-1 rounded-lg flex gap-1 shadow-2xl backdrop-blur">
        <button
          type="button"
          onClick={() => setTipoCamada('satelite')}
          className={`px-3 py-1.5 rounded font-mono text-[11px] font-bold uppercase transition-all cursor-pointer ${
            tipoCamada === 'satelite' ? 'bg-[#62c073] text-black shadow' : 'text-zinc-300 hover:text-white'
          }`}
        >
          Satélite Real
        </button>
        <button
          type="button"
          onClick={() => setTipoCamada('ruas')}
          className={`px-3 py-1.5 rounded font-mono text-[11px] font-bold uppercase transition-all cursor-pointer ${
            tipoCamada === 'ruas' ? 'bg-[#62c073] text-black shadow' : 'text-zinc-300 hover:text-white'
          }`}
        >
          Ruas
        </button>
      </div>

      <MapContainer 
        center={coords} 
        zoom={17} 
        maxZoom={21}
        minZoom={10}
        style={{ width: '100%', height: '100%', background: '#0a0a0c' }}
      >
        {tipoCamada === 'satelite' ? (
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={21}
            maxNativeZoom={17}
            tileSize={256}
            keepBuffer={4}
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={21}
            maxNativeZoom={19}
          />
        )}
        <RecenterMap coords={coords} />
        <ClickHandler setCoords={setCoords} />
        <Marker position={coords} icon={customPin} />
      </MapContainer>
    </div>
  );
}