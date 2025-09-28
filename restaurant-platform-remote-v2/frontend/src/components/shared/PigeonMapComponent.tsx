import { useState, useCallback, useEffect } from 'react'
import { Map, Marker } from 'pigeon-maps'

interface PigeonMapComponentProps {
  center: { lat: number; lng: number }
  zoom?: number
  onLocationSelect?: (location: { lat: number; lng: number }) => void
  selectedLocation?: { lat: number; lng: number } | null
  readonly?: boolean
}

export default function PigeonMapComponent({ 
  center, 
  zoom = 13, 
  onLocationSelect, 
  selectedLocation,
  readonly = false 
}: PigeonMapComponentProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([center.lat, center.lng])
  const [mapZoom, setMapZoom] = useState(zoom)

  // Update map center when center prop changes
  useEffect(() => {
    setMapCenter([center.lat, center.lng])
  }, [center.lat, center.lng])

  const handleMapClick = useCallback(({ event, latLng, pixel }: any) => {
    if (!readonly && onLocationSelect && latLng) {
      const [lat, lng] = latLng
      onLocationSelect({ lat, lng })
    }
  }, [onLocationSelect, readonly])

  const handleBoundsChanged = useCallback(({ center, zoom }: any) => {
    setMapCenter(center)
    setMapZoom(zoom)
  }, [])

  return (
    <div className="relative w-full h-64 border border-gray-300 rounded-lg overflow-hidden">
      <Map
        height={256}
        center={mapCenter}
        zoom={mapZoom}
        onClick={handleMapClick}
        onBoundsChanged={handleBoundsChanged}
        provider={(x, y, z) => {
          // Use OpenStreetMap tiles
          return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
        }}
        attribution={
          <div style={{ fontSize: '11px', color: '#666' }}>
            © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
          </div>
        }
      >
        {selectedLocation && (
          <Marker 
            anchor={[selectedLocation.lat, selectedLocation.lng]}
            payload={1}
          />
        )}
      </Map>
      
      {/* Location info overlay */}
      {selectedLocation && (
        <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 px-2 py-1 rounded text-xs font-mono">
          📍 {Number(selectedLocation.lat).toFixed(6)}, {Number(selectedLocation.lng).toFixed(6)}
        </div>
      )}
      
      {!readonly && (
        <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs">
          Click to set location
        </div>
      )}
    </div>
  )
}