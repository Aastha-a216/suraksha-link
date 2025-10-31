import { useState, useRef } from "react";
import { AlertCircle, Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const SOSButton = () => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        await saveRecording(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("📹 Recording started", {
        description: "Audio and video recording in progress",
      });
    } catch (error) {
      toast.error("Failed to start recording. Please allow camera and microphone access.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const saveRecording = async (blob: Blob) => {
    // Save locally
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sos_recording_${Date.now()}.webm`;
    a.click();
    
    toast.info("Recording saved locally");
  };

  const shareLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
        const timestamp = new Date().toLocaleString();

        // Save to database
        if (user) {
          await supabase.from('sos_alerts').insert({
            user_id: user.id,
            latitude,
            longitude,
            status: 'active',
          });
        }

        // Get emergency contacts
        if (user) {
          const { data: contacts } = await supabase
            .from('emergency_contacts')
            .select('*')
            .eq('user_id', user.id);

          if (contacts && contacts.length > 0) {
            const message = encodeURIComponent(
              `🚨 SOS Alert! I need help.\nLocation: ${locationUrl}\nTime: ${timestamp}`
            );

            contacts.forEach((contact) => {
              // Open WhatsApp (opens in new tab, user needs to send)
              const whatsappUrl = `https://wa.me/${contact.phone.replace(/\D/g, '')}?text=${message}`;
              window.open(whatsappUrl, '_blank');
            });

            toast.success("Location shared with emergency contacts");
          } else {
            toast.warning("No emergency contacts found. Add contacts first.");
          }
        }
      },
      (error) => {
        toast.error("Failed to get location");
      }
    );
  };

  const startLocationUpdates = () => {
    shareLocation(); // Share immediately
    
    // Share every 30 seconds
    locationIntervalRef.current = setInterval(() => {
      shareLocation();
    }, 30000);
  };

  const stopLocationUpdates = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  };

  const triggerSOS = () => {
    toast.success("🚨 SOS Activated!", {
      description: "Emergency response initiated",
    });

    // Start recording
    startRecording();
    
    // Share location and start updates
    startLocationUpdates();

    // Voice feedback
    const utterance = new SpeechSynthesisUtterance(
      "SOS activated. Help is on the way."
    );
    speechSynthesis.speak(utterance);
  };

  const deactivateSOS = async () => {
    setIsActive(false);
    stopRecording();
    stopLocationUpdates();

    // Update database
    if (user) {
      await supabase
        .from('sos_alerts')
        .update({ status: 'deactivated', deactivated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('status', 'active');
    }

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
              <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${isRecording ? 'bg-secondary animate-pulse' : 'bg-muted'}`} />
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                {isRecording && <Video className="w-3 h-3" />}
                Recording
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SOSButton;
