import { useState } from "react";
import { AlertCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SOSButton = () => {
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const activateSOS = () => {
    // Start 3-second countdown
    let count = 3;
    setCountdown(count);
    
    const timer = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count === 0) {
        clearInterval(timer);
        setCountdown(null);
        setIsActive(true);
        
        // Trigger SOS actions
        triggerSOS();
      }
    }, 1000);
  };

  const triggerSOS = () => {
    toast.success("🚨 SOS Activated!", {
      description: "Emergency alerts sent to your contacts",
    });

    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        
        console.log("Emergency location:", locationUrl);
        
        // In a real app, this would send to emergency contacts
        toast.info("Location shared with emergency contacts", {
          description: locationUrl,
        });
      });
    }
  };

  const deactivateSOS = () => {
    setIsActive(false);
    toast.info("SOS Deactivated", {
      description: "Emergency mode turned off",
    });
  };

  return (
    <section className="py-16 relative">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3 text-foreground">Emergency SOS</h2>
            <p className="text-muted-foreground">
              Press and hold for 3 seconds to activate emergency response
            </p>
          </div>

          {/* SOS Button */}
          <div className="relative flex items-center justify-center mb-8">
            {/* Pulsing rings */}
            {!isActive && (
              <>
                <div className="absolute w-64 h-64 rounded-full bg-primary/10 animate-ping" />
                <div className="absolute w-56 h-56 rounded-full bg-secondary/10 animate-ping" style={{ animationDelay: "0.5s" }} />
              </>
            )}

            {/* Main button */}
            <button
              onMouseDown={activateSOS}
              onClick={() => {
                if (countdown !== null) {
                  setCountdown(null);
                }
              }}
              disabled={isActive}
              className={`
                relative w-48 h-48 rounded-full font-bold text-2xl
                transition-all duration-300 transform
                ${isActive 
                  ? 'bg-destructive text-destructive-foreground shadow-glow animate-glow-pulse' 
                  : 'bg-gradient-raksha text-white shadow-warm hover:scale-105 active:scale-95'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {countdown !== null ? (
                <span className="text-6xl font-bold">{countdown}</span>
              ) : isActive ? (
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="w-12 h-12 animate-pulse" />
                  <span className="text-lg">ACTIVE</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Phone className="w-12 h-12" />
                  <span className="text-lg">SOS</span>
                </div>
              )}
            </button>
          </div>

          {/* Deactivate button */}
          {isActive && (
            <div className="text-center animate-in fade-in-0 slide-in-from-bottom-4">
              <Button
                onClick={deactivateSOS}
                variant="outline"
                className="px-8"
              >
                Deactivate Emergency
              </Button>
            </div>
          )}

          {/* Status indicators */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="bg-card rounded-lg p-4 shadow-card text-center">
              <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${isActive ? 'bg-destructive animate-pulse' : 'bg-muted'}`} />
              <p className="text-xs text-muted-foreground">Alert</p>
            </div>
            <div className="bg-card rounded-lg p-4 shadow-card text-center">
              <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${isActive ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
              <p className="text-xs text-muted-foreground">Location</p>
            </div>
            <div className="bg-card rounded-lg p-4 shadow-card text-center">
              <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${isActive ? 'bg-secondary animate-pulse' : 'bg-muted'}`} />
              <p className="text-xs text-muted-foreground">Contacts</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SOSButton;
