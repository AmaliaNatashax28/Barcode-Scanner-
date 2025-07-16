"use client";
import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function ScannerPage() {
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState(null);
    const [cameras, setCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [scanMode, setScanMode] = useState('camera');
    const scannerRef = useRef(null);
    const scannerContainerRef = useRef(null);

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
                setError('Camera access error: ' + (err).message);
            }
        };

        getCameras();
    }, []);

    useEffect(() => {
        if (scanMode !== 'camera' || !selectedCamera || !scannerContainerRef.current) return;

        const initScanner = async () => {
            try {
                if (scannerRef.current && scannerRef.current.isScanning) {
                    scannerRef.current.stop();
                }

                const html5Qrcode = new Html5Qrcode(scannerContainerRef.current.id);
                scannerRef.current = html5Qrcode;

                await html5Qrcode.start(
                    { deviceId: { exact: selectedCamera } },
                    { fps: 10 },
                    (decodedText) => {
                        setScanResult(decodedText);
                        html5Qrcode.stop();
                    },
                    (errorMessage) => {
                        if (!errorMessage.includes('No QR code detected')) {
                            setError(`Scan error: ${errorMessage}`);
                        }
                    }
                );
            } catch (err) {
                setError('Scanner initialization failed: ' + (err).message);
            }
        };

        initScanner();

        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop();
            }
        };
    }, [selectedCamera, scanMode]);

    const handleImageUpload = async (event) => {
        setError(null);
        setScanResult(null);

        if (!event.target.files?.length) return;

        const file = event.target.files[0];
        try {
            const html5Qrcode = new Html5Qrcode("reader");
            const result = await html5Qrcode.scanFile(file, false);
            setScanResult(result);
        } catch (err) {
            setError('Scan failed: ' + (err).message);
        }
    };

    const toggleScanMode = () => {
        setScanMode(prev => prev === 'camera' ? 'upload' : 'camera');
        setError(null);
        setScanResult(null);
    };

    return (
        <div className="p-4 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Barcode Scanner</h1>

            <div className="flex gap-4 mb-4">
                <button
                    className={`px-4 py-2 rounded-md ${scanMode === 'camera' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setScanMode('camera')}
                >
                    Camera Scan
                </button>
                <button
                    className={`px-4 py-2 rounded-md ${scanMode === 'upload' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setScanMode('upload')}
                >
                    Upload Image
                </button>
            </div>

            {scanMode === 'camera' && cameras.length > 0 && (
                <div className="mb-4">
                    <label className="block mb-1">Select Camera: </label>
                    <select
                        className="w-full p-2 border rounded-md"
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

            {scanMode === 'upload' && (
                <div className="mb-4">
                    <label className="block mb-2">Upload Barcode Image:</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="w-full p-2 border rounded-md"
                    />
                </div>
            )}

            {scanMode === 'camera' && (
                <div
                    id="reader"
                    ref={scannerContainerRef}
                    className="w-full h-64 bg-gray-100 rounded-md overflow-hidden"
                />
            )}

            {error && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
                    Error: {error}
                </div>
            )}

            {scanResult && (
                <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">
                    <h2 className="font-bold">Scanned Result:</h2>
                    <p className="mt-1 font-mono">{scanResult}</p>
                </div>
            )}
        </div>
    );
}