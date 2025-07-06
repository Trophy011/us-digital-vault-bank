
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, DollarSign, CreditCard, Users, ArrowRight, Building2 } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Shield className="h-8 w-8 text-blue-600" />,
      title: "Secure Banking",
      description: "State-of-the-art security with multi-factor authentication and fraud protection."
    },
    {
      icon: <DollarSign className="h-8 w-8 text-green-600" />,
      title: "High-Yield Savings",
      description: "Earn competitive interest rates on your savings with our premium accounts."
    },
    {
      icon: <CreditCard className="h-8 w-8 text-purple-600" />,
      title: "Instant Transfers",
      description: "Send money instantly to other US Bank customers with zero fees."
    },
    {
      icon: <Users className="h-8 w-8 text-orange-600" />,
      title: "Personal Service",
      description: "Dedicated customer support available 24/7 for all your banking needs."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-white" />
            <span className="text-2xl font-bold text-white">US Bank</span>
          </div>
          <div className="space-x-4">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20"
              onClick={() => navigate('/auth')}
            >
              Sign In
            </Button>
            <Button 
              className="bg-white text-blue-900 hover:bg-gray-100"
              onClick={() => navigate('/auth')}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          Banking Made
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            Simple & Secure
          </span>
        </h1>
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          Experience the future of banking with our comprehensive digital platform. 
          Manage your finances, transfer money, and grow your savings with confidence.
        </p>
        <div className="space-x-4">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-semibold hover:from-yellow-300 hover:to-orange-400"
            onClick={() => navigate('/auth')}
          >
            Open Account Today
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-white text-white hover:bg-white hover:text-blue-900"
            onClick={() => navigate('/auth')}
          >
            Sign In
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Why Choose US Bank?
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="bg-white/10 backdrop-blur-md border-white/20 text-white">
              <CardHeader>
                <div className="mb-4">{feature.icon}</div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-blue-100">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 text-white">
          <CardHeader>
            <CardTitle className="text-3xl mb-4">Ready to Get Started?</CardTitle>
            <CardDescription className="text-blue-100 text-lg">
              Join thousands of satisfied customers who trust US Bank with their financial future.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              size="lg" 
              className="bg-white text-blue-900 hover:bg-gray-100 font-semibold"
              onClick={() => navigate('/auth')}
            >
              Create Your Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-md border-t border-white/20">
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Building2 className="h-6 w-6 text-white" />
            <span className="text-xl font-bold text-white">US Bank</span>
          </div>
          <p className="text-blue-100">
            © 2024 US Bank. All rights reserved. Member FDIC. Equal Housing Lender.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
