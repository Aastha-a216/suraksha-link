import { useState } from "react";
import { UserPlus, Phone, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

const EmergencyContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([
    { id: "1", name: "Priya Sharma", phone: "+91 98765 43210", relation: "Sister" },
    { id: "2", name: "Rahul Verma", phone: "+91 98765 43211", relation: "Brother" },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", relation: "" });

  const addContact = () => {
    if (!newContact.name || !newContact.phone) {
      toast.error("Please fill in all fields");
      return;
    }

    const contact: Contact = {
      id: Date.now().toString(),
      ...newContact,
    };

    setContacts([...contacts, contact]);
    setNewContact({ name: "", phone: "", relation: "" });
    setIsDialogOpen(false);
    toast.success("Contact added successfully");
  };

  const deleteContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
    toast.info("Contact removed");
  };

  const callContact = (phone: string, name: string) => {
    toast.info(`Calling ${name}...`, {
      description: phone,
    });
    // In a real app: window.location.href = `tel:${phone}`;
  };

  const messageContact = (phone: string, name: string) => {
    const message = "🚨 EMERGENCY! I need help. My location: [Location will be shared]";
    toast.info(`Sending message to ${name}...`);
    // In a real app: window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
  };

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
                <Button className="bg-gradient-raksha hover:opacity-90">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Emergency Contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="Name"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  />
                  <Input
                    placeholder="Phone Number"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  />
                  <Input
                    placeholder="Relation (e.g., Sister, Friend)"
                    value={newContact.relation}
                    onChange={(e) => setNewContact({ ...newContact, relation: e.target.value })}
                  />
                  <Button onClick={addContact} className="w-full bg-gradient-raksha hover:opacity-90">
                    Add Contact
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
                    <p className="text-sm text-muted-foreground">{contact.relation}</p>
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
                    Message
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {contacts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No emergency contacts added yet</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default EmergencyContacts;
