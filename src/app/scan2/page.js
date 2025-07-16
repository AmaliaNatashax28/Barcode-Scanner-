"use client";
import { useState, useEffect, useRef } from 'react';

export default function ScannerPage() {
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState(null);
    const [cameras, setCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [scanMode, setScanMode] = useState('camera');
    const [isScanning, setIsScanning] = useState(false);
    const [isSupported, setIsSupported] = useState(true);

    const videoRef = useRef(null);
    const readerRef = useRef(null);

    useEffect(() => {
        const initZXing = async () => {
            try {
                const { BrowserMultiFormatReader } = await import('@zxing/browser');
                readerRef.current = new BrowserMultiFormatReader();

                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    setIsSupported(false);
                    setError('Camera access is not supported in this browser');
                    return;
                }

                const cameraList = await readerRef.current.listVideoInputDevices();
                setCameras(cameraList);
                if (cameraList.length > 0) {
                    setSelectedCamera(cameraList[0].deviceId);
                }
            } catch (err) {
                setError(`Failed to initialize scanner: ${err.message}`);
                setIsSupported(false);
            }
        };

        initZXing();

        return () => {
            if (readerRef.current) {
                readerRef.current.reset();
            }
        };
    }, []);

    // Start/stop camera scanner
    useEffect(() => {
        if (!readerRef.current || !selectedCamera || scanMode !== 'camera') return;

        const startScanner = async () => {
            try {
                setIsScanning(true);
                setError(null);
                setScanResult(null);

                await readerRef.current.decodeFromVideoDevice(
                    selectedCamera,
                    videoRef.current,
                    (result, err) => {
                        if (result) {
                            setScanResult(result.getText());
                            stopScanner();
                        }
                        if (err && !(err.name === 'NotFoundException')) {
                            setError(err.message || 'Scanning error');
                        }
                    }
                );
            } catch (err) {
                setError(`Camera error: ${err.message}`);
                setIsScanning(false);
            }
        };

        const stopScanner = () => {
            if (readerRef.current) {
                readerRef.current.reset();
                setIsScanning(false);
            }
        };

        startScanner();

        return () => {
            stopScanner();
        };
    }, [selectedCamera, scanMode]);

    const handleImageUpload = async (e) => {
        setError(null);
        setScanResult(null);

        if (!e.target.files?.length) return;

        const file = e.target.files[0];
        const fileUrl = URL.createObjectURL(file);

        try {
            const { BrowserMultiFormatReader } = await import('@zxing/browser');
            const reader = new BrowserMultiFormatReader();

            const result = await reader.decodeFromImageUrl(fileUrl);
            setScanResult(result.getText());
        } catch (err) {
            if (err.name === 'NotFoundException') {
                setError('No barcode found in the image');
            } else {
                setError(`Scan failed: ${err.message}`);
            }
        } finally {
            URL.revokeObjectURL(fileUrl);
        }
    };

    const resetScanner = () => {
        setScanResult(null);
        setError(null);
        if (scanMode === 'camera' && readerRef.current) {
            readerRef.current.reset();
            setIsScanning(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
                        Barcode Scanner
                    </h1>

                    <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
                        <button
                            className={`flex-1 py-2 rounded-md transition-colors ${scanMode === 'camera'
                                ? 'bg-white shadow-sm font-medium'
                                : 'text-gray-600'
                                }`}
                            onClick={() => setScanMode('camera')}
                            disabled={!isSupported}
                        >
                            Camera Scan
                        </button>
                        <button
                            className={`flex-1 py-2 rounded-md transition-colors ${scanMode === 'upload'
                                ? 'bg-white shadow-sm font-medium'
                                : 'text-gray-600'
                                }`}
                            onClick={() => setScanMode('upload')}
                        >
                            Upload Image
                        </button>
                    </div>

                    {scanMode === 'camera' && cameras.length > 0 && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Camera:
                            </label>
                            <select
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                onChange={(e) => setSelectedCamera(e.target.value)}
                                value={selectedCamera || ''}
                            >
                                {cameras.map(camera => (
                                    <option key={camera.deviceId} value={camera.deviceId}>
                                        {camera.label || `Camera ${camera.deviceId.slice(0, 10)}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Camera view */}
                    {scanMode === 'camera' && (
                        <div className="mb-6">
                            <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3]">
                                <video
                                    ref={videoRef}
                                    className="w-full h-full object-contain"
                                    muted
                                    playsInline
                                />

                                {/* Scanner overlay */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="border-2 border-red-500 rounded-lg w-64 h-64 relative">
                                        <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-red-500"></div>
                                        <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-red-500"></div>
                                        <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-red-500"></div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-red-500"></div>

                                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-red-500 bg-opacity-30 animate-pulse"></div>
                                    </div>
                                </div>

                                {!isScanning && (
                                    <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                                        <div className="text-center text-white">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
                                            <p>Starting camera...</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <p className="text-center text-sm text-gray-500 mt-2">
                                Point your camera at a barcode to scan
                            </p>
                        </div>
                    )}

                    {scanMode === 'upload' && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Upload Barcode Image:
                            </label>
                            <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        <p className="mb-2 text-sm text-gray-500">
                                            <span className="font-semibold">Click to upload</span>
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            JPG, PNG, GIF (MAX. 5MB)
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

                    {!isSupported && scanMode === 'camera' && (
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-yellow-700">
                                Camera access is not supported in your browser. Please try Chrome, Firefox, or Edge.
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    {scanResult && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h2 className="font-semibold text-gray-800 mb-2">Scanned Result:</h2>
                            <div className="p-3 bg-white rounded-md border border-gray-200">
                                <p className="text-lg font-mono text-center text-blue-600 break-all">{scanResult}</p>
                            </div>
                            <button
                                onClick={resetScanner}
                                className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                Scan Again
                            </button>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h3 className="font-semibold text-blue-800 mb-2">How to scan:</h3>
                        <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
                            <li>Ensure good lighting on the barcode</li>
                            <li>Hold steady about 6-12 inches from the barcode</li>
                            <li>Align barcode within the scanning frame</li>
                            {scanMode === 'upload' && <li>Upload clear, well-lit images of barcodes</li>}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}