'use client';

import { useState, useRef, useEffect } from 'react';
import Navigation from '@/app/components/shared/Navigation';
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
  shooterLeftRight: string;
  playerPositionThatDidEvent: string;
  shooterTimeOnIceSinceFaceoff: number | '';
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
    shooterLeftRight: 'R',
    playerPositionThatDidEvent: 'C',
    shooterTimeOnIceSinceFaceoff: '',
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
      shooterLeftRight: formData.shooterLeftRight,
      playerPositionThatDidEvent: formData.playerPositionThatDidEvent,
      shooterTimeOnIceSinceFaceoff:
        typeof formData.shooterTimeOnIceSinceFaceoff === 'number'
          ? formData.shooterTimeOnIceSinceFaceoff
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/predict`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

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
      <Navigation activePage="shot-prediction" />

      {/* Main Content */}
      <main className="max-w-5xl px-6 py-16" style={{ margin: '0 auto' }}>
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">🎯 Shot Prediction</h1>
          <p className="text-xl text-gray-300">
            Drag the pins onto the rink: red for the event, blue for the shot position
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
            {/* Map Area */}
            <div className="lg:col-span-2 space-y-8">
            <div className="bg-linear-to-b from-white/10 to-white/5 border border-white/15 rounded-2xl p-8">
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
                className="relative w-full aspect-[200/85] bg-white rounded-lg border-4 border-dashed border-white/30 cursor-crosshair hover:border-white/50 transition-colors overflow-hidden"
              >
                {/* Rink markings */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 85" preserveAspectRatio="none" style={{ opacity: 0.75 }}>
                  {/* Goal lines at x=±89ft */}
                  <line x1="11" y1="0" x2="11" y2="85" stroke="#e8002d" strokeWidth="1.5" />
                  <line x1="189" y1="0" x2="189" y2="85" stroke="#e8002d" strokeWidth="1.5" />
                  {/* Blue lines at x=±25ft */}
                  <line x1="75" y1="0" x2="75" y2="85" stroke="#0066cc" strokeWidth="3" />
                  <line x1="125" y1="0" x2="125" y2="85" stroke="#0066cc" strokeWidth="3" />
                  {/* Center red line */}
                  <line x1="100" y1="0" x2="100" y2="85" stroke="#e8002d" strokeWidth="3" />
                  {/* Center ice circle and dot */}
                  <circle cx="100" cy="42.5" r="15" fill="none" stroke="#0066cc" strokeWidth="1" />
                  <circle cx="100" cy="42.5" r="1.5" fill="#e8002d" />
                  {/* Left zone faceoff circles at x=−69, y=±22 */}
                  <circle cx="31" cy="20.5" r="15" fill="none" stroke="#e8002d" strokeWidth="1" />
                  <circle cx="31" cy="20.5" r="1.5" fill="#e8002d" />
                  <circle cx="31" cy="64.5" r="15" fill="none" stroke="#e8002d" strokeWidth="1" />
                  <circle cx="31" cy="64.5" r="1.5" fill="#e8002d" />
                  {/* Right zone faceoff circles at x=69, y=±22 */}
                  <circle cx="169" cy="20.5" r="15" fill="none" stroke="#e8002d" strokeWidth="1" />
                  <circle cx="169" cy="20.5" r="1.5" fill="#e8002d" />
                  <circle cx="169" cy="64.5" r="15" fill="none" stroke="#e8002d" strokeWidth="1" />
                  <circle cx="169" cy="64.5" r="1.5" fill="#e8002d" />
                  {/* Neutral zone faceoff dots at x=±20, y=±22 */}
                  <circle cx="80" cy="20.5" r="1.5" fill="#e8002d" />
                  <circle cx="80" cy="64.5" r="1.5" fill="#e8002d" />
                  <circle cx="120" cy="20.5" r="1.5" fill="#e8002d" />
                  <circle cx="120" cy="64.5" r="1.5" fill="#e8002d" />
                </svg>

                {/* Goal crease - left goal line */}
                <svg
                  className="absolute pointer-events-none"
                  style={{
                    left: '5.5%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '40px',
                    height: '40px',
                  }}
                  viewBox="0 0 40 40"
                >
                  <path
                    d="M 20 0 A 20 20 0 0 1 20 40 Z"
                    fill="#4a90e2"
                    opacity="0.8"
                  />
                </svg>
                {/* Goal crease - right goal line */}
                <svg
                  className="absolute pointer-events-none"
                  style={{
                    left: '94.5%',
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
                      <div key={index} className="bg-white/10 border border-white/15 rounded-xl p-4">
                        <p className="text-white/60 text-sm mb-2 font-semibold">{pin.label}</p>
                        <p className="text-white font-mono text-sm">X: {pin.x.toFixed(1)}ft</p>
                        <p className="text-white font-mono text-sm">Y: {pin.y.toFixed(1)}ft</p>
                      </div>
                    ))}
                  </div>

                  {arePinsOnRink && (
                    <div className="bg-green-900/20 border border-white/15 rounded-xl p-4 space-y-2">
                      <p className="text-green-400 font-semibold text-sm">Calculated Metrics</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-xs text-gray-400">
                          Shot Distance:
                          <p className="text-green-400 font-mono">
                            {calculateDistanceToGoal(pins[1].x, pins[1].y).toFixed(2)}ft
                          </p>
                        </div>
                        <div className="text-xs text-gray-400">
                          Shot Angle:
                          <p className="text-green-400 font-mono">
                            {calculateAngle(pins[1].x, pins[1].y).toFixed(2)}°
                          </p>
                        </div>
                        <div className="text-xs text-gray-400">
                          Last Event Angle:
                          <p className="text-green-400 font-mono">
                            {calculateAngle(pins[0].x, pins[0].y).toFixed(2)}°
                          </p>
                        </div>
                        <div className="text-xs text-gray-400">
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
                          <div className="text-xs text-gray-400 pt-2 border-t border-white/10">
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
            <div className="bg-white/5 border border-white/15 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-4">About This Model</h3>
              <div className="grid md:grid-cols-2 gap-8 text-gray-300">
                <div>
                  <h4 className="text-green-400 font-semibold mb-2">Model Details</h4>
                  <p>
                    This model is a CatBoost classifier trained on historical NHL shot data from <a href="https://www.moneypuck.com" className="text-green-400 hover:underline">moneypuck.com</a> to predict one of five outcomes for a given shot: goal, play stopped, play continued in zone, play continued outside zone, or generated rebound. The model uses 23 features including shot location, shooter handedness, player position, and time on ice.
                  </p>
                </div>
                <div>
                  <h4 className="text-green-400 font-semibold mb-2">How to Use</h4>
                  <p>
                    Drag the red pin (E) to the location of the event directly before the shot, and the blue pin (S) to where the shot was taken. Fill in the shot parameters on the right, then click Predict Shot. Shot angle, distance, and speed are calculated automatically from the pin positions.
                  </p>
                </div>
              </div>
            </div>

            {/* How it was created */}
            <div className="bg-white/5 border border-white/20 rounded-2xl p-8">
              <h3 className="text-xl font-bold mb-3" style={{ color: '#4ade80' }}>How it was created</h3>
              <p className="text-gray-300 leading-relaxed">
                Data was extracted from moneypuck.com, using their shooting dataset, containing all shot attempts from both the 23-24, and 24-25 seasons. The data was analyzed in a colab notebook, checking for class imbalance, null observations, and other cleaning necessary to createe the model.  This was done using data visualization tools such as seaborn and matplotlib. Several models were trained on the data, to make a decision regarding the optimal model for classification. Optuna was used for hyperparameter tuning, and the final model had a final log loss of 1.3, with a 0.71 brier score. Both were significantly above the naive baseline, but were not perfect, instead reflective of the stochastic nature of post-shot outcomes.
              </p>
            </div>

            {/* What I learned */}
            <div className="bg-white/5 border border-white/20 rounded-2xl p-8">
              <h3 className="text-xl font-bold mb-3" style={{ color: '#93c5fd' }}>What I learned</h3>
              <p className="text-gray-300 leading-relaxed">
                As mentioned in the previous section, I came to understand the truly random nature of the game I love. Machine learning, however, can give us some insight, and it allows us to create some powerful and interesting tools such as the one created here. I learned about the difficult nature of applying ML techniques to real-world data, especially a sport as fast and unpredictable as hockey. I am however, proud of the result, and I learned to extract meaning from data that is very difficult to decipher. 
              </p>
            </div>
          </div>

          {/* Control Panel */}
          <div className="flex flex-col gap-6">
            {/* Error Messages */}
            {errors.length > 0 && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4">
                <p className="text-red-300 text-sm font-semibold mb-2">Errors:</p>
                <ul className="text-red-200 text-sm space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Form Inputs */}
            <div className="bg-white/5 border border-white/15 rounded-2xl p-6 space-y-4">
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
                  className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
                  placeholder="e.g., 2.5"
                />
              </div>

              {/* Shot Type */}
              <div className="space-y-2">
                <label className="text-gray-300 text-sm font-semibold">Shot Type</label>
                <select
                  value={formData.shotType}
                  onChange={(e) => handleFormChange('shotType', e.target.value)}
                  className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-green-400"
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
                  className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-green-400"
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
                  className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
                  placeholder="e.g., 2 or -1"
                />
              </div>

              {/* Shooter Info */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Shooter Info</p>

                {/* Shooter Handedness */}
                <div className="space-y-2">
                  <label className="text-gray-300 text-sm font-semibold">Shooter Handedness</label>
                  <select
                    value={formData.shooterLeftRight}
                    onChange={(e) => handleFormChange('shooterLeftRight', e.target.value)}
                    className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-green-400"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="L">Left</option>
                    <option value="R">Right</option>
                  </select>
                </div>

                {/* Position of Event Player */}
                <div className="space-y-2">
                  <label className="text-gray-300 text-sm font-semibold">Position of Shooting Player</label>
                  <select
                    value={formData.playerPositionThatDidEvent}
                    onChange={(e) => handleFormChange('playerPositionThatDidEvent', e.target.value)}
                    className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-green-400"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="C">Center</option>
                    <option value="L">Left Wing</option>
                    <option value="R">Right Wing</option>
                    <option value="D">Defense</option>
                  </select>
                </div>

                {/* Time on Ice Since Faceoff */}
                <div className="space-y-2">
                  <label className="text-gray-300 text-sm font-semibold">
                    Time on Ice Since Faceoff (seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.shooterTimeOnIceSinceFaceoff}
                    onChange={(e) =>
                      handleFormChange(
                        'shooterTimeOnIceSinceFaceoff',
                        e.target.value === '' ? '' : parseFloat(e.target.value)
                      )
                    }
                    className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
                    placeholder="e.g., 45"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="border-t border-white/10 pt-4 space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.shotRebound}
                    onChange={(e) => handleFormChange('shotRebound', e.target.checked)}
                    className="w-4 h-4 rounded accent-green-400"
                  />
                  <span className="text-gray-300 text-sm">Shot is a Rebound</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.shotRush}
                    onChange={(e) => handleFormChange('shotRush', e.target.checked)}
                    className="w-4 h-4 rounded accent-green-400"
                  />
                  <span className="text-gray-300 text-sm">Shot from Rush</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.offWing}
                    onChange={(e) => handleFormChange('offWing', e.target.checked)}
                    className="w-4 h-4 rounded accent-green-400"
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
                className={`w-full py-3 px-4 rounded-xl font-bold transition-all duration-300 ${
                  arePinsOnRink && !loading
                    ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                    : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                }`}
              >
                {loading ? 'Predicting...' : 'Predict Shot'}
              </button>

              <button
                onClick={handleClearPins}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all duration-300 border border-white/15"
              >
                Clear Pins
              </button>
            </div>

            {/* Prediction Result */}
            {prediction && (
              <>
                <ProbabilityPieChart probability={prediction.probability} />
                <div className="mt-4 bg-white/5 border border-white/15 rounded-xl p-4">
                  <p className="text-white text-sm font-semibold mb-2">Most Likely Outcome</p>
                  <p className="text-green-400 text-2xl font-bold capitalize">
                    {prediction.prediction}
                  </p>
                </div>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
