import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RecordingOptions {
  userId: string;
  checkinId: string | null;
  alertId?: string | null;
  onRecordingStart?: () => void;
  onRecordingSave?: (recordingId: string) => void;
}

export const useMediaRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<number | null>(null);
  const optionsRef = useRef<RecordingOptions | null>(null);

  const startRecording = useCallback(async (options: RecordingOptions) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      chunksRef.current = [];
      optionsRef.current = options;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await saveRecording();
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      // Start duration timer
      durationIntervalRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      if (options.onRecordingStart) {
        options.onRecordingStart();
      }

      toast.success('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to access microphone');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      
      setRecordingDuration(0);
    }
  }, [isRecording]);

  const saveRecording = async () => {
    if (chunksRef.current.length === 0 || !optionsRef.current) return;

    const options = optionsRef.current;
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    const timestamp = new Date().toISOString();
    const fileName = `${options.userId}/${timestamp}.webm`;

    try {
      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('sos-recordings')
        .upload(fileName, blob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get location if available
      let latitude = null;
      let longitude = null;
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch (error) {
          console.log('Could not get location for recording');
        }
      }

      // Calculate file hash (simple hash for demonstration)
      const arrayBuffer = await blob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Save to database
      const { data: recordingData, error: dbError } = await (supabase as any)
        .from('recordings')
        .insert({
          user_id: options.userId,
          checkin_id: options.checkinId,
          alert_id: options.alertId || null,
          recording_url: uploadData.path,
          recording_type: 'audio',
          file_size: blob.size,
          file_hash: fileHash,
          latitude,
          longitude,
          uploaded_at: timestamp,
          metadata: {
            duration: recordingDuration,
            mimeType: 'audio/webm'
          }
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success('Recording saved securely');

      if (options.onRecordingSave && recordingData) {
        options.onRecordingSave(recordingData.id);
      }
    } catch (error) {
      console.error('Failed to save recording:', error);
      toast.error('Failed to save recording');
    }
  };

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording
  };
};
