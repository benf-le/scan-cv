export interface CandidateProfile {
  id: string;
  fileName: string;
  
  // Custom ATS/Recruitment fields
  appliedDate?: string;      // "Applied Date"
  week?: string;             // "Week"
  position?: string;         // "Position"
  name: string;              // "Name"
  cvLink?: string;           // "CV"
  email: string;             // "Email"
  phone: string;             // "Phone"
  skills?: string[];
  sourceDetail?: string;     // "Source Detail"
  level?: string;            // "Level"
  yearOfBirth?: string;      // "Year of Birth"
  educationalLevel?: string; // "Educational_Level"
  university?: string;       // "University"
  expectSalary?: string;     // "Expect Salary (Gross VND)"
  branch?: string;           // "Branch"
  hmReview?: string;         // "HM Review"
  hmResult?: string;         // "HM Result"
  taOwner?: string;          // "TA"
  rate?: string;             // "Rate"
  interviewer?: string;      // "Interviewer"
  status?: string;           // "Status"
  r1Date?: string;           // "R1 Date"
  r2Date?: string;           // "R2 Date"
  offerDate?: string;        // "Offer Date"
  acceptedOfferDate?: string;// "Accepted Offer Date"
  onboardDate?: string;      // "Onboard Date"
  timeToHire?: string;       // "Time to hire"
  declineReason?: string;    // "Decline reason"
  month?: string;            // "Moth" (Month)
  
  // Fallback for custom fields or arbitrary additions
  rawResponse?: any;
}

export interface FileUploadState {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
  profileId?: string; // Links file to a successfully parsed profile
}

// Normalize spreadsheet/n8n keys into typed CandidateProfile
export function normalizeCandidate(raw: any, fileName: string = 'unknown_cv.pdf'): CandidateProfile {
  const getVal = (keys: string[]): string | undefined => {
    for (const key of keys) {
      if (raw[key] !== undefined && raw[key] !== null) {
        return String(raw[key]).trim();
      }
    }
    return undefined;
  };

  return {
    id: getVal(['id', 'ID']) || Math.random().toString(36).substring(2, 11),
    fileName: getVal(['fileName', 'FileName']) || fileName,
    appliedDate: getVal(['Applied Date', 'appliedDate', 'applied_date', 'AppliedDate']),
    week: getVal(['Week', 'week']),
    position: getVal(['Position', 'position']),
    name: getVal(['Name', 'name', 'Full Name', 'FullName']) || 'Unknown Candidate',
    cvLink: getVal(['CV', 'cv', 'cvLink', 'cv_link']),
    email: getVal(['Email', 'email', 'Email Address']) || '',
    phone: getVal(['Phone', 'phone', 'Telephone']) || '',
    skills: (() => {
      const val = raw.skills || raw.Skills;
      if (Array.isArray(val)) return val.map(String);
      if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    })(),
    sourceDetail: getVal(['Source Detail', 'sourceDetail', 'source_detail', 'SourceDetail']),
    level: getVal(['Level', 'level']),
    yearOfBirth: getVal(['Year of Birth', 'yearOfBirth', 'year_of_birth', 'YearOfBirth', 'YOB']),
    educationalLevel: getVal(['Educational_Level', 'educationalLevel', 'educational_level', 'EducationalLevel']),
    university: getVal(['University', 'university', 'School', 'school']),
    expectSalary: getVal(['Expect Salary (Gross VND)', 'expectSalary', 'expected_salary', 'ExpectSalary', 'Salary']),
    branch: getVal(['Branch', 'branch']),
    hmReview: getVal(['HM Review', 'hmReview', 'hm_review', 'HMReview']),
    hmResult: getVal(['HM Result', 'hmResult', 'hm_result', 'HMResult']),
    taOwner: getVal(['TA', 'ta', 'taOwner', 'ta_owner', 'TAOwner']),
    rate: getVal(['Rate', 'rate', 'Rating', 'rating']),
    interviewer: getVal(['Interviewer', 'interviewer']),
    status: getVal(['Status', 'status']) || 'Pending',
    r1Date: getVal(['R1 Date', 'r1Date', 'r1_date', 'R1Date']),
    r2Date: getVal(['R2 Date', 'r2Date', 'r2_date', 'R2Date']),
    offerDate: getVal(['Offer Date', 'offerDate', 'offer_date', 'OfferDate']),
    acceptedOfferDate: getVal(['Accepted Offer Date', 'acceptedOfferDate', 'accepted_offer_date', 'AcceptedOfferDate']),
    onboardDate: getVal(['Onboard Date', 'onboardDate', 'onboard_date', 'OnboardDate']),
    timeToHire: getVal(['Time to hire', 'timeToHire', 'time_to_hire', 'TimeToHire']),
    declineReason: getVal(['Decline reason', 'declineReason', 'decline_reason', 'DeclineReason']),
    month: getVal(['Moth', 'Month', 'month', 'moth']),
    rawResponse: raw
  };
}
