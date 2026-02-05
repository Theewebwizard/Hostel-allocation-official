import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Building2, Users, Cpu, Shield, ArrowRight } from "lucide-react";
import { Button } from "~/components/ui";
import { useAuthStore } from "~/lib/auth-store";

export function meta() {
  return [
    { title: "Hostel Allocation System - Intelligent Room Management" },
    {
      name: "description",
      content:
        "Intelligent Hostel Allocation System for educational institutions",
    },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const features = [
    {
      icon: Users,
      title: "Group Formation",
      description:
        "Create groups with friends and get allocated together in the same wing",
    },
    {
      icon: Cpu,
      title: "Smart Allocation",
      description:
        "AI-powered algorithm ensures optimal room assignments based on preferences",
    },
    {
      icon: Shield,
      title: "Consent-Based",
      description: "No one gets added to groups without explicit permission",
    },
    {
      icon: Building2,
      title: "Easy Management",
      description:
        "Wardens can manage hostels, rooms, and rules through an intuitive dashboard",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
      {/* Header */}
      <header className="p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">
            Hostel Allocation
          </span>
        </div>
        <div className="flex gap-4">
          <Link to="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link to="/register">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Intelligent Hostel
          <span className="text-indigo-600"> Allocation</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          Say goodbye to manual spreadsheets and chaotic room assignments. Our
          smart system ensures fair, preference-based hostel allocation for
          students.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/register">
            <Button size="lg" className="gap-2">
              Get Started <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">
              Login
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Why Choose Our System?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-indigo-600 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Simplify Hostel Allocation?
          </h2>
          <p className="text-indigo-100 mb-8 max-w-xl mx-auto">
            Join thousands of students who have already experienced stress-free
            room allocation.
          </p>
          <Link to="/register">
            <Button
              size="lg"
              className="bg-white text-indigo-600 hover:bg-gray-100"
            >
              Register Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600">
          <p>© 2026 Hostel Allocation System. Built with ❤️ for students.</p>
        </div>
      </footer>
    </div>
  );
}
