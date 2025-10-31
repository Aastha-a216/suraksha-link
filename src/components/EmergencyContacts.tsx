import { useState, useEffect } from "react";
import { UserPlus, Phone, MessageCircle, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').max(20),
  relationship: z.string().min(1, 'Relationship is required').max(50),
});

const EmergencyContacts = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", relationship: "" });

  useEffect(() => {
    if (user) {
      loadContacts();
    }
  }, [user]);

  const loadContacts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setContacts(data || []);
    } catch (error: any) {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const addContact = async () => {
    if (!user) return;

    if (contacts.length >= 5) {
      toast.error('Maximum 5 contacts allowed');
      return;
    }

    try {
      const validated = contactSchema.parse(newContact);
      setSaving(true);

      const { error } = await supabase
        .from('emergency_contacts')
        .insert({
          user_id: user.id,
          name: validated.name,
          phone: validated.phone,
          relationship: validated.relationship,
        });

      if (error) throw error;

      await loadContacts();
      setNewContact({ name: "", phone: "", relationship: "" });
      setIsDialogOpen(false);
      toast.success("Contact added successfully");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('Failed to add contact');
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContacts(contacts.filter(c => c.id !== id));
      toast.info("Contact removed");
    } catch (error: any) {
      toast.error('Failed to delete contact');
    }
  };

  const callContact = (phone: string, name: string) => {
    window.location.href = `tel:${phone}`;
  };

  const messageContact = (phone: string, name: string) => {
    const message = "🚨 EMERGENCY! I need help.";
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3 text-foreground">Emergency Contacts</h2>
            <p className="text-muted-foreground">
              Add up to 5 trusted contacts who will receive alerts during emergencies
            </p>
          </div>

          {/* Add contact button */}
          <div className="mb-8 text-center">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-raksha hover:opacity-90"
                  disabled={contacts.length >= 5}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Contact {contacts.length > 0 && `(${contacts.length}/5)`}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Emergency Contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Full name"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="+1234567890"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      maxLength={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="relationship">Relationship</Label>
                    <Input
                      id="relationship"
                      placeholder="e.g., Sister, Friend, Parent"
                      value={newContact.relationship}
                      onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                      maxLength={50}
                    />
                  </div>
                  <Button 
                    onClick={addContact} 
                    disabled={saving}
                    className="w-full bg-gradient-raksha hover:opacity-90"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Contact'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Contacts grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {contacts.map((contact) => (
              <Card key={contact.id} className="p-6 shadow-card hover:shadow-warm transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">{contact.name}</h3>
                    <p className="text-sm text-muted-foreground">{contact.relationship}</p>
                    <p className="text-sm text-muted-foreground mt-1">{contact.phone}</p>
                  </div>
                  <button
                    onClick={() => deleteContact(contact.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => callContact(contact.phone, contact.name)}
                    size="sm"
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Call
                  </Button>
                  <Button
                    onClick={() => messageContact(contact.phone, contact.name)}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <MessageCircle className="w-3 h-3 mr-1" />
                    WhatsApp
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {contacts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No emergency contacts added yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add trusted contacts who will receive your emergency alerts
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default EmergencyContacts;
