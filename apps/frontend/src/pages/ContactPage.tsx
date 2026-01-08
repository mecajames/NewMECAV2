import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import { ReCaptchaV2Widget } from '@/shared';
import type { ReCaptchaV2Ref } from '@/shared';
import { contactApi } from '@/api-client/contact.api-client';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const recaptchaRef = useRef<ReCaptchaV2Ref>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Get reCAPTCHA token from widget
      const token = recaptchaRef.current?.getToken();

      if (!token) {
        setSubmitStatus({ type: 'error', message: 'Please complete the reCAPTCHA verification.' });
        setIsSubmitting(false);
        return;
      }

      // Submit form to backend (includes reCAPTCHA verification)
      const result = await contactApi.submit({
        ...formData,
        recaptcha_token: token,
      });

      if (result.success) {
        setSubmitStatus({ type: 'success', message: result.message });
        setFormData({ name: '', email: '', subject: '', message: '' });
        recaptchaRef.current?.reset();
      } else {
        setSubmitStatus({ type: 'error', message: result.message || 'Failed to submit form.' });
        recaptchaRef.current?.reset();
      }
    } catch (error: unknown) {
      console.error('Form submission error:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      setSubmitStatus({
        type: 'error',
        message: axiosError.response?.data?.message || 'An error occurred. Please try again.',
      });
      recaptchaRef.current?.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
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
                <Mail className="h-6 w-6 text-orange-500 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Email</h3>
                  <p className="text-gray-400">mecacaraudio@gmail.com</p>
                </div>
              </div>

              <div className="flex items-start">
                <Phone className="h-6 w-6 text-orange-500 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Phone</h3>
                  <p className="text-gray-400">615-851-PHAT</p>
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
              <a
                href="/host-event"
                className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
              >
                Host an Event
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-slate-800 p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6">Send us a Message</h2>

            {/* Status Message */}
            {submitStatus && (
              <div
                className={`flex items-center gap-3 p-4 rounded-lg mb-6 ${
                  submitStatus.type === 'success'
                    ? 'bg-green-500/20 border border-green-500/30'
                    : 'bg-red-500/20 border border-red-500/30'
                }`}
              >
                {submitStatus.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                )}
                <p className={submitStatus.type === 'success' ? 'text-green-300' : 'text-red-300'}>
                  {submitStatus.message}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="What's this about?"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  placeholder="Tell us more..."
                />
              </div>

              {/* reCAPTCHA v2 Widget */}
              <div className="flex justify-center">
                <ReCaptchaV2Widget ref={recaptchaRef} />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex items-center justify-center px-6 py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Send className="h-5 w-5 mr-2" />
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
              
              {/* reCAPTCHA Badge Notice */}
              <p className="text-xs text-gray-400 text-center mt-4">
                This site is protected by reCAPTCHA and the Google{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">
                  Terms of Service
                </a>{' '}
                apply.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
