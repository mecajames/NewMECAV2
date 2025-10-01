import { Check, Star, Users, Trophy, Calendar, DollarSign } from 'lucide-react';

interface MembershipPageProps {
  onNavigate: (page: string) => void;
}

export default function MembershipPage({ onNavigate }: MembershipPageProps) {
  const benefits = [
    {
      icon: DollarSign,
      title: 'Discounted Entry Fees',
      description: 'Save on event registration fees with your active membership',
    },
    {
      icon: Trophy,
      title: 'Points & Rankings',
      description: 'Compete for points and appear on official leaderboards',
    },
    {
      icon: Calendar,
      title: 'Early Event Access',
      description: 'Get priority registration for upcoming competitions',
    },
    {
      icon: Star,
      title: 'Exclusive Content',
      description: 'Access member-only resources, rulebooks, and guides',
    },
    {
      icon: Users,
      title: 'Community Network',
      description: 'Connect with fellow car audio enthusiasts nationwide',
    },
  ];

  const membershipTiers = [
    {
      name: 'Annual Membership',
      price: '$50',
      period: 'per year',
      features: [
        'All membership benefits',
        'Valid for 12 months',
        'Discounted event entries',
        'Points accumulation',
        'Leaderboard eligibility',
        'Member certificate',
      ],
      highlighted: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="relative bg-gradient-to-r from-orange-600 to-red-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">Membership Benefits</h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Join the MECA community and unlock exclusive benefits for competitive car audio enthusiasts
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Why Become a Member?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-slate-800 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <benefit.icon className="h-12 w-12 text-orange-500 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Membership Options
          </h2>
          <div className="flex justify-center">
            {membershipTiers.map((tier, index) => (
              <div
                key={index}
                className={`bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full ${
                  tier.highlighted
                    ? 'ring-4 ring-orange-500 transform scale-105'
                    : ''
                }`}
              >
                {tier.highlighted && (
                  <div className="bg-orange-500 text-white text-sm font-semibold px-4 py-1 rounded-full inline-block mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold text-white mb-2">
                  {tier.name}
                </h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-white">{tier.price}</span>
                  <span className="text-gray-400 ml-2">{tier.period}</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="h-6 w-6 text-orange-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onNavigate('signup')}
                  className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
                    tier.highlighted
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                How do I become a member?
              </h3>
              <p className="text-gray-400">
                Simply create an account and complete the membership registration. Your membership will be activated once payment is processed.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                When does my membership expire?
              </h3>
              <p className="text-gray-400">
                Memberships are valid for 12 months from the date of purchase. You'll receive renewal reminders before expiration.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Can I compete without a membership?
              </h3>
              <p className="text-gray-400">
                Non-members may participate in events at standard entry fees, but won't accumulate points or appear on official leaderboards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
