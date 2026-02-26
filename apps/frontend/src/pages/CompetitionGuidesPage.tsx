import { Link } from 'react-router-dom';
import { BookOpen, Zap, Music, Award, ArrowLeft } from 'lucide-react';
import { SEOHead, useCompetitionGuidesSEO } from '@/shared/seo';

const COMPETITION_FAQS = [
  {
    question: 'What is MECA?',
    answer: 'MECA (Mobile Electronics Competition Association) is the premier organization for car audio competitions in the United States. We sanction events for SPL (Sound Pressure Level), SQL (Sound Quality League), and Show & Shine competitions.',
  },
  {
    question: 'How do I compete in a MECA event?',
    answer: 'To compete, you need a MECA membership, which you can purchase on our website. Then find an upcoming event in your area, register, and show up with your vehicle. First-time competitors are always welcome!',
  },
  {
    question: 'What types of competitions does MECA offer?',
    answer: 'MECA offers three main competition types: SPL (Sound Pressure Level) which measures loudness, SQL (Sound Quality League) which judges sound quality and installation, and Show & Shine which evaluates vehicle aesthetics and installation quality.',
  },
  {
    question: 'How much does it cost to compete?',
    answer: 'An annual MECA membership is required to compete. Event entry fees vary by event and are set by each event director. Check the specific event listing for pricing details.',
  },
  {
    question: 'What do I need to bring to my first competition?',
    answer: 'Bring your vehicle, your MECA membership ID, any required safety equipment (ear protection for SPL), and your music if competing in SQL. Check the rulebook for your specific competition format requirements.',
  },
  {
    question: 'How are MECA competitions scored?',
    answer: 'Scoring varies by competition type. SPL competitions use calibrated microphones to measure sound pressure. SQL competitions use trained judges who evaluate sound quality, staging, and installation. Show & Shine is judged on visual appearance and craftsmanship.',
  },
];

export default function CompetitionGuidesPage() {
  const seoProps = useCompetitionGuidesSEO(COMPETITION_FAQS);
  const guides = [
    {
      icon: Zap,
      title: 'MECA Quick Start Guide',
      description: 'Get up to speed quickly with MECA competition basics, SPL classes, sensor placement, and scoring systems.',
      link: '/competition-guides/quick-start',
      color: 'orange',
      available: true,
    },
    {
      icon: Music,
      title: 'Sound Quality (SQL) Guide',
      description: 'Learn about Sound Quality League competition, including SQ, Install, and RTA Freq Out formats.',
      link: '/competition-guides/sql',
      color: 'blue',
      available: false,
    },
    {
      icon: Award,
      title: 'State Championship Guide',
      description: 'Understand how the State Championship program works and how to qualify.',
      link: '/competition-guides/state-championship',
      color: 'yellow',
      available: false,
    },
    {
      icon: BookOpen,
      title: 'First Time Competitor Guide',
      description: 'Everything you need to know for your first MECA competition.',
      link: '/competition-guides/first-time',
      color: 'green',
      available: false,
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: { bg: string; text: string; hover: string } } = {
      orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', hover: 'hover:bg-orange-500/20' },
      blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', hover: 'hover:bg-blue-500/20' },
      yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', hover: 'hover:bg-yellow-500/20' },
      green: { bg: 'bg-green-500/10', text: 'text-green-500', hover: 'hover:bg-green-500/20' },
    };
    return colors[color] || colors.orange;
  };

  return (
    <>
      <SEOHead {...seoProps} />
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with Back Button */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-gray-400">Knowledge Base</h2>
          <Link
            to="/knowledge-base"
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Knowledge Base
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-orange-500/10 rounded-full mb-4">
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">Competition Guides</h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
            Learn about different MECA competition formats, classes, and what to expect at events.
          </p>
        </div>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {guides.map((guide) => {
            const colorClasses = getColorClasses(guide.color);
            const GuideIcon = guide.icon;

            if (guide.available) {
              return (
                <Link
                  key={guide.title}
                  to={guide.link}
                  className={`bg-slate-800 rounded-xl p-6 transition-all hover:shadow-xl hover:-translate-y-1 group`}
                >
                  <div className={`w-12 h-12 ${colorClasses.bg} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <GuideIcon className={`w-6 h-6 ${colorClasses.text}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-orange-400 transition-colors">
                    {guide.title}
                  </h3>
                  <p className="text-gray-400">
                    {guide.description}
                  </p>
                  <div className="mt-4 text-orange-500 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center">
                    Read Guide
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            }

            return (
              <div
                key={guide.title}
                className="bg-slate-800/50 rounded-xl p-6 opacity-60 cursor-not-allowed"
              >
                <div className={`w-12 h-12 ${colorClasses.bg} rounded-lg flex items-center justify-center mb-4`}>
                  <GuideIcon className={`w-6 h-6 ${colorClasses.text}`} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {guide.title}
                </h3>
                <p className="text-gray-400">
                  {guide.description}
                </p>
                <div className="mt-4 text-gray-500 text-sm font-medium">
                  Coming Soon
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-8 sm:mt-12 bg-slate-800 rounded-xl p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Official Rulebooks</h2>
          <p className="text-gray-400 text-sm sm:text-base mb-4 sm:mb-6">
            While these guides provide a quick overview, we always recommend reading the official MECA rulebooks
            for complete and up-to-date competition rules.
          </p>
          <Link
            to="/rulebooks"
            className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg text-sm sm:text-base transition-colors"
          >
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            View Rulebooks
          </Link>
          </div>
        </div>
      </div>
    </>
  );
}
