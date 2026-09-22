import { Button } from "@/components/ui/button";
import {
  BarChart3,
  BookOpen,
  LogIn,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface BouncingNumber {
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  size: number;
}

export default function LoginPage() {
  const { login, loginStatus } = useInternetIdentity();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const numbersRef = useRef<BouncingNumber[]>([]);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initialize bouncing numbers
    const initNumbers = () => {
      numbersRef.current = [];
      const count = Math.floor((canvas.width * canvas.height) / 15000);
      for (let i = 0; i < count; i++) {
        numbersRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          value: Math.floor(Math.random() * 10),
          size: 20 + Math.random() * 40,
        });
      }
    };
    initNumbers();

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const num of numbersRef.current) {
        // Update position
        num.x += num.vx;
        num.y += num.vy;

        // Bounce off edges and change number
        if (num.x <= 0 || num.x >= canvas.width) {
          num.vx *= -1;
          num.value = Math.floor(Math.random() * 10);
        }
        if (num.y <= 0 || num.y >= canvas.height) {
          num.vy *= -1;
          num.value = Math.floor(Math.random() * 10);
        }

        // Draw number
        ctx.font = `${num.size}px monospace`;
        ctx.fillStyle = `oklch(0.6 0.15 ${Math.random() * 360})`;
        ctx.fillText(num.value.toString(), num.x, num.y);
      }

      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error: any) {
      console.error("Login error:", error);
    }
  };

  const isLoggingIn = loginStatus === "logging-in";

  const features = [
    {
      icon: BookOpen,
      title: "Multi-Book Management",
      description:
        "Create and manage multiple accounting books for different businesses or departments",
    },
    {
      icon: TrendingUp,
      title: "Real-Time Analytics",
      description:
        "Track sales, profits, and business performance with live dashboards and insights",
    },
    {
      icon: Users,
      title: "Customer Management",
      description:
        "Maintain detailed customer records, track debts, and manage relationships",
    },
    {
      icon: BarChart3,
      title: "Inventory Control",
      description:
        "Monitor stock levels, get low-stock alerts, and optimize your inventory",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description:
        "Built on Internet Computer with decentralized authentication for maximum security",
    },
    {
      icon: Zap,
      title: "Fast & Efficient",
      description:
        "Lightning-fast transactions and instant updates across all your devices",
    },
  ];

  return (
    <div className="relative min-h-screen w-screen overflow-hidden bg-background">
      <canvas ref={canvasRef} className="absolute inset-0 opacity-30" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 md:p-6 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img
            src="/assets/icon.png"
            alt="Miyaco Global Books"
            className="h-10 w-10 md:h-12 md:w-12"
          />
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            Miyaco Global Books
          </h1>
        </div>
        <Button
          onClick={handleLogin}
          disabled={isLoggingIn}
          size="lg"
          className="gap-2"
        >
          {isLoggingIn ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Logging in...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Sign In
            </>
          )}
        </Button>
      </header>

      {/* Hero Section */}
      <div className="relative z-10 px-4 py-12 md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-foreground">
              Your Business,
              <br />
              <span className="text-primary">Perfectly Organized</span>
            </h2>
            <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Miyaco Global Books is your complete accounting and inventory
              management solution. Track sales, manage inventory, monitor
              profits, and grow your business with powerful analytics and
              real-time insights—all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={handleLogin}
                disabled={isLoggingIn}
                size="lg"
                className="gap-2 text-lg px-8 py-6 w-full sm:w-auto"
              >
                {isLoggingIn ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    Get Started Free
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                No credit card required • Secure authentication
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-card/50 backdrop-blur-sm border rounded-lg p-6 hover:shadow-lg transition-all hover:scale-105"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Benefits Section */}
          <div className="bg-card/50 backdrop-blur-sm border rounded-2xl p-8 md:p-12 text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Why Choose Miyaco Global Books?
            </h3>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Whether you're running a retail store, managing multiple
              locations, or tracking inventory for your business, Miyaco Global
              Books provides the tools you need to succeed. Our platform is
              designed for simplicity, speed, and scalability.
            </p>
            <div className="grid sm:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-primary mb-2">100%</div>
                <p className="text-sm text-muted-foreground">
                  Secure & Decentralized
                </p>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                <p className="text-sm text-muted-foreground">
                  Always Available
                </p>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">∞</div>
                <p className="text-sm text-muted-foreground">Unlimited Books</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t bg-background/80 backdrop-blur-sm py-6 px-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>
            © 2025 Miyaco Global Books. Built on Internet Computer for maximum
            security and reliability.
          </p>
        </div>
      </footer>
    </div>
  );
}
