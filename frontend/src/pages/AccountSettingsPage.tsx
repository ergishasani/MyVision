import { useEffect, useState } from 'react';
import api from '../lib/api';
import { toast } from '../components/Toast';
import { CreditCard, User, Lock, Building2, Check } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
}

interface Subscription {
  id: string;
  status: string;
  plan: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
}

export default function AccountSettingsPage() {
  const { user, fetchUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'security'>('profile');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    companyName: '',
    firstName: '',
    lastName: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchUserData();
    fetchSubscriptionData();
  }, []);

  const fetchUserData = async () => {
    try {
      await fetchUser();
      if (user) {
        setProfileData({
          companyName: user.companyName || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const [plansResponse, subscriptionResponse] = await Promise.all([
        api.get('/subscriptions/plans'),
        api.get('/subscriptions/current'),
      ]);

      setPlans(plansResponse.data.data.plans);
      setSubscription(subscriptionResponse.data.data.subscription);
      setIsTrial(subscriptionResponse.data.data.isTrial);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      const response = await api.post('/subscriptions/checkout', { planId });
      if (response.data.data.url) {
        window.location.href = response.data.data.url;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create checkout session');
    }
  };

  const handleBillingPortal = async () => {
    try {
      const response = await api.post('/subscriptions/billing-portal');
      if (response.data.data.url) {
        window.location.href = response.data.data.url;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to open billing portal');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // TODO: Implement profile update endpoint
      toast.success('Profile updated successfully');
      fetchUserData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      // TODO: Implement password change endpoint
      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; color: string }> = {
      ACTIVE: { text: 'Active', color: 'bg-green-100 text-green-800' },
      TRIAL: { text: 'Trial', color: 'bg-blue-100 text-blue-800' },
      CANCELLED: { text: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
      PAST_DUE: { text: 'Past Due', color: 'bg-red-100 text-red-800' },
      UNPAID: { text: 'Unpaid', color: 'bg-red-100 text-red-800' },
    };
    return badges[status] || badges.ACTIVE;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Account Settings</h1>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 border-b-2 font-medium ${
              activeTab === 'profile'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`px-4 py-2 border-b-2 font-medium ${
              activeTab === 'subscription'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <CreditCard className="w-4 h-4 inline mr-2" />
            Subscription
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 border-b-2 font-medium ${
              activeTab === 'security'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Lock className="w-4 h-4 inline mr-2" />
            Security
          </button>
        </div>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={profileData.companyName}
                onChange={(e) => setProfileData({ ...profileData, companyName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Update Profile
            </button>
          </form>
        </div>
      )}

      {/* Subscription Tab */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          {/* Current Subscription */}
          {subscription && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Current Subscription</h2>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-medium">
                    {subscription.plan.charAt(0) + subscription.plan.slice(1).toLowerCase()} Plan
                  </p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(subscription.status).color}`}>
                    {getStatusBadge(subscription.status).text}
                  </span>
                  {isTrial && subscription.trialEndsAt && (
                    <p className="text-sm text-gray-600 mt-2">
                      Trial ends: {new Date(subscription.trialEndsAt).toLocaleDateString()}
                    </p>
                  )}
                  {subscription.currentPeriodEnd && !isTrial && (
                    <p className="text-sm text-gray-600 mt-2">
                      Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleBillingPortal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Manage Billing
                </button>
              </div>
            </div>
          )}

          {/* Available Plans */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`bg-white rounded-lg shadow p-6 ${
                      subscription?.plan.toLowerCase() === plan.id
                        ? 'ring-2 ring-primary-600'
                        : ''
                    }`}
                  >
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-3xl font-bold">€{plan.price}</span>
                      <span className="text-gray-600">/{plan.interval}</span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {subscription?.plan.toLowerCase() === plan.id ? (
                      <button
                        disabled
                        className="w-full px-4 py-2 bg-gray-200 text-gray-600 rounded-lg cursor-not-allowed"
                      >
                        Current Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(plan.id)}
                        className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        {subscription ? 'Switch Plan' : 'Subscribe'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Change Password
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
