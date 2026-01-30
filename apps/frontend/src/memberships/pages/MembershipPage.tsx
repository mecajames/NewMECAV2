import { useState, useEffect } from 'react';
import { Check, Star, Users, Trophy, Calendar, DollarSign, Globe, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { membershipTypeConfigsApi, MembershipTypeConfig, MembershipCategory } from '@/membership-type-configs';
import { SEOHead, useStaticPageSEO } from '@/shared/seo';

export default function MembershipPage() {
  const navigate = useNavigate();
  const [memberships, setMemberships] = useState<MembershipTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seoProps = useStaticPageSEO('membership');

  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        setLoading(true);
        const data = await membershipTypeConfigsApi.getPublic();
        // Sort by display order
        const sorted = data.sort((a, b) => a.displayOrder - b.displayOrder);
        setMemberships(sorted);
      } catch (err) {
        console.error('Error fetching memberships:', err);
        setError('Failed to load membership options');
      } finally {
        setLoading(false);
      }
    };

    fetchMemberships();
  }, []);

  const benefits = [
    {
      icon: DollarSign,
      title: 'Discounted Entry Fees',
      description: 'Save on event registration fees with your active membership',
    },
    {
      icon: Trophy,
      title: 'Points & Rankings',
      description: 'Compete for points and appear on official leaderboards and top 10',
    },
    {
      icon: Calendar,
      title: 'Early Event Access',
      description: 'Get priority registration for upcoming competitions when available',
    },
    {
      icon: Star,
      title: 'Exclusive Content',
      description: 'Access member-only resources and guides',
    },
    {
      icon: Users,
      title: 'Community Network',
      description: 'Connect with fellow car audio enthusiasts nationwide',
    },
    {
      icon: Globe,
      title: 'World Championship',
      description: 'Qualify and compete in the annual MECA World Championship events',
    },
  ];

  const getCategoryLabel = (category: MembershipCategory): string => {
    switch (category) {
      case MembershipCategory.COMPETITOR:
        return 'Competitor';
      case MembershipCategory.TEAM:
        return 'Team';
      case MembershipCategory.RETAIL:
        return 'Retailer';
      default:
        return category;
    }
  };

  const getCategoryDescription = (category: MembershipCategory): string => {
    switch (category) {
      case MembershipCategory.COMPETITOR:
        return 'For individual competitors looking to compete in MECA events';
      case MembershipCategory.TEAM:
        return 'For competition teams and car audio clubs';
      case MembershipCategory.RETAIL:
        return 'For retailers and dealers supporting the car audio community';
      default:
        return '';
    }
  };

  const handleSelectMembership = (membership: MembershipTypeConfig) => {
    // Go directly to checkout - account creation happens after payment
    navigate(`/membership/checkout/${membership.id}`);
  };

  return (
    <>
      <SEOHead {...seoProps} />
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
            Choose Your Membership
          </h2>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
              <span className="ml-3 text-gray-400">Loading membership options...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-orange-500 hover:text-orange-400"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {memberships.map((membership, _index) => (
                <div
                  key={membership.id}
                  className={`bg-slate-800 rounded-2xl shadow-2xl p-8 flex flex-col ${
                    membership.isFeatured
                      ? 'ring-4 ring-orange-500 transform scale-105 relative z-10'
                      : ''
                  }`}
                >
                  {membership.isFeatured && (
                    <div className="bg-orange-500 text-white text-sm font-semibold px-4 py-1 rounded-full inline-block mb-4 w-fit">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-2">
                    <span className="text-sm text-orange-400 font-medium uppercase tracking-wide">
                      {getCategoryLabel(membership.category)}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {membership.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 flex-grow-0">
                    {membership.description || getCategoryDescription(membership.category)}
                  </p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-white">
                      ${membership.price.toFixed(0)}
                    </span>
                    <span className="text-gray-400 ml-2">per year</span>
                  </div>
                  <ul className="space-y-4 mb-8 flex-grow">
                    {membership.benefits && membership.benefits.length > 0 ? (
                      membership.benefits.map((benefit, featureIndex) => (
                        <li key={featureIndex} className="flex items-start">
                          <Check className="h-6 w-6 text-orange-500 mr-3 flex-shrink-0" />
                          <span className="text-gray-300">{benefit}</span>
                        </li>
                      ))
                    ) : (
                      <>
                        <li className="flex items-start">
                          <Check className="h-6 w-6 text-orange-500 mr-3 flex-shrink-0" />
                          <span className="text-gray-300">All membership benefits</span>
                        </li>
                        <li className="flex items-start">
                          <Check className="h-6 w-6 text-orange-500 mr-3 flex-shrink-0" />
                          <span className="text-gray-300">Valid for 12 months</span>
                        </li>
                        <li className="flex items-start">
                          <Check className="h-6 w-6 text-orange-500 mr-3 flex-shrink-0" />
                          <span className="text-gray-300">Discounted event entries</span>
                        </li>
                        <li className="flex items-start">
                          <Check className="h-6 w-6 text-orange-500 mr-3 flex-shrink-0" />
                          <span className="text-gray-300">Points accumulation</span>
                        </li>
                      </>
                    )}
                  </ul>
                  <button
                    onClick={() => handleSelectMembership(membership)}
                    className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
                      membership.isFeatured
                        ? 'bg-orange-600 hover:bg-orange-700 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                  >
                    Get Started
                  </button>
                </div>
              ))}
            </div>
          )}
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
                Simply select a membership option above and complete the registration. Your membership will be activated once payment is processed.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                When does my membership expire?
              </h3>
              <p className="text-gray-400">
                All memberships are valid for 12 months from the date of purchase. You'll receive renewal reminders before expiration.
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
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                What's the difference between membership types?
              </h3>
              <p className="text-gray-400">
                Competitor memberships are for individuals competing in events. Team memberships are for clubs and groups. Retailer memberships are for businesses in the car audio industry.
              </p>
            </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
