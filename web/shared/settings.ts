// The script checklist (#4) and compliance rules (#5) a review uses, edited on the Settings page (#17)
export interface ChecklistItem { id: string, label: string, passes: string }
export interface ComplianceRule { id: string, severity: 'high' | 'medium' | 'low', broken: string }
export interface ReviewSettings { checklist: ChecklistItem[], rules: ComplianceRule[] }
