import { Shield } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden bg-gradient-warm">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          {/* Shield icon with glow */}
          <div className="inline-flex items-center justify-center w-24 h-24 mb-8 rounded-full bg-gradient-raksha shadow-glow animate-pulse-glow">
            <Shield className="w-12 h-12 text-white" />
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-raksha bg-clip-text text-transparent leading-tight">
            Raksha Bandhan
          </h1>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
            Suraksha App
          </h2>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
            Your guardian angel in digital form. Instant SOS, live tracking, and emergency response 
            — protecting you with the power of technology and the spirit of Raksha Bandhan.
          </p>

          {/* CTA tagline */}
          <div className="inline-block px-6 py-3 bg-card rounded-full shadow-card">
            <p className="text-sm font-medium bg-gradient-raksha bg-clip-text text-transparent">
              ✨ Empowering women's safety, one tap at a time
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
