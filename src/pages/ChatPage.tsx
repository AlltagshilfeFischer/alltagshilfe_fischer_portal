import React, { useState } from 'react';
import { ChatBot } from '@/components/chat/ChatBot';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Settings, MessageCircle } from 'lucide-react';

export default function ChatPage() {
  const [n8nUrl, setN8nUrl] = useState('');
  const [showSettings, setShowSettings] = useState(true);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">N8N Chatbot</h1>
          <p className="text-muted-foreground">
            Chatbot mit N8N Integration
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Einstellungen
        </Button>
      </div>

      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              N8N Konfiguration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="n8n-url">N8N Webhook URL</Label>
              <Input
                id="n8n-url"
                value={n8nUrl}
                onChange={(e) => setN8nUrl(e.target.value)}
                placeholder="https://your-n8n-instance.com/webhook/..."
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Geben Sie hier Ihre N8N Webhook URL ein
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        <ChatBot n8nUrl={n8nUrl} />
      </div>
    </div>
  );
}