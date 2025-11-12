import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, MapPin, Download, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Recording {
  id: string;
  created_at: string;
  recording_type: string;
  file_size: number;
  recording_url: string;
  latitude: number | null;
  longitude: number | null;
  metadata: any;
}

interface LocationLog {
  id: string;
  created_at: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

interface CheckIn {
  id: string;
  created_at: string;
  status: string;
  check_in_interval: number;
  marked_safe_at: string | null;
  escalation_status: string | null;
  missed_checkins: number;
  evidence_saved_at: string | null;
}

const EvidenceVault = () => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [locationLogs, setLocationLogs] = useState<LocationLog[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    if (!user) return;

    try {
      // Fetch recordings
      const { data: recordingsData } = await (supabase as any)
        .from('recordings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch location logs
      const { data: logsData } = await (supabase as any)
        .from('location_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch check-ins
      const { data: checkInsData } = await supabase
        .from('safety_checkins')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setRecordings(recordingsData || []);
      setLocationLogs(logsData || []);
      setCheckIns((checkInsData as any) || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load evidence vault');
    } finally {
      setLoading(false);
    }
  };

  const downloadRecording = async (recordingUrl: string) => {
    const { data, error } = await supabase.storage
      .from('sos-recordings')
      .download(recordingUrl);

    if (error) {
      toast.error('Failed to download recording');
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = recordingUrl.split('/').pop() || 'recording.webm';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Recording downloaded');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-raksha bg-clip-text text-transparent mb-2">
              Evidence Vault
            </h1>
            <p className="text-muted-foreground">
              All your safety recordings, location logs, and check-in history
            </p>
          </div>

          <Tabs defaultValue="recordings" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="recordings">
                Recordings ({recordings.length})
              </TabsTrigger>
              <TabsTrigger value="locations">
                Locations ({locationLogs.length})
              </TabsTrigger>
              <TabsTrigger value="checkins">
                Check-ins ({checkIns.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recordings" className="mt-6">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading recordings...</p>
                </div>
              ) : recordings.length === 0 ? (
                <Card className="p-12 text-center">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No recordings yet</h3>
                  <p className="text-muted-foreground">
                    Recordings from safety check-ins will appear here
                  </p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {recordings.map((recording) => (
                    <Card key={recording.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Shield className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold">
                              {format(new Date(recording.created_at), 'PPpp')}
                            </h3>
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                              {recording.recording_type}
                            </span>
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>Size: {formatFileSize(recording.file_size)}</p>
                            {recording.metadata?.duration && (
                              <p>Duration: {formatDuration(recording.metadata.duration)}</p>
                            )}
                            {recording.latitude && recording.longitude && (
                              <a
                                href={`https://maps.google.com/?q=${recording.latitude},${recording.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-primary hover:underline"
                              >
                                <MapPin className="w-4 h-4" />
                                View Location
                              </a>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadRecording(recording.recording_url)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="locations" className="mt-6">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading location logs...</p>
                </div>
              ) : locationLogs.length === 0 ? (
                <Card className="p-12 text-center">
                  <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No location logs yet</h3>
                  <p className="text-muted-foreground">
                    Location history from check-ins will appear here
                  </p>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {locationLogs.map((log) => (
                    <Card key={log.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium text-sm">
                              {format(new Date(log.created_at), 'PPpp')}
                            </p>
                            {log.accuracy && (
                              <p className="text-xs text-muted-foreground">
                                Accuracy: ±{log.accuracy.toFixed(0)}m
                              </p>
                            )}
                          </div>
                        </div>
                        <a
                          href={`https://maps.google.com/?q=${log.latitude},${log.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View Map
                        </a>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="checkins" className="mt-6">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading check-ins...</p>
                </div>
              ) : checkIns.length === 0 ? (
                <Card className="p-12 text-center">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No check-ins yet</h3>
                  <p className="text-muted-foreground">
                    Your safety check-in history will appear here
                  </p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {checkIns.map((checkin) => (
                    <Card key={checkin.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-primary" />
                          <div>
                            <h3 className="font-semibold">
                              {format(new Date(checkin.created_at), 'PPpp')}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Interval: Every {checkin.check_in_interval / 60} minutes
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            checkin.status === 'active'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {checkin.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {checkin.marked_safe_at && (
                          <div>
                            <p className="text-muted-foreground">Marked Safe</p>
                            <p className="font-medium">
                              {format(new Date(checkin.marked_safe_at), 'PPp')}
                            </p>
                          </div>
                        )}
                        {checkin.evidence_saved_at && (
                          <div>
                            <p className="text-muted-foreground">Evidence Saved</p>
                            <p className="font-medium">
                              {format(new Date(checkin.evidence_saved_at), 'PPp')}
                            </p>
                          </div>
                        )}
                        {checkin.escalation_status && checkin.escalation_status !== 'none' && (
                          <div className="col-span-2">
                            <div className="flex items-center gap-2 text-warning">
                              <AlertCircle className="w-4 h-4" />
                              <span className="font-medium">
                                Escalation: {checkin.escalation_status}
                              </span>
                            </div>
                          </div>
                        )}
                        {checkin.missed_checkins > 0 && (
                          <div>
                            <p className="text-muted-foreground">Missed Check-ins</p>
                            <p className="font-medium text-warning">
                              {checkin.missed_checkins}
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default EvidenceVault;
