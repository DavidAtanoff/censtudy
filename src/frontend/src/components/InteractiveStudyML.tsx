import StudyMLRenderer from './StudyMLRenderer'

interface Props {
  content: string
}

export default function InteractiveStudyML({ content }: Props) {
  return <StudyMLRenderer content={content} />
}
