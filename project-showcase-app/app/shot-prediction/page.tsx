'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import {
  calculateAngle,
  calculateDistance,
  calculateDistanceToGoal,
  calculateSpeed,
  buildShotPayload,
  validateShotData,
} from '@/app/utils/shotCalculations';
import ProbabilityPieChart from '@/app/components/ProbabilityPieChart';

interface ShotPin {
  x: number;
  y: number;
  label: string;
}

interface ShotFormData {
  timeSinceLastEvent: number | '';
  shotType: string;
  lastEventCategory: string;
  shotRebound: boolean;
  shotRush: boolean;
  offWing: boolean;
  shootingTeamPlayerDiff: number | '';
}

interface PredictionResponse {
  prediction: string;
  probability: Record<string, number>;
  success: boolean;
}

export default function ShotPredictionPage() {
  const [pins, setPins] = useState<ShotPin[]>([
    { x: -200, y: 0, label: 'Event' },
    { x: -200, y: 0, label: 'Shot' },
  ]);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [draggingPinIndex, setDraggingPinIndex] = useState<number>(-1);
  const mapRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<ShotFormData>({
    timeSinceLastEvent: '',
    shotType: 'WRIST',
    lastEventCategory: 'SHOT',
    shotRebound: false,
    shotRush: false,
    offWing: false,
    shootingTeamPlayerDiff: '',
  });

  // Hockey rink dimensions (approximate)
  const RINK_WIDTH = 200; // feet
  const RINK_HEIGHT = 85; // feet

  // Global mouse up listener to deselect pins when dragging ends
  useEffect(() => {
    const handleMouseUp = () => {
      setDraggingPinIndex(-1);
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handlePinMouseDown = (index: number) => {
    setDraggingPinIndex(index);
    setErrors([]);
  };

  const handleRinkMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingPinIndex === -1 || !mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    // Convert to rink coordinates: center at 0,0 with x range -100 to 100, y range -42.5 to 42.5
    const pixelX = (e.clientX - rect.left) / rect.width;
    const pixelY = (e.clientY - rect.top) / rect.height;

    // Convert to rink feet: x from -100 to 100 (centered), y from -42.5 to 42.5 (inverted, positive at top)
    const x = (pixelX - 0.5) * RINK_WIDTH;
    const y = (0.5 - pixelY) * RINK_HEIGHT;

    // Clamp coordinates to rink bounds
    const clampedX = Math.max(-100, Math.min(100, x));
    const clampedY = Math.max(-42.5, Math.min(42.5, y));

    const updatedPins = [...pins];
    updatedPins[draggingPinIndex] = {
      ...updatedPins[draggingPinIndex],
      x: parseFloat(clampedX.toFixed(2)),
      y: parseFloat(clampedY.toFixed(2)),
    };
    setPins(updatedPins);
  };

  const handleRinkMouseUp = () => {
    setDraggingPinIndex(-1);
  };

  const handleFormChange = (
    field: keyof ShotFormData,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors([]);
  };

  const handleClearPins = () => {
    setPins([
      { x: -200, y: 0, label: 'Event' },
      { x: -200, y: 0, label: 'Shot' },
    ]);
    setPrediction(null);
    setErrors([]);
  };

  const arePinsOnRink = pins[0].x >= -100 && pins[0].x <= 100 && pins[1].x >= -100 && pins[1].x <= 100;

  const handlePrediction = async () => {
    if (!arePinsOnRink) {
      setErrors(['Please place both pins on the rink']);
      return;
    }

    const shotData = {
      timeSinceLastEvent:
        typeof formData.timeSinceLastEvent === 'number' ? formData.timeSinceLastEvent : 0,
      xCord: pins[1].x,
      yCord: pins[1].y,
      shotType: formData.shotType,
      shotRebound: formData.shotRebound ? 1 : 0,
      shotRush: formData.shotRush ? 1 : 0,
      offWing: formData.offWing ? 1 : 0,
      lastEventxCord: pins[0].x,
      lastEventyCord: pins[0].y,
      lastEventCategory: formData.lastEventCategory,
      shootingTeamPlayerDiff:
        typeof formData.shootingTeamPlayerDiff === 'number'
          ? formData.shootingTeamPlayerDiff
          : 0,
    };

    const validation = validateShotData(shotData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    setErrors([]);
    try {
      const payload = buildShotPayload(shotData);
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setPrediction(data);
      } else {
        setErrors(['Error: Unable to get prediction']);
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Unknown error occurred']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, #0d1324, #1a2550)' }}>
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 bg-opacity-95 backdrop-blur-md border-b border-green-500/20" style={{ backgroundColor: '#00205b' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white flex items-center gap-2 hover:text-green-400 transition-all duration-300">
            <span>🏒</span>
            <span>Hockey Analytics</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link href="/home" className="text-white hover:text-green-400 transition-all duration-300 font-semibold">
              Home
            </Link>
            <Link href="/shot-prediction" className="text-green-400 transition-all duration-300 font-semibold border-b-2 border-green-400">
              Shot Prediction
            </Link>
            <Link href="/topic-analysis" className="text-white hover:text-green-400 transition-all duration-300 font-semibold">
              Topic Analysis
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">🎯 Shot Prediction</h1>
          <p className="text-xl text-gray-300">
            Drag the pins onto the rink: red for the event, blue for the shot position
          </p>
        </div>

        <div className="flex justify-center w-full">
          <div className="grid lg:grid-cols-3 gap-8 w-full lg:max-w-fit">
            {/* Map Area */}
            <div className="lg:col-span-2 space-y-8">
            <div className="bg-linear-to-b from-white/10 to-white/5 border-2 border-green-500/30 rounded-2xl p-8">
              {/* Draggable pins outside rink */}
              <div className="flex gap-4 mb-4">
                {pins.map((pin, index) => {
                  const isOnRink = pin.x >= -100 && pin.x <= 100;
                  if (isOnRink) return null;

                  return (
                    <div
                      key={index}
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 ${
                        draggingPinIndex === index ? 'cursor-grabbing opacity-70' : 'cursor-grab'
                      }`}
                      style={{
                        backgroundColor: index === 0 ? '#ce1141' : '#47aae8',
                        borderColor: 'white',
                      }}
                      title={`${pin.label} - Drag onto rink`}
                      onMouseDown={() => handlePinMouseDown(index)}
                    >
                      {index === 0 ? 'E' : 'S'}
                    </div>
                  );
                })}
              </div>

              <div
                ref={mapRef}
                onMouseMove={handleRinkMouseMove}
                onMouseUp={handleRinkMouseUp}
                onMouseLeave={handleRinkMouseUp}
                className="relative w-full aspect-video bg-white rounded-lg border-4 border-dashed border-white/30 cursor-crosshair hover:border-white/50 transition-colors overflow-hidden"
              >
                {/* Rink markings */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.8 }}>
                  {/* Center line at x = 0 (50% in pixel space) - solid red 5px */}
                  <line x1="50%" y1="0" x2="50%" y2="100%" stroke="red" strokeWidth="5" />
                  {/* Goal line at x = -100 (0% in pixel space) */}
                  <line x1="0%" y1="0" x2="0%" y2="100%" stroke="red" strokeWidth="2" />
                  {/* Goal line at x = 100 (100% in pixel space) - red line */}
                  <line x1="100%" y1="0" x2="100%" y2="100%" stroke="red" strokeWidth="2" />
                  {/* Blue line at x = -25 (37.5% in pixel space) - 25 ft from center toward goal */}
                  <line x1="37.5%" y1="0" x2="37.5%" y2="100%" stroke="blue" strokeWidth="2" />
                  {/* Blue line at x = 25 (62.5% in pixel space) - 25 ft from center toward opponent goal */}
                  <line x1="62.5%" y1="0" x2="62.5%" y2="100%" stroke="blue" strokeWidth="2" />
                </svg>

                {/* Goal marker at (100, 0) - Blue semicircle */}
                <svg
                  className="absolute pointer-events-none"
                  style={{
                    left: '100%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '40px',
                    height: '40px',
                  }}
                  viewBox="0 0 40 40"
                >
                  <path
                    d="M 20 0 A 20 20 0 0 0 20 40 Z"
                    fill="#4a90e2"
                    opacity="0.8"
                  />
                  <title>Goal (100, 0)</title>
                </svg>

                {/* Pins on rink */}
                {pins.map((pin, index) => {
                  const isOnRink = pin.x >= -100 && pin.x <= 100;
                  if (!isOnRink) return null;

                  return (
                    <div
                      key={index}
                      className={`absolute w-8 h-8 rounded-full transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-white font-bold text-sm border-2 ${
                        draggingPinIndex === index ? 'cursor-grabbing opacity-70' : 'cursor-grab'
                      }`}
                      style={{
                        left: `${(pin.x / RINK_WIDTH + 0.5) * 100}%`,
                        top: `${(0.5 - pin.y / RINK_HEIGHT) * 100}%`,
                        backgroundColor: index === 0 ? '#ce1141' : '#47aae8',
                        borderColor: 'white',
                      }}
                      title={`${pin.label}: (${pin.x.toFixed(1)}, ${pin.y.toFixed(1)})`}
                      onMouseDown={() => handlePinMouseDown(index)}
                    >
                      {index === 0 ? 'E' : 'S'}
                    </div>
                  );
                })}

                {/* Empty state message */}
                {!arePinsOnRink && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/40 pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl mb-2">Drag pins onto the rink</p>
                      <p className="text-sm">{pins.filter(p => p.x >= -100 && p.x <= 100).length}/2 pins on rink</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Coordinates and Metrics Display */}
              {arePinsOnRink && (
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {pins.map((pin, index) => (
                      <div key={index} className="bg-white/10 border border-white/20 rounded-lg p-4">
                        <p className="text-white/60 text-sm mb-2 font-semibold">{pin.label}</p>
                        <p className="text-white font-mono text-sm">X: {pin.x.toFixed(1)}ft</p>
                        <p className="text-white font-mono text-sm">Y: {pin.y.toFixed(1)}ft</p>
                      </div>
                    ))}
                  </div>

                  {arePinsOnRink && (
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 space-y-2">
                      <p className="text-green-400 font-semibold text-sm">Calculated Metrics</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="text-gray-300">
                          Shot Distance:
                          <p className="text-green-400 font-mono">
                            {calculateDistanceToGoal(pins[1].x, pins[1].y).toFixed(2)}ft
                          </p>
                        </div>
                        <div className="text-gray-300">
                          Shot Angle:
                          <p className="text-green-400 font-mono">
                            {calculateAngle(pins[1].x, pins[1].y).toFixed(2)}°
                          </p>
                        </div>
                        <div className="text-gray-300">
                          Last Event Angle:
                          <p className="text-green-400 font-mono">
                            {calculateAngle(pins[0].x, pins[0].y).toFixed(2)}°
                          </p>
                        </div>
                        <div className="text-gray-300">
                          Event Distance:
                          <p className="text-green-400 font-mono">
                            {calculateDistance(pins[0].x, pins[0].y, pins[1].x, pins[1].y).toFixed(
                              2
                            )}ft
                          </p>
                        </div>
                      </div>
                      {typeof formData.timeSinceLastEvent === 'number' &&
                        formData.timeSinceLastEvent > 0 && (
                          <div className="text-gray-300 pt-2 border-t border-white/10">
                            Shot Speed:
                            <p className="text-green-400 font-mono">
                              {calculateSpeed(
                                calculateDistance(pins[0].x, pins[0].y, pins[1].x, pins[1].y),
                                formData.timeSinceLastEvent
                              ).toFixed(2)}
                              ft/s
                            </p>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="bg-white/5 border border-white/20 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-4">About This Model</h3>
              <div className="grid md:grid-cols-2 gap-8 text-gray-300">
                <div>
                  <h4 className="text-green-400 font-semibold mb-2">Model Details</h4>
                  <p>
                    This model is an LightGBM classifier trained on historical NHL shot data to predict the outcome of a single shot given all available context. The data was acquired from <a href="https://www.moneypuck.com">moneypuck.com</a>, and cleaned to include only shots on goal. The model does not have the highest accuracy compared to more complex models, but provides more realistic probabilities by penalizing majority class misclassifications.
                  </p>
                </div>
                <div>
                  <h4 className="text-green-400 font-semibold mb-2">How to Use</h4>
                  <p>
                    The red pin represents the location of event that occured directly prior to the shot, and the blue pin represents the shot location. The controlled rebound outcome describes a rebound that the attacking team cannot reach, dangerous rebound describes a rebound that the attacking team has a good chance of reaching, and play stopped describes a shot that was either deflected out of play or covered by the goalie.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="flex flex-col gap-6">
            {/* Error Messages */}
            {errors.length > 0 && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-300 text-sm font-semibold mb-2">Errors:</p>
                <ul className="text-red-200 text-sm space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Form Inputs */}
            <div className="bg-white/5 border border-white/20 rounded-lg p-6 space-y-4">
              <h3 className="text-white font-bold text-lg">Shot Parameters</h3>

              {/* Time Inputs */}
              <div className="space-y-2">
                <label className="text-gray-300 text-sm font-semibold">
                  Time Between Last Event And Shot (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.timeSinceLastEvent}
                  onChange={(e) =>
                    handleFormChange(
                      'timeSinceLastEvent',
                      e.target.value === '' ? '' : parseFloat(e.target.value)
                    )
                  }
                  className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
                  placeholder="e.g., 2.5"
                />
              </div>

              {/* Shot Type */}
              <div className="space-y-2">
                <label className="text-gray-300 text-sm font-semibold">Shot Type</label>
                <select
                  value={formData.shotType}
                  onChange={(e) => handleFormChange('shotType', e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white focus:outline-none focus:border-green-400"
                  style={{
                    colorScheme: 'dark',
                  }}
                >
                  <option value="WRIST">Wrist Shot</option>
                  <option value="SNAP">Snap Shot</option>
                  <option value="SLAP">Slapshot</option>
                  <option value="TIP">Tip</option>
                  <option value="BACK">Backhand</option>
                  <option value="DEFL">Deflection</option>
                  <option value="WRAP">Wraparound</option>
                </select>
              </div>

              {/* Last Event Type */}
              <div className="space-y-2">
                <label className="text-gray-300 text-sm font-semibold">Last Event Type</label>
                <select
                  value={formData.lastEventCategory}
                  onChange={(e) => handleFormChange('lastEventCategory', e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white focus:outline-none focus:border-green-400"
                  style={{
                    colorScheme: 'dark',
                  }}
                >
                  <option value="FAC">Faceoff</option>
                  <option value="SHOT">Shot</option>
                  <option value="HIT">Hit</option>
                  <option value="BLOCK">Block</option>
                  <option value="MISS">Missed Shot</option>
                  <option value="GIVE">Giveaway</option>
                  <option value="TAKE">Takeaway</option>
                  <option value="DELPEN">Penalty</option>
                  <option value="CHL">Coach Challenge</option>
                  <option value="STOP">Game Stoppage</option>
                </select>
              </div>

              {/* Team Differential */}
              <div className="space-y-2">
                <label className="text-gray-300 text-sm font-semibold">
                  Team Player Differential
                </label>
                <input
                  type="number"
                  step="1"
                  value={formData.shootingTeamPlayerDiff}
                  onChange={(e) =>
                    handleFormChange(
                      'shootingTeamPlayerDiff',
                      e.target.value === '' ? '' : parseInt(e.target.value)
                    )
                  }
                  className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
                  placeholder="e.g., 2 or -1"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.shotRebound}
                    onChange={(e) => handleFormChange('shotRebound', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-gray-300 text-sm">Shot is a Rebound</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.shotRush}
                    onChange={(e) => handleFormChange('shotRush', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-gray-300 text-sm">Shot from Rush</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.offWing}
                    onChange={(e) => handleFormChange('offWing', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-gray-300 text-sm">Off-Wing Shot</span>
                </label>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-3">
              <button
                onClick={handlePrediction}
                disabled={!arePinsOnRink || loading}
                className={`w-full py-3 px-4 rounded-lg font-bold transition-all duration-300 ${
                  arePinsOnRink && !loading
                    ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                    : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                }`}
              >
                {loading ? 'Predicting...' : 'Predict Shot'}
              </button>

              <button
                onClick={handleClearPins}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-all duration-300 border border-white/20"
              >
                Clear Pins
              </button>
            </div>

            {/* Prediction Result */}
            {prediction && (
              <>
                <ProbabilityPieChart probability={prediction.probability} />
                <div className="mt-4 bg-white/5 border border-white/20 rounded-lg p-4">
                  <p className="text-white text-sm font-semibold mb-2">Most Likely Outcome</p>
                  <p className="text-green-400 text-2xl font-bold capitalize">
                    {prediction.prediction}
                  </p>
                </div>
              </>
            )}

            {/* Status */}
            <div className="text-gray-400 text-sm text-center">
              <p>{pins.filter(p => p.x >= -100 && p.x <= 100).length}/2 pins on rink</p>
              {!arePinsOnRink && <p className="text-white/40 mt-2">Drag pins onto the rink</p>}
              {arePinsOnRink && (
                <p className="text-green-400/60 mt-2">Fill the form and predict</p>
              )}
            </div>
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}
