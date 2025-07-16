"use client";
import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function ScannerPage() {
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState(null);
    const [cameras, setCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [scanMode, setScanMode] = useState('camera');
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef(null);

    useEffect(() => {
        const getCameras = async () => {
            try {
                console.log('Requesting camera permission...');
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });

                stream.getTracks().forEach(track => track.stop());

                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                console.log('Found cameras:', videoDevices);

                setCameras(videoDevices);
                if (videoDevices.length > 0) {
                    setSelectedCamera(videoDevices[0].deviceId);
                }
            } catch (err) {
                console.error('Camera permission error:', err);
                setError('Camera permission denied or not available: ' + err.message);
            }
        };

        getCameras();
    }, []);

    useEffect(() => {
        if (!selectedCamera || scanMode !== 'camera') {
            console.log('Scanner not starting:', { selectedCamera, scanMode });
            return;
        }

        const startScanner = async () => {
            console.log('Starting scanner with camera:', selectedCamera);
            setIsScanning(false);

            try {
                if (scannerRef.current) {
                    try {
                        if (scannerRef.current.isScanning) {
                            await scannerRef.current.stop();
                        }
                        await scannerRef.current.clear();
                    } catch (cleanupErr) {
                        console.log('Cleanup error (ignoring):', cleanupErr);
                    }
                }
                const html5Qrcode = new Html5Qrcode('reader');
                scannerRef.current = html5Qrcode;

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                };

                console.log('Attempting to start camera...');
                await html5Qrcode.start(
                    { deviceId: { exact: selectedCamera } },
                    config,
                    (decodedText) => {
                        console.log('Scan successful:', decodedText);
                        setScanResult(decodedText);
                        html5Qrcode.stop().catch(console.error);
                        setIsScanning(false);
                    },
                    (errorMessage) => {
                        if (!errorMessage.includes('No QR code detected') &&
                            !errorMessage.includes('No barcode detected') &&
                            !errorMessage.includes('QR code parse error')) {
                            console.log('Scan error:', errorMessage);
                        }
                    }
                );

                console.log('Scanner started successfully');
                setIsScanning(true);
                setError(null);
            } catch (err) {
                console.error('Scanner failed to start:', err);
                setError('Camera failed to start: ' + err.message + '. Please check camera permissions and try again.');
                setIsScanning(false);
            }
        };

        const timeoutId = setTimeout(startScanner, 100);

        return () => {
            clearTimeout(timeoutId);
            if (scannerRef.current) {
                try {
                    if (scannerRef.current.isScanning) {
                        scannerRef.current.stop().catch(console.error);
                    }
                } catch (err) {
                    console.log('Cleanup error on unmount:', err);
                }
                setIsScanning(false);
            }
        };
    }, [selectedCamera, scanMode]);

    const handleImageUpload = async (event) => {
        setError(null);
        setScanResult(null);

        if (!event.target.files?.length) return;

        const file = event.target.files[0];
        try {
            const result = await Html5Qrcode.scanFile(file, false);
            setScanResult(result);
        } catch (err) {
            setError('Scan failed: ' + err.message);
        }
    };

    const toggleScanMode = () => {
        setScanMode(prev => prev === 'camera' ? 'upload' : 'camera');
        setError(null);
        setScanResult(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">
                            Barcode Scanner
                        </h1>
                        <div className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                            {scanMode === 'camera' ? 'Camera Mode' : 'Upload Mode'}
                        </div>
                    </div>

                    <div className="flex gap-4 mb-6">
                        <button
                            className={`flex-1 py-3 rounded-lg font-medium transition-all ${scanMode === 'camera'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            onClick={() => setScanMode('camera')}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                                Camera Scan
                            </div>
                        </button>
                        <button
                            className={`flex-1 py-3 rounded-lg font-medium transition-all ${scanMode === 'upload'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            onClick={() => setScanMode('upload')}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Upload Image
                            </div>
                        </button>
                    </div>

                    {scanMode === 'camera' && cameras.length > 0 && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Camera:</label>
                            <select
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

                    {scanMode === 'camera' && (
                        <div className="mb-6">
                            <div
                                id="reader"
                                className="w-full h-64 bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center relative"
                            >
                                {!isScanning && (
                                    <div className="text-center p-4">
                                        <div className="animate-pulse mb-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-500">Initializing camera...</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 text-center">
                                <p className="text-sm text-gray-600">
                                    Point your camera at a barcode. Scanning will start automatically.
                                </p>
                            </div>
                        </div>
                    )}

                    {scanMode === 'upload' && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Upload Barcode Image:
                            </label>
                            <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="mb-2 text-sm text-gray-500">
                                            <span className="font-semibold">Click to upload</span> or drag and drop
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            JPG, PNG, or GIF (MAX. 5MB)
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium">Error</span>
                            </div>
                            <p className="mt-2 text-sm">{error}</p>
                        </div>
                    )}

                    {scanResult && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h2 className="text-lg font-semibold text-gray-800 mb-2">Scanned Result:</h2>
                            <div className="p-4 bg-white rounded-md border border-gray-200">
                                <p className="font-mono text-lg text-center text-blue-600">{scanResult}</p>
                            </div>
                            <button
                                onClick={() => setScanResult(null)}
                                className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                Scan Another
                            </button>
                        </div>
                    )}

                    {!scanResult && !error && (
                        <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                Scanning Tips
                            </h3>
                            <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
                                <li>Ensure good lighting conditions</li>
                                <li>Hold the camera steady and parallel to the barcode</li>
                                <li>Position the barcode within the scanning area</li>
                                <li>For image uploads, use clear, high-contrast images</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}