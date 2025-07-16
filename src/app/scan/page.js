"use client";
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const BarcodeScanner = dynamic(
    () => import('react-qr-barcode-scanner'),
    { ssr: false }
);

export default function ScannerPage() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [cameras, setCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState(null);

    // Get available cameras
    useEffect(() => {
        const getCameras = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                setCameras(videoDevices);
                if (videoDevices.length > 0) {
                    setSelectedCamera(videoDevices[0].deviceId);
                }
            } catch (err) {
                setError(new Error('Failed to access cameras: ' + err.message));
            }
        };

        getCameras();
    }, []);

    // Relaxed camera constraints
    const cameraConstraints = {
        deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
        facingMode: { ideal: ['environment', 'user'] }  // Try both rear and front cameras
    };

    return (
        <div>
            <h1>Barcode Scanner</h1>

            {/* Camera selector */}
            {cameras.length > 0 && (
                <div>
                    <label>Select Camera: </label>
                    <select
                        onChange={(e) => setSelectedCamera(e.target.value)}
                        value={selectedCamera || ''}
                    >
                        {cameras.map(camera => (
                            <option key={camera.deviceId} value={camera.deviceId}>
                                {camera.label || `Camera ${camera.deviceId.slice(0, 5)}`}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {error && <p className="error">Error: {error.message}</p>}

            <div style={{ width: '100%', maxWidth: '500px', height: '400px', margin: '1rem auto' }}>
                <BarcodeScanner
                    constraints={cameraConstraints}
                    onUpdate={(err, result) => {
                        if (err) {
                            setError(err);
                            return;
                        }
                        if (result) {
                            setData(result.text);
                            console.log('Scanned:', result.text);
                        }
                    }}
                    onError={setError}
                />
            </div>

            {data && (
                <div>
                    <h2>Scanned Data:</h2>
                    <p>{data}</p>
                </div>
            )}
        </div>
    );
}