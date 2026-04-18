'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Send, Code2, Database } from 'lucide-react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
  sql?: string;
  results?: any[];
  timestamp: string;
}

export function ChatInterface() {
  const getTimestamp = () =>
    new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Hi! I'm your AI SQL Agent.\n\nI can help you interact with your database using natural language.",
      timestamp: '',
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages((prev) =>
      prev.map((msg) => ({
        ...msg,
        timestamp: msg.timestamp || getTimestamp(),
      }))
    );
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendQuery(query: string, confirmed = false) {
    setLoading(true);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, confirmed }),
      });

      const data = await response.json();

      // Ask confirmation first
      if (data.needsConfirmation) {
        setPendingDelete(data.originalQuery);

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.message,
            timestamp: getTimestamp(),
          },
        ]);

        return;
      }

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Query executed successfully. Found ${
              data.results?.length || 0
            } result${data.results?.length !== 1 ? 's' : ''}.`,
            sql: data.sql,
            results: data.results,
            timestamp: getTimestamp(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'error',
            content: data.error || 'Something went wrong.',
            timestamp: getTimestamp(),
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'error',
          content: `Connection error: ${(error as Error).message}`,
          timestamp: getTimestamp(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userInput = input;

    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: userInput,
        timestamp: getTimestamp(),
      },
    ]);

    setInput('');
    await sendQuery(userInput);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    await sendQuery(pendingDelete, true);
    setPendingDelete(null);
  }

  function cancelDelete() {
    setPendingDelete(null);

    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: 'Delete operation cancelled.',
        timestamp: getTimestamp(),
      },
    ]);
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="p-2 bg-accent rounded-lg">
            <Database className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">AI Database Agent</h1>
            <p className="text-sm text-muted-foreground">
              Query your database using natural language
            </p>
          </div>
        </div>
      </header>

      {/* Chat */}
      <ScrollArea className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-2xl rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-accent text-accent-foreground'
                    : message.role === 'error'
                    ? 'bg-destructive text-white'
                    : 'bg-card border'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {message.sql && (
                  <div className="mt-3">
                    <div className="text-xs mb-1 flex items-center gap-1">
                      <Code2 className="w-4 h-4" />
                      Generated SQL
                    </div>

                    <SyntaxHighlighter
                      language="sql"
                      style={atomOneDark}
                      customStyle={{
                        padding: '12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        margin: 0,
                      }}
                    >
                      {message.sql}
                    </SyntaxHighlighter>
                  </div>
                )}

                {message.results && message.results.length > 0 && (
                  <div className="mt-3 overflow-x-auto border rounded">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-secondary">
                          {Object.keys(message.results[0]).map((key) => (
                            <th key={key} className="px-3 py-2 text-left">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {message.results.map((row, i) => (
                          <tr key={i} className="border-t">
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-3 py-2">
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="text-xs mt-2 opacity-70">
                  {message.timestamp}
                </div>
              </div>
            </div>
          ))}

          {/* Confirm Delete Buttons */}
          {pendingDelete && (
            <div className="flex gap-2">
              <Button
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Delete
              </Button>

              <Button variant="outline" onClick={cancelDelete}>
                Cancel
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border rounded-lg px-4 py-3 flex items-center gap-2">
                <Spinner className="w-4 h-4" />
                <span className="text-sm">Processing...</span>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <footer className="border-t bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your database..."
              disabled={loading}
              className="flex-1"
            />

            <Button
              type="submit"
              disabled={loading || !input.trim()}
              size="icon"
            >
              {loading ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </footer>
    </div>
  );
}