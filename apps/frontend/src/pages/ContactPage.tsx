import { Phone, MapPin, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHead, useStaticPageSEO } from '@/shared/seo';

export default function ContactPage() {
  const seoProps = useStaticPageSEO('contact');

  return (
    <>
      <SEOHead {...seoProps} />
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="relative bg-gradient-to-r from-orange-600 to-red-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">Contact Us</h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Have questions or want to get involved? We'd love to hear from you!
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">Get in Touch</h2>
            <p className="text-gray-300 mb-8">
              Whether you're a competitor, shop owner, or just curious about MECA events,
              we're here to help. Reach out with any questions, suggestions, or partnership opportunities.
            </p>

            <div className="space-y-6">
              <div className="flex items-start">
                <Phone className="h-6 w-6 text-orange-500 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Phone</h3>
                  <a href="tel:+16158517428" className="text-gray-400 hover:text-orange-400 transition-colors">
                    615-851-PHAT
                  </a>
                </div>
              </div>

              <div className="flex items-start">
                <MapPin className="h-6 w-6 text-orange-500 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Location</h3>
                  <p className="text-gray-400">
                    235 Flamingo Dr.<br />
                    Louisville, KY 40218<br />
                    USA
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 bg-slate-800 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-4">
                Looking to Host an Event?
              </h3>
              <p className="text-gray-400 mb-4">
                If you're a shop owner or venue interested in hosting a MECA event,
                check out our dedicated event hosting page.
              </p>
              <Link
                to="/host-event"
                className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
              >
                Host an Event
              </Link>
            </div>
          </div>

          {/* Support Ticket CTA */}
          <div className="bg-slate-800 p-8 rounded-xl shadow-lg flex flex-col">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-orange-600/20 rounded-lg">
                  <Ticket className="h-8 w-8 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Need Help?</h2>
              </div>

              <p className="text-gray-300 mb-6">
                For questions, technical support, membership inquiries, or any other assistance,
                please submit a support ticket. Our team will respond as quickly as possible.
              </p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-400">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                  Membership & Registration Help
                </li>
                <li className="flex items-center text-gray-400">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                  Event Information & Questions
                </li>
                <li className="flex items-center text-gray-400">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                  Technical Support
                </li>
                <li className="flex items-center text-gray-400">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                  Rules & Regulations Clarification
                </li>
                <li className="flex items-center text-gray-400">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                  General Inquiries
                </li>
              </ul>
            </div>

            <Link
              to="/member-support"
              className="w-full flex items-center justify-center px-6 py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              <Ticket className="h-5 w-5 mr-2" />
              Open a Support Ticket
            </Link>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
