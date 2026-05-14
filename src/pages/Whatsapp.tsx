import { useEffect, useState } from "react";
import { getAllContacts, getAllLabels, getMessagesChat, sendText } from "@/utils/sendZapApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Phone, User, Search, Tag, Users, MessageSquare, Send, Briefcase, Filter, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Whatsapp() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // New Filters
  const [contactTypeFilter, setContactTypeFilter] = useState("all");
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contactsData, labelsData] = await Promise.all([
          getAllContacts(),
          getAllLabels().catch(err => {
            console.error("Error fetching labels:", err);
            return null;
          })
        ]);
        
        let contactsList = [];
        if (contactsData && contactsData.response && Array.isArray(contactsData.response.contacts)) {
          contactsList = contactsData.response.contacts;
        } else if (contactsData && contactsData.response && Array.isArray(contactsData.response)) {
          contactsList = contactsData.response;
        } else if (Array.isArray(contactsData)) {
          contactsList = contactsData;
        }
        setContacts(contactsList);

        if (labelsData && labelsData.response && Array.isArray(labelsData.response.data)) {
          setLabels(labelsData.response.data);
        } else if (labelsData && labelsData.response && Array.isArray(labelsData.response)) {
          setLabels(labelsData.response);
        } else if (Array.isArray(labelsData)) {
          setLabels(labelsData);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getContactName = (contact: any) => {
    return contact.name || contact.pushname || contact.contact?.name || contact.data?.name || contact.data?.pushname || "Desconhecido";
  };

  const getContactPhone = (contact: any) => {
    let phone = contact.phone || contact.id?._serialized || contact.id?.user || contact.id || contact.data?.id?._serialized || contact.data?.id?.user || contact.data?.id || "";
    if (typeof phone === 'object' && phone._serialized) phone = phone._serialized;
    if (typeof phone === 'string') {
      phone = phone.replace('@c.us', '');
    }
    return phone;
  };

  const getContactLabelsList = (contact: any) => {
    const contactLabels = contact.labels || contact.data?.labels || [];
    if (!Array.isArray(contactLabels)) return [];
    
    return contactLabels.map(labelId => {
      const found = labels.find(l => l.id === String(labelId));
      return found ? found : { id: labelId, name: `Tag ${labelId}`, hexColor: "#cccccc" };
    });
  };

  const filteredContacts = contacts.filter((contact) => {
    const name = getContactName(contact).toLowerCase();
    const phone = String(getContactPhone(contact)).toLowerCase();
    const term = searchTerm.toLowerCase();
    
    const matchesSearch = name.includes(term) || phone.includes(term);

    let matchesType = true;
    const isBusiness = contact.isBusiness || contact.data?.isBusiness;
    const isGroup = contact.id?.server === 'g.us' || contact.data?.id?.server === 'g.us';

    if (contactTypeFilter === "ps") {
      matchesType = getContactName(contact).toUpperCase().startsWith("PS");
    } else if (contactTypeFilter === "business") {
      matchesType = !!isBusiness;
    } else if (contactTypeFilter === "personal") {
      matchesType = !isBusiness && !isGroup;
    } else if (contactTypeFilter === "groups") {
      matchesType = !!isGroup;
    } else if (contactTypeFilter === "has_labels") {
      const contactLabels = contact.labels || contact.data?.labels || [];
      matchesType = Array.isArray(contactLabels) && contactLabels.length > 0;
    }

    let matchesLabel = true;
    if (selectedLabelId) {
      const contactLabels = contact.labels || contact.data?.labels || [];
      matchesLabel = Array.isArray(contactLabels) && contactLabels.some(lId => String(lId) === selectedLabelId);
    }

    return matchesSearch && matchesType && matchesLabel;
  });

  const psContactsCount = contacts.filter((contact) => {
    const name = getContactName(contact).toUpperCase();
    return name.startsWith("PS");
  }).length;

  const handleOpenChat = async (contact: any) => {
    setSelectedContact(contact);
    setChatLoading(true);
    setChatMessages([]);
    
    const phone = getContactPhone(contact);
    try {
      const messagesData = await getMessagesChat(phone, 10);
      
      let msgs = [];
      if (messagesData && messagesData.response && Array.isArray(messagesData.response)) {
        msgs = messagesData.response;
      } else if (Array.isArray(messagesData)) {
        msgs = messagesData;
      }
      
      msgs.sort((a, b) => {
        const timeA = a.timestamp || a.t || 0;
        const timeB = b.timestamp || b.t || 0;
        return timeA - timeB;
      });
      
      setChatMessages(msgs);
    } catch (error) {
      console.error("Error fetching chat:", error);
      toast({
        title: "Aviso",
        description: "Não foi possível carregar as mensagens recentes ou não há mensagens.",
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessageText.trim() || !selectedContact) return;

    const phone = getContactPhone(selectedContact);
    setSendingMessage(true);

    try {
      await sendText({ number: phone, text: newMessageText });
      
      const newMsg = {
        id: { fromMe: true },
        body: newMessageText,
        timestamp: Math.floor(Date.now() / 1000),
        t: Math.floor(Date.now() / 1000),
      };
      
      setChatMessages(prev => [...prev, newMsg]);
      setNewMessageText("");
      
      toast({
        title: "Mensagem enviada",
        description: "A mensagem foi enviada com sucesso.",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">WhatsApp Integrado</h1>
        <p className="text-muted-foreground">
          Gerencie seus contatos, clientes e etiquetas diretamente pelo painel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Contatos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : contacts.length}</div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contatos "PS"</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : psContactsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Iniciam com PS no nome</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Etiquetas</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : labels.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Etiquetas cadastradas</p>
          </CardContent>
        </Card>
      </div>

      {/* Etiquetas / Filtros rápidos */}
      <Card className="shadow-sm border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" /> 
            Filtrar por Etiqueta
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando etiquetas...</p>
          ) : labels.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma etiqueta encontrada.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant={selectedLabelId === null ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setSelectedLabelId(null)}
              >
                Todas
              </Badge>
              {labels.map((lbl) => (
                <Badge
                  key={lbl.id}
                  variant="outline"
                  className={`cursor-pointer transition-all border ${selectedLabelId === String(lbl.id) ? 'ring-2 ring-offset-1' : 'hover:scale-105'}`}
                  style={{
                    backgroundColor: selectedLabelId === String(lbl.id) ? (lbl.hexColor || '#ccc') : `${lbl.hexColor || '#ccc'}22`,
                    color: selectedLabelId === String(lbl.id) ? '#fff' : (lbl.hexColor || '#333'),
                    borderColor: lbl.hexColor || '#ccc'
                  }}
                  onClick={() => setSelectedLabelId(String(lbl.id))}
                >
                  {lbl.name} <span className="ml-1 opacity-70">({lbl.count || 0})</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="bg-muted/30 border-b space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Lista de Contatos
              {filteredContacts.length !== contacts.length && !loading && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (Mostrando {filteredContacts.length})
                </span>
              )}
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <Select value={contactTypeFilter} onValueChange={setContactTypeFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Tipo de Contato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="personal">Apenas Pessoas</SelectItem>
                  <SelectItem value="business">Apenas Empresas</SelectItem>
                  <SelectItem value="groups">Apenas Grupos</SelectItem>
                  <SelectItem value="ps">Iniciam com PS</SelectItem>
                  <SelectItem value="has_labels">Possuem alguma etiqueta</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar nome ou número..."
                  className="pl-9 pr-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={loading}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Carregando dados do WhatsApp...</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="p-4">
                {filteredContacts.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12 flex flex-col items-center gap-2">
                    <User className="h-10 w-10 opacity-20" />
                    <p>Nenhum contato encontrado com os filtros atuais.</p>
                    {(selectedLabelId || contactTypeFilter !== 'all' || searchTerm) && (
                      <Button 
                        variant="link" 
                        onClick={() => {
                          setSelectedLabelId(null);
                          setContactTypeFilter('all');
                          setSearchTerm('');
                        }}
                      >
                        Limpar todos os filtros
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredContacts.map((contact, index) => {
                      const name = getContactName(contact);
                      const phone = getContactPhone(contact);
                      const avatarUrl = contact.profilePicThumbObj?.eurl || contact.profilePicThumbObj?.img || null;
                      const contactLabelsList = getContactLabelsList(contact);

                      return (
                        <div 
                          key={index} 
                          className="flex items-center justify-between gap-2 p-4 border rounded-xl hover:bg-muted/50 transition-colors shadow-sm bg-background group"
                        >
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <Avatar className="h-12 w-12 border bg-primary/10 shrink-0">
                              {avatarUrl ? (
                                <AvatarImage src={avatarUrl} alt={name} />
                              ) : null}
                              <AvatarFallback className="text-primary font-medium">
                                {name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm truncate" title={name}>
                                {name}
                              </p>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 truncate">
                                {(contact.isBusiness || contact.data?.isBusiness) ? (
                                  <Briefcase className="h-3 w-3 shrink-0" />
                                ) : (
                                  <Phone className="h-3 w-3 shrink-0" />
                                )}
                                <span className="truncate">{phone}</span>
                              </div>
                              {/* Inline Labels */}
                              {contactLabelsList.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {contactLabelsList.map((lbl, i) => (
                                    <span 
                                      key={i} 
                                      className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                                      style={{ backgroundColor: lbl.hexColor ? `${lbl.hexColor}22` : '#eee', color: lbl.hexColor || '#333', border: `1px solid ${lbl.hexColor || '#ccc'}` }}
                                      title={lbl.name}
                                    >
                                      {lbl.name.length > 15 ? lbl.name.substring(0, 15) + "..." : lbl.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity rounded-full"
                            onClick={() => handleOpenChat(contact)}
                            title="Conversar"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedContact} onOpenChange={(open) => !open && setSelectedContact(null)}>
        <DialogContent className="sm:max-w-[700px] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-muted/20 shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border">
                  <AvatarFallback>{selectedContact ? getContactName(selectedContact).substring(0,2).toUpperCase() : ""}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span>{selectedContact ? getContactName(selectedContact) : ""}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {selectedContact ? getContactPhone(selectedContact) : ""}
                  </span>
                  
                  {/* Contact Labels */}
                  {selectedContact && getContactLabelsList(selectedContact).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {getContactLabelsList(selectedContact).map((lbl, i) => (
                        <span 
                          key={i} 
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: lbl.hexColor ? `${lbl.hexColor}33` : '#eee', color: lbl.hexColor || '#333', border: `1px solid ${lbl.hexColor || '#ccc'}` }}
                        >
                          {lbl.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </DialogTitle>

              {/* All Labels Dropdown/List */}
              <div className="flex flex-col items-start md:items-end text-xs hidden sm:flex">
                <p className="font-semibold mb-1 text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Info do Contato
                </p>
                <span className="text-muted-foreground text-[10px]">
                  {(selectedContact?.isBusiness || selectedContact?.data?.isBusiness) ? "Conta Comercial" : "Conta Pessoal"}
                  {selectedContact?.id?.server === 'g.us' ? " (Grupo)" : ""}
                </span>
              </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-4 bg-slate-50/50 dark:bg-slate-900/50">
            {chatLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-full gap-2 opacity-50">
                <MessageSquare className="h-8 w-8" />
                <p>Nenhuma mensagem recente encontrada.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {chatMessages.map((msg, idx) => {
                  const isMe = msg.id?.fromMe || msg.fromMe;
                  const body = msg.body || msg.text || "";
                  if (!body) return null;
                  
                  return (
                    <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl p-3 px-4 text-sm ${
                        isMe 
                          ? 'bg-primary text-primary-foreground rounded-br-sm' 
                          : 'bg-white border dark:bg-slate-800 dark:border-slate-700 rounded-bl-sm shadow-sm'
                      }`}>
                        {body}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="p-4 bg-background border-t">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="flex items-center gap-2"
            >
              <Input 
                placeholder="Digite uma mensagem..." 
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                disabled={sendingMessage || chatLoading}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!newMessageText.trim() || sendingMessage || chatLoading}>
                {sendingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
