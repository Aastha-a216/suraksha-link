import { useState, useEffect, useRef } from "react";
import { Shield, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const SafetyCheckin = () => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [activeCheckinId, setActiveCheckinId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check for active check-in on mount
  useEffect(() => {
    if (user) {
      checkActiveCheckin();
    }
  }, [user]);

  const checkActiveCheckin = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('safety_checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setIsActive(true);
      setActiveCheckinId(data.id);
      setLastUpdate(new Date(data.last_update_at));
      startPeriodicUpdates();
    }
  };

  const sendLocationUpdate = async () => {
    if (!navigator.geolocation || !user) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Get emergency contacts
        const { data: contacts } = await supabase
          .from('emergency_contacts')
          .select('*')
          .eq('user_id', user.id);

        if (contacts && contacts.length > 0) {
          // Send SMS via edge function
          try {
            const { error } = await supabase.functions.invoke('send-sos-sms', {
              body: {
                latitude,
                longitude,
                contacts: contacts.map(c => ({ 
                  phone: c.phone, 
                  name: `${c.name} - Safety Check-in` 
                }))
              }
            });

            if (error) {
              console.error('Error sending check-in:', error);
            } else {
              // Update last_update_at
              if (activeCheckinId) {
                await supabase
                  .from('safety_checkins')
                  .update({ last_update_at: new Date().toISOString() })
                  .eq('id', activeCheckinId);
              }
              setLastUpdate(new Date());
              toast.success("Location update sent to contacts");
            }
          } catch (error) {
            console.error('Error sending update:', error);
          }
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
      }
    );
  };

  const startPeriodicUpdates = () => {
    // Send immediately
    sendLocationUpdate();

    // Then send every 10 minutes
    intervalRef.current = setInterval(() => {
      sendLocationUpdate();
    }, 600000); // 10 minutes
  };

  const startCheckin = async () => {
    if (!user) return;

    // Create new check-in
    const { data, error } = await supabase
      .from('safety_checkins')
      .insert({
        user_id: user.id,
        status: 'active',
        check_in_interval: 600
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to start safety check-in");
      return;
    }

    setActiveCheckinId(data.id);
    setIsActive(true);
    startPeriodicUpdates();
    toast.success("Safety check-in started", {
      description: "Location updates will be sent every 10 minutes"
    });
  };

  const markSafe = async () => {
    if (!activeCheckinId || !user) return;

    // Stop interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Update check-in status
    const { error } = await supabase
      .from('safety_checkins')
      .update({ 
        status: 'safe',
        marked_safe_at: new Date().toISOString()
      })
      .eq('id', activeCheckinId);

    if (error) {
      toast.error("Failed to mark as safe");
      return;
    }

    setIsActive(false);
    setActiveCheckinId(null);
    setLastUpdate(null);
    toast.success("Marked as safe!", {
      description: "Location updates stopped"
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const formatTimeSince = (date: Date | null) => {
    if (!date) return '';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-3 text-foreground">Safety Check-in</h2>
            <p className="text-muted-foreground">
              Share your location periodically until you're safe
            </p>
          </div>

          <div className="bg-card rounded-xl shadow-card p-8">
            {!isActive ? (
              <div className="text-center">
                <p className="text-muted-foreground mb-6">
                  Start a safety check-in to automatically share your location with emergency contacts every 10 minutes until you mark yourself as safe.
                </p>
                <Button
                  onClick={startCheckin}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Start Safety Check-in
                </Button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                      <MapPin className="w-10 h-10 text-primary" />
                    </div>
                    <div className="absolute -inset-1 rounded-full border-2 border-primary/30 animate-ping" />
                  </div>
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Check-in Active</h3>
                  <p className="text-muted-foreground text-sm">
                    Location updates every 10 minutes
                  </p>
                  {lastUpdate && (
                    <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Last update: {formatTimeSince(lastUpdate)}</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={markSafe}
                  variant="outline"
                  size="lg"
                  className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  I'm Safe Now
                </Button>
              </div>
            )}
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Your emergency contacts will receive periodic location updates via SMS</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SafetyCheckin;
