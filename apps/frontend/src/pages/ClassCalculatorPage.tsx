import { Circle, Square as SquareIcon, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ClassCalculatorPage() {
  const navigate = useNavigate();
  const [numberOfWoofers, setNumberOfWoofers] = useState<number>(1);
  const [wooferSize, setWooferSize] = useState<string>('');
  const [wooferShape, setWooferShape] = useState<'round' | 'square'>('round');
  const [wattage, setWattage] = useState<number>(0);
  const [totalConeArea, setTotalConeArea] = useState<number | null>(null);
  const [pressureClass, setPressureClass] = useState<number | null>(null);

  useEffect(() => {
    calculateClass();
  }, [numberOfWoofers, wooferSize, wooferShape, wattage]);

  const calculateClass = () => {
    if (!wooferSize || numberOfWoofers < 1) {
      setTotalConeArea(null);
      setPressureClass(null);
      return;
    }

    const size = parseFloat(wooferSize);
    let singleWooferArea: number;

    if (wooferShape === 'round') {
      // Area = π × r²
      const radius = size / 2;
      singleWooferArea = Math.PI * radius * radius;
    } else {
      // Square: Area = side²
      singleWooferArea = size * size;
    }

    const totalArea = singleWooferArea * numberOfWoofers;
    setTotalConeArea(totalArea);

    if (wattage > 0) {
      setPressureClass(Math.round(totalArea + wattage));
    } else {
      setPressureClass(null);
    }
  };

  const getQualifyingClasses = () => {
    if (!pressureClass) return null;

    // These are example classifications based on MECA rules
    // In a real implementation, these would be determined by specific pressure class ranges
    const classes = [
      { category: 'T - Trunk', class: 'T1' },
      { category: 'S - Street', class: 'S3' },
      { category: 'MS - Modified Street', class: 'MS2' },
      { category: 'M - Modified', class: 'M3' },
      { category: 'X - Extreme Exhibition', class: 'XTC' },
      { category: 'DB - Park & Pound', class: 'DB3' },
    ];

    return classes;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="relative bg-gradient-to-r from-orange-600 to-red-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">SPL Class Calculator</h1>
          <p className="text-xl text-white/90 max-w-4xl mx-auto">
            MECA Sound Pressure League Classes factor in both the overall total cone area of
            your subwoofers and the actual wattage of your amplifiers.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calculator Section */}
          <div className="lg:col-span-2">
            {/* Explanation */}
            <div className="mb-8 bg-slate-800 rounded-xl p-6">
              <p className="text-gray-300 mb-4">
                MECA Sound Pressure League Classes factor in both the overall total cone area of
                your subwoofers and the actual wattage of your amplifiers. For all 3x events
                (Soundfests, State Finals, World Finals) the Term-Lab Magnum SPL Meter is required
                to be used. (It can also be used at any other event, and is the preferred SPL meter
                for all MECA events.)
              </p>
              <p className="text-gray-300">
                With the Magnum or other clamp meters, the actual Voltage and Current drawn by
                your amps is measured and used to calculate your peak power output using Watt's Law
                (<code className="bg-slate-700 px-2 py-1 rounded text-orange-400">Power (P) = Voltage (E) × Current(I)</code>).
                That wattage is added to the total cone surface area of your subwoofers using the
                formula for the area of a circle (
                <code className="bg-slate-700 px-2 py-1 rounded text-orange-400">Area(A) = π(pi) × Radius(r)²</code>)
                to determine your pressure class number, which then is used to determine what pressure
                class you fit in.
              </p>
            </div>

            {/* Calculator Form */}
            <div className="bg-slate-800 rounded-xl p-8 shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Number of Subwoofers */}
                <div>
                  <label htmlFor="numberOfWoofers" className="block text-sm font-medium text-gray-300 mb-2">
                    # of Subwoofers
                  </label>
                  <input
                    type="number"
                    id="numberOfWoofers"
                    min="1"
                    value={numberOfWoofers}
                    onChange={(e) => setNumberOfWoofers(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                {/* Size of Subwoofers */}
                <div>
                  <label htmlFor="wooferSize" className="block text-sm font-medium text-gray-300 mb-2">
                    Size of Subwoofers
                  </label>
                  <select
                    id="wooferSize"
                    value={wooferSize}
                    onChange={(e) => setWooferSize(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    <option value="8">8"</option>
                    <option value="10">10"</option>
                    <option value="12">12"</option>
                    <option value="15">15"</option>
                    <option value="18">18"</option>
                  </select>
                </div>
              </div>

              {/* Shape of Subwoofers */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Shape of Subwoofers
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setWooferShape('round')}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold transition-all ${
                      wooferShape === 'round'
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    <Circle className="h-5 w-5" />
                    Round
                  </button>
                  <button
                    type="button"
                    onClick={() => setWooferShape('square')}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold transition-all ${
                      wooferShape === 'square'
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    <SquareIcon className="h-5 w-5" />
                    Square
                  </button>
                </div>
              </div>

              {/* Approximate Wattage */}
              <div className="mb-6">
                <label htmlFor="wattage" className="block text-sm font-medium text-gray-300 mb-2">
                  Approximate Wattage (RMS)
                </label>
                <input
                  type="number"
                  id="wattage"
                  min="0"
                  value={wattage || ''}
                  onChange={(e) => setWattage(parseInt(e.target.value) || 0)}
                  placeholder="Enter wattage..."
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Total Cone Surface Area Display */}
              {totalConeArea !== null && (
                <div className="bg-slate-700 px-6 py-4 rounded-lg mb-6">
                  <p className="text-white text-center text-lg">
                    <span className="font-bold">{totalConeArea.toFixed(2)} in²</span> Total Cone Surface Area
                  </p>
                </div>
              )}
            </div>

            {/* Results Display */}
            {pressureClass !== null && (
              <div className="mt-8 bg-slate-800 rounded-xl p-8 shadow-lg">
                <div className="bg-slate-900 px-6 py-4 rounded-lg mb-6">
                  <p className="text-white text-xl">
                    Your Pressure Class Number: <span className="font-bold text-orange-500">{pressureClass}</span>
                  </p>
                </div>

                <div>
                  <p className="text-gray-300 mb-4">
                    Your Pressure Class Number indicates you would qualify compete in the following
                    SPL and Park & Pound classes:
                  </p>
                  <ul className="space-y-2 mb-6">
                    {getQualifyingClasses()?.map((item, index) => (
                      <li key={index} className="text-gray-300">
                        <span className="text-gray-400">{item.category}:</span>{' '}
                        <strong className="text-white">{item.class}</strong>
                      </li>
                    ))}
                  </ul>
                  <p className="text-gray-400 italic text-sm">
                    Remember that this is only a guideline. MECA Judges classifications based on
                    observed wattage and system specs overrule these suggestions.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl p-6">
              <FileText className="h-8 w-8 text-orange-500 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">
                Official Rule Books
              </h3>
              <p className="text-gray-400 mb-4">
                For detailed class descriptions, rules, and complete classification guidelines,
                check out the official MECA rulebooks.
              </p>
              <button
                onClick={() => navigate('/rulebooks')}
                className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
              >
                View Rulebooks
              </button>
            </div>

            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                How the Formula Works
              </h3>
              <div className="space-y-4 text-gray-400 text-sm">
                <div>
                  <p className="font-semibold text-white mb-1">For Round Woofers:</p>
                  <code className="block bg-slate-900 p-2 rounded text-orange-400">
                    Area = π × (diameter/2)²
                  </code>
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">For Square Woofers:</p>
                  <code className="block bg-slate-900 p-2 rounded text-orange-400">
                    Area = diameter²
                  </code>
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">Pressure Class Number:</p>
                  <code className="block bg-slate-900 p-2 rounded text-orange-400">
                    Total Cone Area + Wattage
                  </code>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/30 border border-blue-500/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-300 mb-3">
                3x Events Requirement
              </h3>
              <p className="text-gray-300 text-sm">
                For Soundfests, State Finals, and World Finals, the Term-Lab Magnum SPL Meter
                is required. It can also be used at any other event and is the preferred SPL
                meter for all MECA events.
              </p>
            </div>

            <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-orange-300 mb-3">
                Questions?
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                If you're unsure about your class or have specific questions about
                classification, feel free to contact us.
              </p>
              <button
                onClick={() => navigate('/contact')}
                className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
