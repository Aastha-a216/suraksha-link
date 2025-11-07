import { useState, useEffect, useRef } from "react";
import { Shield, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SafetyCheckIn = () => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [checkInId, setCheckInId] = useState<string | null>(null);
  const [interval, setInterval] = useState("600"); // 10 minutes in seconds
  const intervalRef = useRef<number | null>(null);

  // Check for active check-in on mount
  useEffect(() => {
    const checkActiveCheckIn = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('safety_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setIsActive(true);
        setCheckInId(data.id);
        setInterval(data.check_in_interval.toString());
        startLocationUpdates(data.check_in_interval);
      }
    };

    checkActiveCheckIn();

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user]);

  const shareLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        if (user) {
          const { data: contacts } = await supabase
            .from('emergency_contacts')
            .select('*')
            .eq('user_id', user.id);

          if (contacts && contacts.length > 0) {
            try {
              const { data, error } = await supabase.functions.invoke('send-sos-sms', {
                body: {
                  latitude,
                  longitude,
                  contacts: contacts.map(c => ({ phone: c.phone, name: c.name }))
                }
              });

              if (error) {
                console.error('Error sending check-in SMS:', error);
              } else {
                const successCount = data.results.filter((r: any) => r.success).length;
                toast.success(`Check-in sent to ${successCount} contact${successCount !== 1 ? 's' : ''}`);
              }

              // Update last update time
              if (checkInId) {
                await supabase
                  .from('safety_checkins')
                  .update({ last_update_at: new Date().toISOString() })
                  .eq('id', checkInId);
              }
            } catch (error) {
              console.error('Error sending check-in:', error);
            }
          }
        }
      },
      (error) => {
        console.error('Location error:', error);
      }
    );
  };

  const startLocationUpdates = (intervalSeconds: number) => {
    shareLocation(); // Share immediately
    
    // Share at specified interval
    const timer = window.setInterval(() => {
      shareLocation();
    }, intervalSeconds * 1000);
    
    intervalRef.current = timer;
  };

  const startCheckIn = async () => {
    if (!user) return;

    const intervalSeconds = parseInt(interval);

    // Create check-in record
    const { data, error } = await supabase
      .from('safety_checkins')
      .insert({
        user_id: user.id,
        status: 'active',
        check_in_interval: intervalSeconds
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to start check-in");
      return;
    }

    setCheckInId(data.id);
    setIsActive(true);
    startLocationUpdates(intervalSeconds);

    toast.success("Safety check-in started", {
      description: `Location will be shared every ${intervalSeconds / 60} minutes`,
    });
  };

  const markAsSafe = async () => {
    if (!checkInId || !user) return;

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    await supabase
      .from('safety_checkins')
      .update({ 
        status: 'completed',
        marked_safe_at: new Date().toISOString()
      })
      .eq('id', checkInId);

    setIsActive(false);
    setCheckInId(null);

    toast.success("Marked as safe!", {
      description: "Check-in stopped",
    });
  };

  return (
    <section className="py-16 relative">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3 text-foreground">Safety Check-In</h2>
            <p className="text-muted-foreground">
              Share your location periodically until you're safe
            </p>
          </div>

          <div className="bg-card rounded-lg p-6 shadow-card">
            {!isActive ? (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Check-in Interval
                  </label>
                  <Select value={interval} onValueChange={setInterval}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">Every 5 minutes</SelectItem>
                      <SelectItem value="600">Every 10 minutes</SelectItem>
                      <SelectItem value="900">Every 15 minutes</SelectItem>
                      <SelectItem value="1800">Every 30 minutes</SelectItem>
                      <SelectItem value="3600">Every hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={startCheckIn}
                  className="w-full"
                  size="lg"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Start Safety Check-In
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <MapPin className="w-5 h-5 animate-pulse" />
                  <span className="font-medium">Check-in Active</span>
                </div>

                <p className="text-sm text-center text-muted-foreground">
                  Location is being shared every {parseInt(interval) / 60} minutes
                </p>

                <Button
                  onClick={markAsSafe}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Mark Yourself as Safe
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SafetyCheckIn;
