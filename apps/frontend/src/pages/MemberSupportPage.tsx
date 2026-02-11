import { Link } from 'react-router-dom';
import { Ticket, BookOpen, Calculator, FileText, HelpCircle, MessageSquare, Phone } from 'lucide-react';
import { useAuth } from '@/auth';

export default function MemberSupportPage() {
  const { profile } = useAuth();

  // Route to /tickets if logged in, otherwise to /support/guest
  const ticketRoute = profile ? '/tickets' : '/support/guest';
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">Member Support</h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">
            Your comprehensive resource for all things MECA
          </p>
        </div>

        {/* Support Ticket CTA */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-4 sm:p-6 md:p-8 mb-8 sm:mb-12 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-full flex items-center justify-center">
                <Ticket className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Need Help?</h2>
                <p className="text-orange-100 text-sm sm:text-base">
                  Submit a support ticket and our team will assist you as soon as possible.
                </p>
              </div>
            </div>
            <Link
              to={ticketRoute}
              className="px-5 sm:px-8 py-2.5 sm:py-4 bg-white text-orange-600 font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-lg whitespace-nowrap text-sm sm:text-base"
            >
              Open Support Ticket
            </Link>
          </div>
        </div>

        {/* Knowledge Base Section */}
        <div className="bg-slate-800 rounded-xl p-4 sm:p-6 md:p-8 mb-8 sm:mb-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-700 rounded-full mb-4">
              <BookOpen className="w-10 h-10 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Knowledge Base</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Access helpful guides, tutorials, and resources to help you understand MECA competitions,
              classes, scoring systems, and best practices.
            </p>
          </div>

          {/* Resource Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link
              to="/competition-guides"
              className="bg-slate-700 hover:bg-slate-600 rounded-lg p-6 transition-colors group"
            >
              <div className="text-orange-500 group-hover:text-orange-400 text-3xl mb-3">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-white font-semibold mb-2">Competition Guides</h3>
              <p className="text-gray-400 text-sm">
                Learn about different competition formats and what to expect
              </p>
            </Link>

            <div className="bg-slate-700 rounded-lg p-6">
              <div className="text-orange-500 text-3xl mb-3">
                <HelpCircle className="w-8 h-8" />
              </div>
              <h3 className="text-white font-semibold mb-2">FAQs</h3>
              <p className="text-gray-400 text-sm">
                Find answers to frequently asked questions
              </p>
              <span className="inline-block mt-2 text-xs text-gray-500 bg-slate-600 px-2 py-1 rounded">Coming Soon</span>
            </div>

            <Link
              to="/class-calculator"
              className="bg-slate-700 hover:bg-slate-600 rounded-lg p-6 transition-colors group"
            >
              <div className="text-orange-500 group-hover:text-orange-400 text-3xl mb-3">
                <Calculator className="w-8 h-8" />
              </div>
              <h3 className="text-white font-semibold mb-2">Class Calculator</h3>
              <p className="text-gray-400 text-sm">
                Calculate your SPL class based on pressure measurements
              </p>
            </Link>

            <Link
              to="/rulebooks"
              className="bg-slate-700 hover:bg-slate-600 rounded-lg p-6 transition-colors group"
            >
              <div className="text-orange-500 group-hover:text-orange-400 text-3xl mb-3">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-white font-semibold mb-2">Rulebooks</h3>
              <p className="text-gray-400 text-sm">
                Access current and archived MECA competition rulebooks
              </p>
            </Link>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-slate-800 rounded-xl p-4 sm:p-6 md:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">Other Ways to Reach Us</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Support Tickets */}
            <div className="bg-slate-700 rounded-xl p-4 sm:p-6 md:p-8 text-center hover:bg-slate-600/50 transition-colors">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
                <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500" />
              </div>
              <h3 className="text-lg sm:text-xl text-white font-semibold mb-2 sm:mb-3">Support Tickets</h3>
              <p className="text-gray-400 text-sm sm:text-base mb-4 sm:mb-6">
                Best for detailed inquiries and tracking your requests. Our team typically responds within 24-48 hours.
              </p>
              <Link
                to={ticketRoute}
                className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg text-sm sm:text-base transition-colors"
              >
                Submit Ticket
              </Link>
            </div>

            {/* Phone */}
            <div className="bg-slate-700 rounded-xl p-4 sm:p-6 md:p-8 text-center hover:bg-slate-600/50 transition-colors">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
                <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
              </div>
              <h3 className="text-lg sm:text-xl text-white font-semibold mb-2 sm:mb-3">Call Us</h3>
              <p className="text-gray-400 text-sm sm:text-base mb-4 sm:mb-6">
                For urgent matters and immediate assistance, give us a call during business hours.
              </p>
              <a
                href="tel:6158517428"
                className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg text-sm sm:text-base transition-colors"
              >
                615-851-PHAT
              </a>
            </div>
          </div>

          {/* Office Info */}
          <div className="mt-8 pt-8 border-t border-slate-700 text-center">
            <p className="text-gray-400">
              <span className="text-white font-medium">MECA Headquarters:</span>{' '}
              235 Flamingo Dr., Louisville, KY 40218, USA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
