import Hero from "@/components/Hero";
import SOSButton from "@/components/SOSButton";
import Features from "@/components/Features";
import EmergencyContacts from "@/components/EmergencyContacts";
import SafetyMap from "@/components/SafetyMap";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <SOSButton />
      <Features />
      <EmergencyContacts />
      <SafetyMap />
      
      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Built with 💝 in the spirit of Raksha Bandhan — protecting what matters most
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
