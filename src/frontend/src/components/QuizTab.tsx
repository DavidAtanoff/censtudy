import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Brain, CheckCircle, ChevronRight, MessageSquare, RotateCcw, XCircle } from 'lucide-react'
import { Content, getQuizAttempts, gradeAnswer, submitQuiz } from '@/lib/api'
import { parseQuizQuestions } from '@/lib/studyml'
import { shuffleArray } from '@/lib/utils'
import StudyMLRenderer from './StudyMLRenderer'
import Button from './ui/Button'
import { Card, CardContent, CardTitle } from './ui/Card'

interface Props {
  content: Content
}

export default function QuizTab({ content }: Props) {
  const queryClient = useQueryClient()
  const [started, setStarted] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [aiFeedbacks, setAiFeedbacks] = useState<Record<number, { score: number; feedback: string; missing?: string[] }>>({})
  const [showResult, setShowResult] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [isGrading, setIsGrading] = useState(false)

  const { data: attempts } = useQuery({
    queryKey: ['quiz-attempts', content.id],
    queryFn: async () => {
      const res = await getQuizAttempts(content.id)
      return res.data
    },
    enabled: !started || showResult,
  })

  const questions = useMemo(() => {
    return shuffleArray(
      parseQuizQuestions(content.studyml_content).map((question) => ({
        ...question,
        options: question.type === 'short-answer' ? [] : shuffleArray(question.options),
      })),
    )
  }, [content.studyml_content])

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((value) => value + 1)
      return
    }

    setIsGrading(true)
    try {
      let totalScore = 0
      const gradedAnswers: Array<{ question_index: number; answer: string; score: number; missing?: string[] }> = []
      const feedbackMap: Record<number, { score: number; feedback: string; missing?: string[] }> = {}

      for (let index = 0; index < questions.length; index += 1) {
        const question = questions[index]
        const userAnswer = answers[index] || ''

        if (question.type === 'multiple-choice' || question.type === 'true-false') {
          const score = userAnswer === question.correctAnswer ? 100 : 0
          totalScore += score
          gradedAnswers.push({ question_index: index, answer: userAnswer, score })
          continue
        }

        const aiRes = await gradeAnswer({
          user_answer: userAnswer,
          correct_answer: question.correctAnswer || '',
          keywords: question.keywords,
        })

        const feedback = {
          score: aiRes.data.score,
          feedback: aiRes.data.feedback,
          missing: aiRes.data.missing_concepts,
        }

        totalScore += feedback.score
        feedbackMap[index] = feedback
        gradedAnswers.push({
          question_index: index,
          answer: userAnswer,
          score: feedback.score,
          missing: feedback.missing,
        })
      }

      await submitQuiz(content.id, { answers: gradedAnswers })
      await queryClient.refetchQueries({ queryKey: ['quiz-attempts', content.id] })

      setAiFeedbacks(feedbackMap)
      setFinalScore(questions.length > 0 ? totalScore / questions.length : 0)
      setShowResult(true)
    } catch (error) {
      console.error('Quiz grading failed:', error)
    } finally {
      setIsGrading(false)
    }
  }

  const handleReset = () => {
    setStarted(false)
    setCurrentQuestion(0)
    setAnswers({})
    setAiFeedbacks({})
    setShowResult(false)
    setIsGrading(false)
    setFinalScore(0)
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-6 md:grid-cols-5">
          <Card className="overflow-hidden border-black/10 md:col-span-3">
            <div className="flex h-28 items-center bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(240,249,255,0.86),_rgba(224,231,255,0.72))] px-8">
              <Award className="mr-4 h-8 w-8 text-black/35" />
              <CardTitle>{content.title}</CardTitle>
            </div>
            <CardContent className="pt-8">
              <div className="mb-8 grid gap-5 sm:grid-cols-3">
                <Stat label="Questions" value={questions.length.toString()} />
                <Stat label="Attempts" value={(attempts?.length || 0).toString()} />
                <Stat
                  label="Best Score"
                  value={attempts?.length ? `${Math.max(...attempts.map((attempt) => attempt.score)).toFixed(0)}%` : '--'}
                  accent
                />
              </div>

              <Button onClick={() => setStarted(true)} size="lg" className="h-14 rounded-full px-10 text-base">
                Begin Practice
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4 md:col-span-2">
            <h3 className="px-2 text-sm font-semibold uppercase tracking-[0.2em] text-black/40">Recent History</h3>
            {attempts?.slice(0, 5).map((attempt) => (
              <Card key={attempt.id} className="border-black/10">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{new Date(attempt.completed_at).toLocaleDateString()}</p>
                    <p className="font-semibold">{attempt.score.toFixed(0)}%</p>
                  </div>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      attempt.score >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {attempt.score >= 80 ? <CheckCircle className="h-4 w-4" /> : <Award className="h-4 w-4" />}
                  </div>
                </CardContent>
              </Card>
            ))}
            {!attempts?.length && (
              <div className="rounded-[24px] border border-dashed border-black/10 bg-white px-6 py-8 text-center text-sm text-muted-foreground">
                No history yet.
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (showResult) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="overflow-hidden border-black/10">
          <div className={`h-2 ${finalScore >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <CardContent className="p-12 text-center">
            <div className="mb-6 inline-flex rounded-full border border-black/10 bg-[#fafaf9] p-5">
              {finalScore >= 80 ? (
                <Award className="h-14 w-14 text-emerald-600" />
              ) : (
                <Brain className="h-14 w-14 text-amber-600" />
              )}
            </div>
            <h3 className="mb-2 text-5xl font-bold tracking-[-0.05em]">{finalScore.toFixed(0)}%</h3>
            <p className="mb-8 text-lg text-black/60">
              {finalScore >= 80 ? 'Strong recall and concept control.' : 'Solid attempt. Tighten the weak spots and run it again.'}
            </p>
            <Button onClick={handleReset} variant="outline" size="lg" className="h-14 rounded-full px-10">
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake Quiz
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-[-0.02em]">Question Review</h3>
          {questions.map((question, index) => (
            <Card key={`${question.index}-${index}`} className="overflow-hidden border-black/10">
              <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 text-lg font-semibold">
                    <StudyMLRenderer content={question.question} />
                  </div>
                  {question.type === 'short-answer' ? (
                    <div
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        (aiFeedbacks[index]?.score || 0) >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      AI {Math.round(aiFeedbacks[index]?.score || 0)}%
                    </div>
                  ) : answers[index] === question.correctAnswer ? (
                    <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
                  )}
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-black/10 bg-[#fafaf9] p-4 text-sm">
                    <span className="mr-2 font-semibold text-black/60">Your answer:</span>
                    {answers[index] || <span className="italic text-black/45">No answer</span>}
                  </div>

                  {aiFeedbacks[index] && (
                    <div
                      className={`flex gap-4 rounded-[24px] border p-5 text-sm ${
                        aiFeedbacks[index].score >= 80
                          ? 'border-emerald-100 bg-emerald-50/80 text-emerald-900'
                          : 'border-amber-100 bg-amber-50/80 text-amber-900'
                      }`}
                    >
                      <MessageSquare className="mt-0.5 h-5 w-5 shrink-0" />
                      <div className="flex-1">
                        <p className="italic leading-6">"{aiFeedbacks[index].feedback}"</p>
                        {!!aiFeedbacks[index].missing?.length && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {aiFeedbacks[index].missing?.map((concept) => (
                              <span key={concept} className="rounded-full border border-current/10 bg-white/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
                                {concept}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {question.explanation && (
                    <div className="rounded-2xl border border-black/10 bg-white p-4">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-black/45">Concept Explanation</p>
                      <StudyMLRenderer content={question.explanation} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const question = questions[currentQuestion]
  if (!question) {
    return <div className="rounded-[24px] border border-dashed border-black/10 bg-white px-6 py-8 text-center text-sm text-black/55">No quiz questions found.</div>
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-10">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-2xl font-semibold tracking-[-0.04em]">Question {currentQuestion + 1}</p>
            <p className="text-sm text-black/55">{content.title}</p>
          </div>
          <p className="text-sm font-semibold tabular-nums text-black/35">
            {currentQuestion + 1} / {questions.length}
          </p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
          <div
            className="h-full bg-black transition-all duration-500"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <Card className="border-black/10 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.28)]">
        <CardContent className="p-8 sm:p-10">
          <div className="mb-10 text-2xl font-semibold leading-snug">
            <StudyMLRenderer content={question.question} />
          </div>

          {(question.type === 'multiple-choice' || question.type === 'true-false') && (
            <div className="grid gap-3">
              {question.options.map((option, index) => {
                const selected = answers[currentQuestion] === option
                return (
                  <button
                    key={`${option}-${index}`}
                    onClick={() => !isGrading && setAnswers((current) => ({ ...current, [currentQuestion]: option }))}
                    disabled={isGrading}
                    className={`w-full rounded-[22px] border px-5 py-4 text-left transition ${
                      selected
                        ? 'border-black bg-black text-white shadow-sm'
                        : 'border-black/10 bg-white text-black hover:border-black/25 hover:bg-black/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                          selected ? 'border-white/35 bg-white/10 text-white' : 'border-black/10 text-black/55'
                        }`}
                      >
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="text-base font-medium">{option}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {question.type === 'short-answer' && (
            <textarea
              value={answers[currentQuestion] || ''}
              onChange={(event) => !isGrading && setAnswers((current) => ({ ...current, [currentQuestion]: event.target.value }))}
              disabled={isGrading}
              className="min-h-[180px] w-full rounded-[24px] border border-black/10 bg-[#fafaf9] p-5 text-base leading-7 outline-none transition focus:border-black/20 focus:bg-white"
              placeholder="Write your answer clearly and briefly."
            />
          )}

          <div className="mt-12 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setCurrentQuestion((value) => Math.max(0, value - 1))}
              disabled={currentQuestion === 0 || isGrading}
              className="px-2"
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={!answers[currentQuestion]?.trim() || isGrading}
              className="rounded-full px-8"
            >
              {isGrading ? (
                <>
                  <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                  Grading...
                </>
              ) : currentQuestion === questions.length - 1 ? (
                'Submit Quiz'
              ) : (
                <>
                  Next Question
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-white/90 px-4 py-4">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">{label}</p>
      <p className={`text-2xl font-semibold tracking-[-0.03em] ${accent ? 'text-emerald-600' : 'text-black'}`}>{value}</p>
    </div>
  )
}
