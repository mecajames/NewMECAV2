import { useNavigate } from 'react-router-dom';
import {
  Factory,
  CheckCircle,
  ArrowRight,
  Ticket,
  Mail,
  Phone,
  Globe,
  Award,
  Users,
  TrendingUp,
  Star,
  Shield,
  Handshake,
} from 'lucide-react';

export default function ManufacturerPartnerInfoPage() {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: Globe,
      title: 'Brand Visibility',
      description: 'Get your brand in front of thousands of passionate car audio enthusiasts at MECA events nationwide.',
    },
    {
      icon: Star,
      title: 'Featured Directory Listing',
      description: 'Premium placement in our Manufacturer Directory with your logo, products, and contact information.',
    },
    {
      icon: Award,
      title: 'Sponsorship Opportunities',
      description: 'Sponsor events, classes, and competitions to maximize your brand exposure and engagement.',
    },
    {
      icon: Handshake,
      title: 'Retailer Connections',
      description: 'Direct access to our network of authorized retailers looking for quality products to carry.',
    },
    {
      icon: Users,
      title: 'Community Engagement',
      description: 'Connect directly with competitors and enthusiasts who are passionate about your products.',
    },
    {
      icon: TrendingUp,
      title: 'Market Insights',
      description: 'Gain valuable feedback and insights from real-world product testing in competitive environments.',
    },
  ];

  const ticketInstructions = [
    {
      step: 1,
      field: 'Subject',
      value: 'Manufacturer Partnership Inquiry - [Your Company Name]',
    },
    {
      step: 2,
      field: 'Category',
      value: 'Membership',
    },
    {
      step: 3,
      field: 'Department',
      value: 'Membership Services',
    },
    {
      step: 4,
      field: 'Priority',
      value: 'Medium',
    },
    {
      step: 5,
      field: 'Description',
      value: 'Include: Company name, website, product categories, contact person, and why you want to partner with MECA',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-cyan-500/10 mb-6">
            <Factory className="h-10 w-10 text-cyan-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Become a MECA Manufacturer Partner
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Partner with the premier car audio competition organization and connect your brand with thousands of passionate enthusiasts.
          </p>
        </div>

        {/* Benefits Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Partnership Benefits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-cyan-500/50 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4">
                  <benefit.icon className="h-6 w-6 text-cyan-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{benefit.title}</h3>
                <p className="text-gray-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How to Apply Section */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 md:p-10 border border-slate-700 mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Ticket className="h-7 w-7 text-orange-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">How to Apply</h2>
              <p className="text-gray-400">Submit a support ticket to start the partnership process</p>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-6 mb-8">
            <p className="text-gray-300 mb-6">
              MECA manufacturer partnerships are customized to fit each brand's goals and budget. Our team will work directly with you to create a partnership package that delivers maximum value for your investment.
            </p>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-500" />
              When submitting your support ticket, please include:
            </h3>

            <div className="space-y-4">
              {ticketInstructions.map((instruction) => (
                <div
                  key={instruction.step}
                  className="flex items-start gap-4 bg-slate-800/50 rounded-lg p-4"
                >
                  <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    {instruction.step}
                  </div>
                  <div>
                    <p className="text-cyan-400 font-medium">{instruction.field}</p>
                    <p className="text-gray-300">{instruction.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => navigate('/support/guest')}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg text-lg transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-3"
          >
            <Ticket className="h-6 w-6" />
            Submit Partnership Request
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        {/* What Happens Next Section */}
        <div className="bg-slate-800 rounded-xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">What Happens Next?</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-white">Review</h3>
                <p className="text-gray-400">Our partnership team will review your application within 2-3 business days.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-white">Consultation</h3>
                <p className="text-gray-400">A MECA representative will reach out to discuss partnership options and pricing.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-white">Agreement</h3>
                <p className="text-gray-400">We'll work together to create a customized partnership package that fits your needs.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-white">Activation</h3>
                <p className="text-gray-400">Once confirmed, we'll set up your manufacturer profile and begin promoting your brand.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Questions?</h2>
          <p className="text-gray-400 mb-6">
            Have questions before applying? Feel free to reach out to us directly.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <a
              href="mailto:support@mecacaraudio.com"
              className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Mail className="h-5 w-5" />
              support@mecacaraudio.com
            </a>
            <button
              onClick={() => navigate('/contact')}
              className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors"
            >
              <Phone className="h-5 w-5" />
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
