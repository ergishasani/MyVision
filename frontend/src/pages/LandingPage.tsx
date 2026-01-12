import { Link } from 'react-router-dom';
import { Check, ArrowRight, FileText, Zap, Shield, Mail, BarChart3, Users } from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'Professional Documents',
      description: 'Create beautiful invoices, quotes, and proforma invoices with ease.',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Parametric SVG Rendering',
      description: 'Visualize windows, doors, and shutters with parametric SVG renderings.',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Secure & Compliant',
      description: 'VAT calculations, audit trails, and secure document sharing.',
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: 'Email Integration',
      description: 'Send documents directly to clients via email with PDF attachments.',
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Business Insights',
      description: 'Track revenue, unpaid invoices, and VAT exposure with real-time dashboards.',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Client Management',
      description: 'Organize and manage all your clients in one place.',
    },
  ];

  const pricingPlans = [
    {
      name: 'Basic',
      price: '€29',
      period: '/month',
      description: 'Perfect for small businesses',
      features: [
        'Up to 50 documents per month',
        'Basic PDF generation',
        'Email sending',
        'Client management',
        'Dashboard analytics',
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      name: 'Professional',
      price: '€79',
      period: '/month',
      description: 'For growing businesses',
      features: [
        'Unlimited documents',
        'Advanced PDF generation',
        'Email sending',
        'Client management',
        'SVG rendering',
        'Priority support',
      ],
      cta: 'Get Started',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '€199',
      period: '/month',
      description: 'For large organizations',
      features: [
        'Unlimited documents',
        'Advanced PDF generation',
        'Email sending',
        'Client management',
        'SVG rendering',
        'Custom branding',
        'API access',
        'Dedicated support',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-primary-600">MyVision Invoicing</div>
            <div className="flex gap-4 items-center">
              <Link
                to="/login"
                className="text-gray-700 hover:text-primary-600 font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-900 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Professional Invoicing Made Simple
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-primary-100 max-w-3xl mx-auto">
            Create beautiful invoices, quotes, and technical documents with parametric SVG rendering for windows, doors, and shutters.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/signup"
              className="px-8 py-4 bg-white text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition flex items-center gap-2 text-lg"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-400 transition text-lg"
            >
              Sign In
            </Link>
          </div>
          <p className="mt-4 text-primary-200">14-day free trial • No credit card required</p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Your Business
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to streamline your invoicing and document management workflow.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition"
              >
                <div className="text-primary-600 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in minutes and create your first professional document.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Sign Up</h3>
              <p className="text-gray-600">
                Create your free account and start your 14-day trial. No credit card required.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Add Clients</h3>
              <p className="text-gray-600">
                Import or add your clients to start creating documents for them.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Documents</h3>
              <p className="text-gray-600">
                Build professional invoices and quotes with technical specifications and SVG renderings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your business needs. All plans include a 14-day free trial.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`bg-white rounded-lg shadow-lg p-8 ${
                  plan.popular ? 'ring-2 ring-primary-600 transform scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="bg-primary-600 text-white text-center py-1 rounded-t-lg -mt-8 -mx-8 mb-4 text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition ${
                    plan.popular
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-primary-100 max-w-2xl mx-auto">
            Join hundreds of businesses using MyVision Invoicing to streamline their document management.
          </p>
          <Link
            to="/signup"
            className="inline-block px-8 py-4 bg-white text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition text-lg"
          >
            Start Your Free Trial
          </Link>
          <p className="mt-4 text-primary-200">No credit card required • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">MyVision Invoicing</h3>
              <p className="text-sm">
                Professional invoicing and document management for modern businesses.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="hover:text-white">Features</Link></li>
                <li><Link to="/" className="hover:text-white">Pricing</Link></li>
                <li><Link to="/signup" className="hover:text-white">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="hover:text-white">About</Link></li>
                <li><Link to="/" className="hover:text-white">Contact</Link></li>
                <li><Link to="/" className="hover:text-white">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="hover:text-white">Documentation</Link></li>
                <li><Link to="/" className="hover:text-white">Help Center</Link></li>
                <li><Link to="/login" className="hover:text-white">Sign In</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} MyVision Invoicing. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
