import { Shield, MapPin, Users, AlertCircle, Phone, Video } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: AlertCircle,
    title: "One-Tap SOS",
    description: "Instantly alert emergency contacts with your location and status",
    color: "text-primary",
  },
  {
    icon: MapPin,
    title: "Live Location",
    description: "Share real-time GPS location with trusted contacts during emergencies",
    color: "text-secondary",
  },
  {
    icon: Users,
    title: "Emergency Contacts",
    description: "Quick access to call or message up to 5 trusted people",
    color: "text-accent",
  },
  {
    icon: Shield,
    title: "Safe Zone Map",
    description: "Find nearby police stations, hospitals, and safe places",
    color: "text-violet",
  },
  {
    icon: Phone,
    title: "Quick Actions",
    description: "Direct calling and messaging with one touch",
    color: "text-primary",
  },
  {
    icon: Video,
    title: "Evidence Recording",
    description: "Optional recording capabilities for documentation",
    color: "text-secondary",
  },
];

const Features = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3 text-foreground">Safety Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive protection tools designed to keep you safe and connected
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="p-6 shadow-card hover:shadow-warm transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
