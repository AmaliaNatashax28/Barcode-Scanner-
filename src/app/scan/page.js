"use client";
import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function ScannerPage() {
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState(null);
    const [cameras, setCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [scanMode, setScanMode] = useState('camera');
    const [isLoading, setIsLoading] = useState(false);
    const scannerRef = useRef(null);
    const scannerContainerRef = useRef(null);

    useEffect(() => {
        const getCameras = async () => {
            try {
                // First request camera permission
                await navigator.mediaDevices.getUserMedia({ video: true });

                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                console.log('Available cameras:', videoDevices);
                setCameras(videoDevices);
                if (videoDevices.length > 0) {
                    setSelectedCamera(videoDevices[0].deviceId);
                }
            } catch (err) {
                console.error('Camera access error:', err);
                setError('Camera access error: ' + err.message + '. Please allow camera access and refresh the page.');
            }
        };

        getCameras();
    }, []);

    useEffect(() => {
        if (scanMode !== 'camera' || !selectedCamera || !scannerContainerRef.current) {
            console.log('Scanner conditions not met:', { scanMode, selectedCamera, hasContainer: !!scannerContainerRef.current });
            return;
        }

        const initScanner = async () => {
            setIsLoading(true);
            try {
                console.log('Initializing scanner with camera:', selectedCamera);

                if (scannerRef.current && scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }

                const html5Qrcode = new Html5Qrcode(scannerContainerRef.current.id);
                scannerRef.current = html5Qrcode;

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                };

                await html5Qrcode.start(
                    { deviceId: { exact: selectedCamera } },
                    config,
                    (decodedText) => {
                        console.log('Scan successful:', decodedText);
                        setScanResult(decodedText);
                        html5Qrcode.stop();
                    },
                    (errorMessage) => {
                        // Only log non-routine errors
                        if (!errorMessage.includes('No QR code detected') && !errorMessage.includes('No barcode detected')) {
                            console.log('Scan error:', errorMessage);
                        }
                    }
                );

                console.log('Scanner started successfully');
                setError(null); // Clear any previous errors
            } catch (err) {
                console.error('Scanner initialization failed:', err);
                setError('Scanner initialization failed: ' + err.message + '. Make sure camera permission is granted.');
            } finally {
                setIsLoading(false);
            }
        };

        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
            initScanner();
        }, 100);

        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(console.error);
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
                <div>
                    {isLoading && (
                        <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-md">
                            Initializing camera...
                        </div>
                    )}
                    <div
                        id="reader"
                        ref={scannerContainerRef}
                        className="w-full h-64 bg-gray-100 rounded-md overflow-hidden"
                    />
                </div>
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