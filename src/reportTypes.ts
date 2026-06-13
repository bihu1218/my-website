export type RoomType = 'living' | 'bedroom' | 'kitchen' | 'study' | 'entry' | 'whole'
export type Orientation =
  | 'unknown'
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'southeast'
  | 'southwest'
  | 'northeast'
  | 'northwest'
export type Concern = 'airflow' | 'lighting' | 'privacy' | 'clutter' | 'sleep' | 'wealth' | 'health'
export type Gender = 'unknown' | 'male' | 'female' | 'other'
export type Ownership = 'unknown' | 'own' | 'rent'
export type LifeGoal = 'wealth' | 'health' | 'relationship' | 'career' | 'study' | 'sleep' | 'comfort'

export type FormState = {
  roomType: RoomType
  orientation: Orientation
  homeSize: string
  people: string
  birthDate: string
  birthTime: string
  birthPlace: string
  gender: Gender
  household: string
  masterBedroomUser: string
  hasEldersOrChildren: boolean
  doorDirection: string
  floor: string
  moveInYear: string
  ownership: Ownership
  concerns: Concern[]
  goals: LifeGoal[]
  notes: string
}

export type ImagePayload = {
  name: string
  type: string
  dataUrl: string
}

export type AnalyzePayload = {
  images: ImagePayload[]
  form: FormState
}

export type Score = {
  label: string
  value: number
  summary: string
}

export type Finding = {
  title: string
  severity: 'high' | 'medium' | 'low'
  principle: string
  evidence: string
  action: string
}

export type RoomAdvice = {
  area: string
  diagnosis: string
  suggestions: string[]
}

export type ReportSection = {
  title: string
  summary: string
  suggestions: string[]
}

export type Report = {
  mode: 'ai' | 'rule'
  generatedAt: string
  overview: string
  overallScore: number
  scores: Score[]
  findings: Finding[]
  roomAdvice: RoomAdvice[]
  sections: ReportSection[]
  quickWins: string[]
  avoid: string[]
  disclaimer: string
}
