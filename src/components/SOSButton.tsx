import { useState, useRef, useEffect } from "react";
import { AlertCircle, Phone, Video, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const SOSButton = () => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [voiceActivationEnabled, setVoiceActivationEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  // Request camera and microphone permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setHasPermission(true);
        // Store the stream for later use
        streamRef.current = stream;
        toast.success("Camera and microphone ready for emergency recording");
      } catch (error) {
        toast.warning("Please allow camera and microphone access for emergency recording", {
          description: "Recording will be disabled without permissions"
        });
      }
    };

    requestPermissions();

    return () => {
      // Clean up stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Voice activation setup
  useEffect(() => {
    if (!voiceActivationEnabled) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("Voice activation not supported in this browser");
      setVoiceActivationEnabled(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      toast.success("Voice activation listening for 'Alpha X'");
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('')
        .toLowerCase();

      console.log('Voice input:', transcript);

      if (transcript.includes('alpha x') || transcript.includes('alpha ex')) {
        toast.success("Voice trigger detected!");
        activateSOS();
        // Brief pause after activation
        recognition.stop();
        setTimeout(() => {
          if (voiceActivationEnabled && !isActive) {
            recognition.start();
          }
        }, 5000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Restart if it stops due to no speech
        setTimeout(() => {
          if (voiceActivationEnabled) {
            recognition.start();
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Restart if still enabled
      if (voiceActivationEnabled && !isActive) {
        setTimeout(() => {
          recognition.start();
        }, 500);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [voiceActivationEnabled, isActive]);

  const toggleVoiceActivation = () => {
    setVoiceActivationEnabled(!voiceActivationEnabled);
  };

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
    if (!hasPermission || !streamRef.current) {
      toast.error("Camera and microphone access required for recording");
      return;
    }

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
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
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("📹 Recording started automatically", {
        description: "Audio and video recording in progress",
      });
    } catch (error) {
      toast.error("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const saveRecording = async (blob: Blob) => {
    if (!user) return;

    const fileName = `${user.id}/sos_recording_${Date.now()}.webm`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('sos-recordings')
      .upload(fileName, blob, {
        contentType: 'video/webm',
        upsert: false
      });

    if (uploadError) {
      toast.error("Failed to upload recording to cloud");
      console.error("Upload error:", uploadError);
      
      // Fallback: save locally
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sos_recording_${Date.now()}.webm`;
      a.click();
      toast.info("Recording saved locally as fallback");
    } else {
      // Update the most recent SOS alert with recording URL
      await supabase
        .from('sos_alerts')
        .update({ recording_url: fileName })
        .eq('user_id', user.id)
        .eq('status', 'deactivated')
        .order('created_at', { ascending: false })
        .limit(1);
      
      toast.success("Recording saved to cloud storage");
    }
  };

  const shareLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Save to database
        if (user) {
          await supabase.from('sos_alerts').insert({
            user_id: user.id,
            latitude,
            longitude,
            status: 'active',
          });
        }

        // Create alert for emergency contacts to view
        if (user) {
          const { data: contacts } = await supabase
            .from('emergency_contacts')
            .select('*')
            .eq('user_id', user.id);

          if (contacts && contacts.length > 0) {
            toast.success(`🚨 SOS Alert saved - Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          } else {
            toast.warning("No emergency contacts found. Add contacts in settings.");
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

    // Restart the stream for next time
    if (streamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        streamRef.current = stream;
      } catch (error) {
        setHasPermission(false);
      }
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
            
            {/* Voice Activation Toggle */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button
                onClick={toggleVoiceActivation}
                variant={voiceActivationEnabled ? "default" : "outline"}
                size="sm"
                className="gap-2"
              >
                {voiceActivationEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                Voice Activation
              </Button>
              {isListening && (
                <span className="text-xs text-primary animate-pulse">
                  Listening for "Alpha X"...
                </span>
              )}
            </div>
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
