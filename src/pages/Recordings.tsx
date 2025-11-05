import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Video, Download, Trash2, MapPin } from "lucide-react";
import { format } from "date-fns";

interface SOSAlert {
  id: string;
  created_at: string;
  deactivated_at: string | null;
  recording_url: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
}

const Recordings = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecordings();
    }
  }, [user]);

  const fetchRecordings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('sos_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Failed to load recordings");
      console.error(error);
    } else {
      setAlerts(data || []);
    }
    setLoading(false);
  };

  const downloadRecording = async (recordingUrl: string) => {
    const { data, error } = await supabase.storage
      .from('sos-recordings')
      .download(recordingUrl);

    if (error) {
      toast.error("Failed to download recording");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = recordingUrl.split('/').pop() || 'recording.webm';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Recording downloaded");
  };

  const deleteRecording = async (alertId: string, recordingUrl: string | null) => {
    if (recordingUrl) {
      const { error: storageError } = await supabase.storage
        .from('sos-recordings')
        .remove([recordingUrl]);

      if (storageError) {
        toast.error("Failed to delete recording file");
        return;
      }
    }

    // Note: We can't delete from sos_alerts due to RLS, but we can clear the recording URL
    const { error } = await supabase
      .from('sos_alerts')
      .update({ recording_url: null })
      .eq('id', alertId);

    if (error) {
      toast.error("Failed to remove recording reference");
    } else {
      toast.success("Recording deleted");
      fetchRecordings();
    }
  };

  const getRecordingPreview = async (recordingUrl: string) => {
    const { data } = await supabase.storage
      .from('sos-recordings')
      .createSignedUrl(recordingUrl, 3600); // 1 hour expiry

    return data?.signedUrl;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-foreground">SOS Recordings</h1>
          
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading recordings...</p>
            </div>
          ) : alerts.length === 0 ? (
            <Card className="p-12 text-center">
              <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No recordings yet</h3>
              <p className="text-muted-foreground">
                Your SOS recordings will appear here
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card key={alert.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Video className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">
                          {format(new Date(alert.created_at), 'PPpp')}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            alert.status === 'active'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </div>
                      
                      {alert.deactivated_at && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Deactivated: {format(new Date(alert.deactivated_at), 'PPpp')}
                        </p>
                      )}
                      
                      {alert.latitude && alert.longitude && (
                        <a
                          href={`https://maps.google.com/?q=${alert.latitude},${alert.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <MapPin className="w-4 h-4" />
                          View Location
                        </a>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {alert.recording_url ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadRecording(alert.recording_url!)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteRecording(alert.id, alert.recording_url)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground self-center">
                          No recording available
                        </p>
                      )}
                    </div>
                  </div>

                  {alert.recording_url && (
                    <div className="mt-4">
                      <video
                        controls
                        className="w-full rounded-lg bg-black"
                        onLoadStart={async (e) => {
                          const url = await getRecordingPreview(alert.recording_url!);
                          if (url) {
                            e.currentTarget.src = url;
                          }
                        }}
                      />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Recordings;
