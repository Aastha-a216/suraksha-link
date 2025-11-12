import { useState, useEffect, useRef } from "react";
import { Shield, MapPin, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMediaRecording } from "@/hooks/useMediaRecording";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SafetyCheckIn = () => {
  const { user } = useAuth();
  const { isRecording, recordingDuration, startRecording, stopRecording } = useMediaRecording();
  const [isActive, setIsActive] = useState(false);
  const [checkInId, setCheckInId] = useState<string | null>(null);
  const [interval, setInterval] = useState("600"); // 10 minutes in seconds
  const [deactivationLimit, setDeactivationLimit] = useState("600"); // 10 minutes
  const [recordingEnabled, setRecordingEnabled] = useState(true);
  const [escalationStatus, setEscalationStatus] = useState<string>("none");
  const [missedCheckins, setMissedCheckins] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const escalationCheckRef = useRef<number | null>(null);

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
        setDeactivationLimit((data as any).deactivation_limit?.toString() || "600");
        setRecordingEnabled((data as any).recording_enabled ?? true);
        setEscalationStatus((data as any).escalation_status || "none");
        setMissedCheckins((data as any).missed_checkins || 0);
        startLocationUpdates(data.check_in_interval);
        startEscalationCheck(data);
      }
    };

    checkActiveCheckIn();

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      if (escalationCheckRef.current !== null) {
        clearInterval(escalationCheckRef.current);
      }
    };
  }, [user]);

  const startEscalationCheck = (checkinData: any) => {
    const checkInterval = 30000; // Check every 30 seconds
    
    const timer = window.setInterval(async () => {
      const { data } = await supabase
        .from('safety_checkins')
        .select('*')
        .eq('id', checkinData.id)
        .single();

      if (data) {
        const lastUpdate = new Date(data.last_update_at);
        const now = new Date();
        const timeSinceUpdate = (now.getTime() - lastUpdate.getTime()) / 1000;
        const deactivationTime = (now.getTime() - new Date(data.created_at).getTime()) / 1000;

        // Check if missed check-in
        if (timeSinceUpdate > data.check_in_interval * 2 && (data as any).escalation_status === 'none') {
          setEscalationStatus('escalated');
          toast.error("Missed check-in detected! Escalating...");
          
          // Send critical alert to emergency contacts
          const { data: contacts } = await supabase
            .from('emergency_contacts')
            .select('*')
            .eq('user_id', user?.id);

          if (contacts && contacts.length > 0 && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
              await supabase.functions.invoke('send-sos-sms', {
                body: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  contacts: contacts.map(c => ({ phone: c.phone, name: c.name })),
                  isCritical: true
                }
              });
            });
          }
        }

        // Check if deactivation limit exceeded
        if (deactivationTime > (data as any).deactivation_limit && data.status === 'active') {
          toast.error("Deactivation time exceeded! Alerting emergency contacts!");
          setEscalationStatus('critical');
        }

        setMissedCheckins((data as any).missed_checkins || 0);
        setEscalationStatus((data as any).escalation_status || 'none');
      }
    }, checkInterval);

    escalationCheckRef.current = timer;
  };

  const shareLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        if (user) {
          // Log location
          await (supabase as any).from('location_logs').insert({
            user_id: user.id,
            checkin_id: checkInId,
            latitude,
            longitude,
            accuracy
          });

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

              // Update last update time and reset escalation
              if (checkInId) {
                await supabase
                  .from('safety_checkins')
                  .update({ 
                    last_update_at: new Date().toISOString(),
                    missed_checkins: 0,
                    escalation_status: 'none'
                  })
                  .eq('id', checkInId);
                
                setMissedCheckins(0);
                setEscalationStatus('none');
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
    const deactivationSeconds = parseInt(deactivationLimit);

    // Create check-in record
    const { data, error } = await supabase
      .from('safety_checkins')
      .insert({
        user_id: user.id,
        status: 'active',
        check_in_interval: intervalSeconds,
        deactivation_limit: deactivationSeconds,
        recording_enabled: recordingEnabled
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to start check-in");
      return;
    }

    setCheckInId(data.id);
    setIsActive(true);
    setEscalationStatus('none');
    setMissedCheckins(0);
    startLocationUpdates(intervalSeconds);
    startEscalationCheck(data);

    // Start recording if enabled
    if (recordingEnabled && user) {
      await startRecording({
        userId: user.id,
        checkinId: data.id,
        onRecordingStart: () => {
          toast.info("Recording started for evidence collection");
        }
      });
    }

    toast.success("Safety check-in started", {
      description: `Location will be shared every ${intervalSeconds / 60} minutes`,
    });
  };

  const markAsSafe = async () => {
    if (!checkInId || !user) return;

    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (escalationCheckRef.current !== null) {
      clearInterval(escalationCheckRef.current);
      escalationCheckRef.current = null;
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
    setEscalationStatus('none');
    setMissedCheckins(0);

    toast.success("Marked as safe!", {
      description: "Check-in stopped and recordings saved",
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

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Deactivation Time Limit
                  </label>
                  <Select value={deactivationLimit} onValueChange={setDeactivationLimit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">5 minutes</SelectItem>
                      <SelectItem value="600">10 minutes</SelectItem>
                      <SelectItem value="900">15 minutes</SelectItem>
                      <SelectItem value="1800">30 minutes</SelectItem>
                      <SelectItem value="3600">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Time allowed before automatic escalation
                  </p>
                </div>

                <div className="mb-6 flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Enable Recording
                  </label>
                  <Button
                    variant={recordingEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecordingEnabled(!recordingEnabled)}
                  >
                    {recordingEnabled ? "Enabled" : "Disabled"}
                  </Button>
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

                {recordingEnabled && (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    {isRecording ? (
                      <>
                        <Mic className="w-4 h-4 text-destructive animate-pulse" />
                        <span className="text-muted-foreground">
                          Recording: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                        </span>
                      </>
                    ) : (
                      <>
                        <MicOff className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Recording enabled</span>
                      </>
                    )}
                  </div>
                )}

                {escalationStatus !== 'none' && (
                  <div className={`text-center text-sm font-medium ${
                    escalationStatus === 'critical' ? 'text-destructive' : 'text-warning'
                  }`}>
                    Status: {escalationStatus.toUpperCase()}
                  </div>
                )}

                {missedCheckins > 0 && (
                  <div className="text-center text-sm text-muted-foreground">
                    Missed check-ins: {missedCheckins}
                  </div>
                )}

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
