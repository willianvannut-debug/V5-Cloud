"use client"
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// Resolve o bug do ícone sumir no Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Centraliza o mapa automaticamente
function RecenterAutomatically({ lat, lon }: { lat: number, lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], 17);
  }, [lat, lon, map]);
  return null;
}

interface MapaInterativoProps {
  latInicial: number;
  lonInicial: number;
  onPositionChange: (lat: number, lon: number) => void;
}

export default function MapaInterativo({ latInicial, lonInicial, onPositionChange }: MapaInterativoProps) {
  const [position, setPosition] = useState({ lat: latInicial, lng: lonInicial });
  const markerRef = useRef<any>(null);

  useEffect(() => {
    setPosition({ lat: latInicial, lng: lonInicial });
  }, [latInicial, lonInicial]);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const novaPosicao = marker.getLatLng();
          setPosition(novaPosicao);
          onPositionChange(novaPosicao.lat, novaPosicao.lng);
        }
      },
    }),
    [onPositionChange],
  );

  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden border-2 border-emerald-500/50 relative z-10">
      
      {/* A SOLUÇÃO: Puxando o CSS direto da web força o Next.js a desenhar o mapa */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      <MapContainer center={[position.lat, position.lng]} zoom={17} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterAutomatically lat={latInicial} lon={lonInicial} />
        <Marker draggable={true} eventHandlers={eventHandlers} position={position} ref={markerRef} icon={customIcon} />
      </MapContainer>
      
      <div className="absolute top-4 right-4 z-[400] bg-black/80 backdrop-blur-md px-4 py-2 rounded-lg border border-emerald-500 text-xs font-mono text-emerald-400 font-bold shadow-xl pointer-events-none">
        Arraste o pino para a casa exata!
      </div>
    </div>
  );
}