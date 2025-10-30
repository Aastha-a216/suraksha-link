import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SafetyMap = () => {
  const openMap = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        // Search for police stations near user
        const searchQuery = encodeURIComponent("police station");
        const url = `https://www.google.com/maps/search/${searchQuery}/@${latitude},${longitude},15z`;
        window.open(url, "_blank");
      }, (error) => {
        toast.error("Location access denied");
        // Fallback: open general police station search
        window.open("https://www.google.com/maps/search/police+station", "_blank");
      });
    } else {
      window.open("https://www.google.com/maps/search/police+station", "_blank");
    }
  };

  const safetySpots = [
    { name: "Police Stations", icon: "🚓", query: "police station" },
    { name: "Hospitals", icon: "🏥", query: "hospital" },
    { name: "Fire Stations", icon: "🚒", query: "fire station" },
  ];

  const searchNearby = (query: string) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        const searchQuery = encodeURIComponent(query);
        const url = `https://www.google.com/maps/search/${searchQuery}/@${latitude},${longitude},15z`;
        window.open(url, "_blank");
      });
    } else {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, "_blank");
    }
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3 text-foreground">Nearby Safety Services</h2>
            <p className="text-muted-foreground">
              Find police stations, hospitals, and safe places near you
            </p>
          </div>

          {/* Map preview card */}
          <Card className="p-8 shadow-card mb-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-raksha flex items-center justify-center shadow-glow">
              <MapPin className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">View Safety Map</h3>
            <p className="text-muted-foreground mb-6">
              Open an interactive map showing emergency services near your current location
            </p>
            <Button onClick={openMap} size="lg" className="bg-gradient-raksha hover:opacity-90">
              <MapPin className="w-4 h-4 mr-2" />
              Open Map
            </Button>
          </Card>

          {/* Quick search buttons */}
          <div className="grid md:grid-cols-3 gap-4">
            {safetySpots.map((spot, index) => (
              <Card
                key={index}
                className="p-6 shadow-card hover:shadow-warm transition-all duration-300 cursor-pointer group"
                onClick={() => searchNearby(spot.query)}
              >
                <div className="text-center">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{spot.icon}</div>
                  <h4 className="font-semibold text-foreground">{spot.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">Click to find nearby</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SafetyMap;
