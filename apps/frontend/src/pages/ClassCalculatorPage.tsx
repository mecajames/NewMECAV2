import { Calculator, Info, FileText } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ClassCalculatorPage() {
  const navigate = useNavigate();
  const [selectedLeague, setSelectedLeague] = useState<'spl' | 'sql'>('spl');
  const [formData, setFormData] = useState({
    vehicleType: '',
    wooferSize: '',
    numberOfWoofers: '',
    amplifierPower: '',
    installationType: '',
  });
  const [calculatedClass, setCalculatedClass] = useState('');

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual class calculation logic based on MECA rules
    setCalculatedClass('Class will be calculated here based on your inputs and MECA rules');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="relative bg-gradient-to-r from-orange-600 to-red-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">MECA Class Calculator</h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Determine your competition class based on MECA rules and specifications
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Info Banner */}
        <div className="mb-12 bg-blue-900/30 border border-blue-500/50 rounded-xl p-6">
          <div className="flex items-start">
            <Info className="h-6 w-6 text-blue-400 mr-4 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-blue-300 mb-2">
                Important Note
              </h3>
              <p className="text-gray-300">
                This calculator provides an estimate based on the information you provide.
                Final class determination may be subject to vehicle inspection and judge approval at events.
                Please refer to the official MECA rulebooks for complete classification guidelines.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calculator Form */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-xl p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-white mb-6">Calculate Your Class</h2>

              {/* League Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Select League *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedLeague('spl')}
                    className={`px-6 py-4 rounded-lg font-semibold transition-all ${
                      selectedLeague === 'spl'
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    Sound Pressure League (SPL)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLeague('sql')}
                    className={`px-6 py-4 rounded-lg font-semibold transition-all ${
                      selectedLeague === 'sql'
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    Sound Quality League (SQL)
                  </button>
                </div>
              </div>

              <form onSubmit={handleCalculate} className="space-y-6">
                <div>
                  <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-300 mb-2">
                    Vehicle Type *
                  </label>
                  <select
                    id="vehicleType"
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select vehicle type</option>
                    <option value="car">Car</option>
                    <option value="truck">Truck</option>
                    <option value="suv">SUV</option>
                    <option value="motorcycle">Motorcycle</option>
                  </select>
                </div>

                {selectedLeague === 'spl' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="wooferSize" className="block text-sm font-medium text-gray-300 mb-2">
                          Woofer Size (inches) *
                        </label>
                        <input
                          type="number"
                          id="wooferSize"
                          name="wooferSize"
                          value={formData.wooferSize}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="e.g., 12, 15, 18"
                        />
                      </div>

                      <div>
                        <label htmlFor="numberOfWoofers" className="block text-sm font-medium text-gray-300 mb-2">
                          Number of Woofers *
                        </label>
                        <input
                          type="number"
                          id="numberOfWoofers"
                          name="numberOfWoofers"
                          value={formData.numberOfWoofers}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="e.g., 1, 2, 4"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="amplifierPower" className="block text-sm font-medium text-gray-300 mb-2">
                        Total Amplifier Power (RMS Watts) *
                      </label>
                      <input
                        type="number"
                        id="amplifierPower"
                        name="amplifierPower"
                        value={formData.amplifierPower}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="e.g., 1000, 2000, 5000"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="installationType" className="block text-sm font-medium text-gray-300 mb-2">
                    Installation Type *
                  </label>
                  <select
                    id="installationType"
                    name="installationType"
                    value={formData.installationType}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select installation type</option>
                    <option value="street">Street (Daily Driver)</option>
                    <option value="modified">Modified (Some modifications)</option>
                    <option value="extreme">Extreme (Full competition build)</option>
                    <option value="unlimited">Unlimited (No restrictions)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center px-6 py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                >
                  <Calculator className="h-5 w-5 mr-2" />
                  Calculate My Class
                </button>
              </form>

              {calculatedClass && (
                <div className="mt-8 p-6 bg-green-900/30 border border-green-500/50 rounded-xl">
                  <h3 className="text-xl font-bold text-green-300 mb-3">
                    Your Estimated Class:
                  </h3>
                  <p className="text-white text-lg">{calculatedClass}</p>
                  <p className="text-gray-400 text-sm mt-2">
                    * This is an estimate. Final classification will be determined at the event.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl p-6">
              <FileText className="h-8 w-8 text-orange-500 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">
                Need More Information?
              </h3>
              <p className="text-gray-400 mb-4">
                Check out the official MECA rulebooks for detailed class descriptions,
                rules, and regulations.
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
                How It Works
              </h3>
              <div className="space-y-3 text-gray-400 text-sm">
                <p>
                  <strong className="text-white">SPL Classes:</strong> Based on cone area
                  (calculated from woofer size and quantity) combined with measured amplifier
                  power output.
                </p>
                <p>
                  <strong className="text-white">SQL Classes:</strong> Based on installation
                  complexity, vehicle modifications, and equipment sophistication.
                </p>
                <p>
                  <strong className="text-white">Divisions:</strong> Vehicles are further
                  divided by type (Car, Truck, SUV, Motorcycle) within each class.
                </p>
              </div>
            </div>

            <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-orange-300 mb-3">
                Questions?
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                If you're unsure about your class or have specific questions,
                feel free to contact us.
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
