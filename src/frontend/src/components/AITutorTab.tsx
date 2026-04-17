import { useEffect, useRef, useState } from 'react'
import { Bot, CornerDownLeft, Send, User } from 'lucide-react'
import { chatTutor } from '@/lib/api'
import StudyMLRenderer from './StudyMLRenderer'
import Button from './ui/Button'
import { Card, CardContent } from './ui/Card'

interface Props {
  unitId: number
}

interface Message {
  role: 'user' | 'model'
  content: string
}

const welcomeMessage =
  "I’ve read this unit’s study guide. Ask me to explain a concept, compare two ideas, make a mini-checklist, or turn something confusing into plain language."

export default function AITutorTab({ unitId }: Props) {
  const [messages, setMessages] = useState<Message[]>([{ role: 'model', content: welcomeMessage }])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    const history = [...messages, userMessage]

    setMessages(history)
    setInput('')
    setIsLoading(true)

    try {
      const res = await chatTutor(unitId, { messages: history })
      setMessages((current) => [...current, { role: 'model', content: res.data.response }])
    } catch (error) {
      console.error('Tutor chat failed:', error)
      setMessages((current) => [
        ...current,
        { role: 'model', content: "I couldn't reach the tutor service just now. Try again in a moment." },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="mx-auto flex min-h-[640px] max-w-5xl flex-col overflow-hidden border-black/10 bg-white/92 shadow-[0_26px_54px_-38px_rgba(15,23,42,0.28)]">
      <div className="border-b border-black/5 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(248,250,252,0.88),_rgba(241,245,249,0.72))] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-black/40">Tutor Mode</p>
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-black">Ask only what you need</h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-black/60">
              Best prompts are specific: “Explain this like I’m about to take a quiz,” “What misconception am I likely to have here?” or “Give me a 30-second recap.”
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => setMessages([{ role: 'model', content: welcomeMessage }])}>
            Reset Chat
          </Button>
        </div>
      </div>

      <CardContent className="flex-1 space-y-5 overflow-y-auto bg-[#fcfcfb] p-6">
        {messages.map((message, index) => (
          <div key={index} className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                message.role === 'user' ? 'bg-black text-white' : 'border border-black/10 bg-white text-black'
              }`}
            >
              {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div
              className={`max-w-[82%] rounded-[24px] px-5 py-4 ${
                message.role === 'user'
                  ? 'bg-black text-white'
                  : 'border border-black/10 bg-white shadow-[0_20px_44px_-36px_rgba(15,23,42,0.24)]'
              }`}
            >
              {message.role === 'user' ? (
                <p className="text-sm leading-7">{message.content}</p>
              ) : (
                <StudyMLRenderer content={message.content} />
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-black">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-[24px] border border-black/10 bg-white px-5 py-4 text-sm text-black/55 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.24)]">
              Thinking through the guide...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </CardContent>

      <div className="border-t border-black/5 bg-white p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {['Explain the hardest idea on this page.', 'Quiz me with one tricky question.', 'Give me a short recap before I test myself.'].map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="rounded-full border border-black/10 bg-[#fafaf9] px-3 py-1.5 text-xs font-medium text-black/60 transition hover:border-black/20 hover:text-black"
              onClick={() => setInput(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleSend()
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about a concept, confusion, or memory trick..."
            className="h-12 flex-1 rounded-full border border-black/10 bg-[#fafaf9] px-5 text-sm outline-none transition focus:border-black/20 focus:bg-white"
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="rounded-full px-5">
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <div className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-black/35">
          <CornerDownLeft className="h-3.5 w-3.5" />
          Ask narrower questions for better tutoring.
        </div>
      </div>
    </Card>
  )
}
