import { useEffect, useState } from 'react';
import { Store, TrendingUp, Users, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface RetailerDashboardProps {
  onNavigate: (page: string, data?: any) => void;
}

export default function RetailerDashboard({ onNavigate }: RetailerDashboardProps) {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Retailer/Manufacturer Dashboard
          </h1>
          <p className="text-gray-400">Manage your products and sponsorships</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Store className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Products Listed</p>
                <p className="text-white font-semibold text-2xl">0</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Views This Month</p>
                <p className="text-white font-semibold text-2xl">0</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Sponsored Events</p>
                <p className="text-white font-semibold text-2xl">0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500/10 rounded-full mb-6">
            <Store className="h-10 w-10 text-orange-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">
            Retailer & Manufacturer Portal
          </h3>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            Welcome to your dedicated dashboard! Here you can showcase your products,
            sponsor events, and connect with the car audio competition community. Features
            for product listings and sponsorship management will be available soon.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('events')}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              Browse Events
            </button>
            <button
              onClick={() => onNavigate('leaderboard')}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              View Leaderboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
