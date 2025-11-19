import { Link } from 'react-router-dom';

export default function KnowledgeBasePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">MECA Knowledge Base</h1>
          <p className="text-xl text-gray-300">
            Your comprehensive resource for all things MECA
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-8">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-slate-700 rounded-full mb-6">
              <svg
                className="w-12 h-12 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Knowledge Base Coming Soon
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-8">
              We're building a comprehensive knowledge base to help you understand MECA competitions,
              classes, scoring systems, and best practices. Check back soon for helpful articles,
              tutorials, and FAQs.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto mt-12">
              <div className="bg-slate-700 rounded-lg p-6">
                <div className="text-orange-500 text-3xl mb-3">📚</div>
                <h3 className="text-white font-semibold mb-2">Competition Guides</h3>
                <p className="text-gray-400 text-sm">
                  Learn about different competition formats and what to expect
                </p>
              </div>
              <div className="bg-slate-700 rounded-lg p-6">
                <div className="text-orange-500 text-3xl mb-3">❓</div>
                <h3 className="text-white font-semibold mb-2">FAQs</h3>
                <p className="text-gray-400 text-sm">
                  Find answers to frequently asked questions
                </p>
              </div>
              <Link
                to="/class-calculator"
                className="bg-slate-700 hover:bg-slate-600 rounded-lg p-6 transition-colors group"
              >
                <div className="text-orange-500 group-hover:text-orange-400 text-3xl mb-3">🧮</div>
                <h3 className="text-white font-semibold mb-2">Class Calculator</h3>
                <p className="text-gray-400 text-sm">
                  Calculate your SPL class based on pressure measurements
                </p>
              </Link>
              <Link
                to="/rulebooks"
                className="bg-slate-700 hover:bg-slate-600 rounded-lg p-6 transition-colors group"
              >
                <div className="text-orange-500 group-hover:text-orange-400 text-3xl mb-3">📖</div>
                <h3 className="text-white font-semibold mb-2">Rulebooks</h3>
                <p className="text-gray-400 text-sm">
                  Access current and archived MECA competition rulebooks
                </p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
