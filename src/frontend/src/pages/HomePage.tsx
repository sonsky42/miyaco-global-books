import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Package,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

const slides = [
  {
    image: "/assets/generated/warehouse-robots.dim_800x600.jpg",
    title: "Automated Warehouse Management",
    description:
      "Streamline your inventory with cutting-edge automation technology",
  },
  {
    image: "/assets/generated/accountant-statistics.dim_800x600.jpg",
    title: "Real-Time Financial Analytics",
    description:
      "Make data-driven decisions with comprehensive financial insights",
  },
  {
    image: "/assets/generated/books-to-computers.dim_800x600.jpg",
    title: "Digital Transformation",
    description:
      "Move from traditional bookkeeping to modern cloud-based solutions",
  },
  {
    image: "/assets/generated/manager-software-users.dim_800x600.jpg",
    title: "Multi-User Collaboration",
    description:
      "Manage your team with role-based access and approval workflows",
  },
  {
    image: "/assets/generated/robot-inventory-store.dim_800x600.jpg",
    title: "Smart Inventory Tracking",
    description: "Never run out of stock with intelligent low-stock alerts",
  },
  {
    image: "/assets/generated/ai-retail-analytics.dim_800x600.jpg",
    title: "Advanced Retail Analytics",
    description: "Understand your customers and optimize your sales strategy",
  },
  {
    image: "/assets/generated/automated-inventory.dim_800x600.jpg",
    title: "Automated Stock Updates",
    description: "Real-time inventory synchronization across all transactions",
  },
  {
    image: "/assets/generated/ai-teamwork.dim_800x600.jpg",
    title: "Collaborative Teamwork",
    description: "Work together seamlessly with your team in real-time",
  },
];

const features = [
  {
    icon: BarChart3,
    title: "Financial Dashboard",
    description:
      "Track gross and net profits with real-time currency conversion and comprehensive monthly/yearly statistics.",
  },
  {
    icon: Package,
    title: "Inventory Management",
    description:
      "Manage products, track stock levels, receive low-stock alerts, and handle product variants with ease.",
  },
  {
    icon: Users,
    title: "Customer Management",
    description:
      "Maintain detailed customer profiles, track transaction history, and monitor outstanding debts.",
  },
  {
    icon: TrendingUp,
    title: "Analytics & Reports",
    description:
      "Generate interactive charts, downloadable reports, and gain insights into top customers and products.",
  },
  {
    icon: Shield,
    title: "Multi-User Access",
    description:
      "Role-based permissions with admin controls, approval workflows, and secure user management.",
  },
  {
    icon: Zap,
    title: "Offline-First Design",
    description:
      "Work seamlessly offline with automatic sync, ensuring your data is always accessible.",
  },
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section with Slideshow */}
      <section className="relative h-[70vh] md:h-[80vh] overflow-hidden">
        <div className="absolute inset-0">
          {slides.map((slide, index) => (
            <div
              key={slide.title}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            </div>
          ))}
        </div>

        {/* Slideshow Controls */}
        <div className="absolute inset-0 flex items-center justify-between px-4 md:px-8">
          <Button
            variant="outline"
            size="icon"
            onClick={prevSlide}
            className="h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextSlide}
            className="h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Slide Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-4xl">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
              {slides[currentSlide].title}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              {slides[currentSlide].description}
            </p>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((slide, index) => (
            <button
              type="button"
              key={slide.title}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Manage Your Business
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Miyaco Global Books provides a comprehensive suite of tools
              designed to streamline your accounting, inventory, and customer
              management processes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-2 hover:border-primary transition-colors"
              >
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Choose Miyaco Global Books?
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Real-Time Currency Conversion
                  </h3>
                  <p className="text-muted-foreground">
                    Stay updated with live exchange rates between NGN and USD,
                    automatically refreshed every 5 seconds for accurate
                    financial reporting.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Comprehensive Transaction Logging
                  </h3>
                  <p className="text-muted-foreground">
                    Record sales, purchases, and expenses with detailed
                    information including customer details, payment methods, and
                    custom notes.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Credit & Debt Tracking
                  </h3>
                  <p className="text-muted-foreground">
                    Monitor credit sales and purchases with due dates, overdue
                    alerts, and partial repayment tracking to maintain healthy
                    cash flow.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Receipt Generation & Sharing
                  </h3>
                  <p className="text-muted-foreground">
                    Create professional receipts with company branding and share
                    them instantly via WhatsApp, email, or SMS.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src="/assets/generated/ai-retail-analytics.dim_800x600.jpg"
                alt="Analytics Dashboard"
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 md:px-8 border-t">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground">
          <p>
            © 2025. Built with ❤️ using{" "}
            <a
              href="https://caffeine.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
