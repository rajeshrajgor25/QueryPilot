'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
  const getTimestamp = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Hi! I'm your AI SQL Agent\n\nI can help you interact with your database using natural language.\n\nTry asking:\n• Show all employees\n• What is the average salary?\n• Add a new employee\n\nI'll convert your request into SQL and execute it safely.",
      timestamp: '',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  // Initialize timestamps only on client
  useEffect(() => {
    setIsClient(true);
    setMessages((prev) =>
      prev.map((msg, idx) => ({
        ...msg,
        timestamp: msg.timestamp || getTimestamp(),
      }))
    );
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: getTimestamp(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: `Query executed successfully. Found ${data.results?.length || 0} result${
            data.results?.length !== 1 ? 's' : ''
          }.`,
          sql: data.sql,
          results: data.results,
          timestamp: getTimestamp(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          role: 'error',
          content: data.error || 'An error occurred while processing your query.',
          timestamp: getTimestamp(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'error',
        content: `Connection error: ${(error as Error).message}`,
        timestamp: getTimestamp(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent rounded-lg">
              <Database className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Database Agent</h1>
              <p className="text-sm text-muted-foreground">
                Query your database using natural language
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <ScrollArea className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-accent text-accent-foreground'
                    : message.role === 'error'
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-card text-foreground border border-border'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* SQL Display */}
                {message.sql && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <Code2 className="w-4 h-4" />
                      Generated SQL
                    </div>
                    <div className="rounded bg-background overflow-hidden">
                      <SyntaxHighlighter
                        language="sql"
                        style={atomOneDark}
                        customStyle={{
                          padding: '12px',
                          margin: 0,
                          fontSize: '12px',
                          borderRadius: '4px',
                        }}
                      >
                        {message.sql}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                )}

                {/* Results Table */}
                {message.results && message.results.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Results ({message.results.length} rows)
                    </div>
                    <div className="overflow-x-auto rounded border border-border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-secondary border-b border-border">
                            {Object.keys(message.results[0] || {}).map((key) => (
                              <th
                                key={key}
                                className="px-3 py-2 text-left font-semibold text-foreground"
                              >
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {message.results.slice(0, 5).map((row, rowIndex) => (
                            <tr
                              key={rowIndex}
                              className="border-b border-border hover:bg-secondary/50"
                            >
                              {Object.values(row as Record<string, any>).map(
                                (value, cellIndex) => (
                                  <td
                                    key={cellIndex}
                                    className="px-3 py-2 text-foreground"
                                  >
                                    {String(value)}
                                  </td>
                                )
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {message.results.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        Showing 5 of {message.results.length} rows
                      </p>
                    )}
                  </div>
                )}

                <div 
                  className="text-xs text-muted-foreground mt-2 opacity-70"
                  suppressHydrationWarning
                >
                  {message.timestamp}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-card text-foreground border border-border rounded-lg px-4 py-3 flex items-center gap-2">
                <Spinner className="w-4 h-4" />
                <span className="text-sm">Processing your query...</span>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <footer className="border-t border-border bg-card">
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
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
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
