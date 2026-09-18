"use client"
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const customPin = L.divIcon({
  className: 'custom-pin',
  html: `<div style="background-color: #62c073; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #000; box-shadow: 0 0 20px #62c073;"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

function RecenterMap({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    // Zoom 18 para focar nos lotes e casas
    map.setView(coords, 18, { animate: true });
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

export default function MapaSimulacao({ coords, setCoords }: { coords: [number, number], setCoords: (c: [number, number]) => void }) {
  return (
    <MapContainer 
      center={coords} 
      zoom={18} 
      maxZoom={19}
      minZoom={10}
      style={{ width: '100%', height: '100%', background: '#0a0a0c' }}
    >
      {/* Essa URL (Voyager) é a que melhor renderiza os quadradinhos das casas e lotes gratuitamente */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        maxZoom={19}
      />
      <RecenterMap coords={coords} />
      <ClickHandler setCoords={setCoords} />
      <Marker position={coords} icon={customPin} />
    </MapContainer>
  );
}