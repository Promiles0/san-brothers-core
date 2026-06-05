import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Check, Upload, X, File, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { usePortal } from '@/lib/portal-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StripePaymentForm } from '@/components/payments/stripe-payment-form'
import { toast } from 'sonner'
import type { ServiceCategory } from '@/lib/types/database'

export const Route = createFileRoute('/dashboard/services/apply/$slug')({
  component: ServiceApplyPage,
})

// ─── Constants ────────────────────────────────────────────────────────────────

const LANGUAGES = ['English', 'French', 'Chinese (Mandarin)', 'Kinyarwanda', 'Arabic', 'Swahili']

const CAT_CAPABILITY: Record<ServiceCategory, string> = {
  visa: 'handle_visa',
  translation: 'handle_translation',
  accounting: 'handle_accounting',
  consultancy: 'handle_consultancy',
}

// ─── Main Component ───────────────────────────────────────────────────────────

function ServiceApplyPage() {
  const { slug } = Route.useParams()
  const navigate = useNavigate()
  const { current: portal } = usePortal()

  const [service, setService] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<1 | 2>(1)

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    applicantType: 'individual' as 'individual' | 'company',
    nationality: '',
    passportId: '',
    // Service-specific fields
    companyName: '',
    businessStage: '',
    meetingFormat: '',
    description: '',
    destinationCountry: '',
    travelDate: '',
    returnDate: '',
    purposeOfVisit: '',
    sourceLanguage: '',
    targetLanguage: '',
    documentType: '',
    urgency: '',
    businessType: '',
    fiscalYearEnd: '',
    // Common
    notes: '',
  })

  const [uploadedDocs, setUploadedDocs] = useState<{ name: string; path: string }[]>([])

  // Fetch service and prefill user profile
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch service
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('slug', slug)
          .single()

        if (serviceError || !serviceData) {
          navigate({ to: '/dashboard/services' })
          return
        }

        setService(serviceData)

        // Fetch and prefill user profile
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('full_name, email, phone')
            .eq('id', user.id)
            .single()

          if (profile) {
            setFormData((prev) => ({
              ...prev,
              fullName: profile.full_name || '',
              email: profile.email || '',
              phone: profile.phone || '',
            }))
          }
        }

        setLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        navigate({ to: '/dashboard/services' })
      }
    }

    fetchData()
  }, [slug, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!service) return null

  const steps = [
    { number: 1, label: 'Application' },
    { number: 2, label: 'Payment' },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/dashboard/services"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Services
          </Link>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold">{service.name_en}</h1>
              <p className="text-sm text-muted-foreground capitalize">{service.category}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                ${service.price_usd_min}–${service.price_usd_max}
              </p>
              <p className="text-xs text-muted-foreground">USD</p>
            </div>
          </div>

          {/* Progress Indicator - 2 steps */}
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.number} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-all ${
                    step > s.number
                      ? 'bg-green-500 text-white'
                      : step === s.number
                        ? 'bg-blue-500 text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s.number ? <Check className="h-3 w-3" /> : s.number}
                </div>
                <span
                  className={`text-xs hidden sm:block transition-colors ${
                    step === s.number ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-px ${step > s.number ? 'bg-green-500' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {step === 1 && (
          <Step1Application
            service={service}
            formData={formData}
            setFormData={setFormData}
            uploadedDocs={uploadedDocs}
            setUploadedDocs={setUploadedDocs}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2Payment
            service={service}
            formData={formData}
            uploadedDocs={uploadedDocs}
            portal={portal}
            onBack={() => setStep(1)}
          />
        )}
      </div>
    </div>
  )
}

// ─── Step 1: Application Form ──────────────────────────────────────────────────

function Step1Application({
  service,
  formData,
  setFormData,
  uploadedDocs,
  setUploadedDocs,
  onNext,
}: any) {
  const [uploading, setUploading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('User not authenticated')
      return
    }

    setUploading(true)

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10 MB)`)
        continue
      }

      const uploadId = `${Date.now()}-${Math.random()}`
      setUploadingFiles((prev) => [...prev, { id: uploadId, name: file.name, progress: 0 }])

      try {
        // Sanitize filename: remove special characters (only keep alphanumeric, dots, and dashes)
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        // Ensure the path uses the required clients/ prefix for Supabase storage RLS
        const filePath = `clients/${user.id}/${Date.now()}-${safeName}`

        const { error } = await supabase.storage
          .from('client-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (progress) => {
              const percent = (progress.loaded / progress.total) * 100
              setUploadingFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadId ? { ...f, progress: Math.round(percent) } : f
                )
              )
            },
          })

        if (!error) {
          setUploadedDocs((prev: any) => [...prev, { name: file.name, path: filePath }])
          toast.success(`${file.name} uploaded successfully`)
        } else {
          toast.error(`Failed to upload ${file.name}`)
        }
      } catch (error) {
        toast.error(`Error uploading ${file.name}`)
      }

      setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId))
    }

    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveDocument = (index: number) => {
    setUploadedDocs((prev: any) => prev.filter((_: any, i: number) => i !== index))
  }

  const validateStep1 = (): boolean => {
    if (!formData.fullName.trim()) {
      toast.error('Full name is required')
      return false
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.error('Valid email is required')
      return false
    }
    if (!formData.phone.trim()) {
      toast.error('Phone number is required')
      return false
    }
    if (!formData.nationality.trim()) {
      toast.error('Nationality is required')
      return false
    }

    // Category-specific validation
    if (service.category === 'consultancy' || service.category === 'accounting') {
      if (!formData.description.trim()) {
        toast.error('Description is required for this service')
        return false
      }
    }

    return true
  }

  const requiredDocs = service.required_documents || []

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Service Summary Card */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-base">{service.name_en}</h2>
            <p className="text-sm text-muted-foreground capitalize">{service.category}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">${service.price_usd_min} USD</p>
            <p className="text-xs text-muted-foreground">
              ≈ RWF {(service.price_usd_min * 1285).toLocaleString()}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {service.estimated_days_min}–{service.estimated_days_max} days
        </p>
      </div>

      {/* Section 1: Personal Information */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Personal Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="Your full name"
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="your@email.com"
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+250 7XX XXX XXX"
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Applicant Type</Label>
            <Select value={formData.applicantType} onValueChange={(v) => handleInputChange('applicantType', v)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="company">Company</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">
              Nationality <span className="text-destructive">*</span>
            </Label>
            <Input
              value={formData.nationality}
              onChange={(e) => handleInputChange('nationality', e.target.value)}
              placeholder="e.g. Rwandan, Chinese..."
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Passport / ID (optional)</Label>
            <Input
              value={formData.passportId}
              onChange={(e) => handleInputChange('passportId', e.target.value)}
              placeholder="AB1234567"
              className="text-sm"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Service Details (Category-specific) */}
      <ServiceDetailsSection service={service} formData={formData} handleInputChange={handleInputChange} />

      {/* Section 3: Documents */}
      {requiredDocs.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Documents
          </h3>
          <div className="space-y-3">
            {requiredDocs.map((doc: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-muted-foreground">📎</span>
                <span className="flex-1">{doc}</span>
              </div>
            ))}
          </div>

          {/* Upload Area */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="font-medium text-sm">Click to upload documents</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 10 MB each</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </div>

          {/* Uploading Files */}
          {uploadingFiles.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">Uploading...</p>
              {uploadingFiles.map((file) => (
                <div key={file.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate">{file.name}</span>
                    <span className="text-muted-foreground">{file.progress}%</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Uploaded Files */}
          {uploadedDocs.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-xs font-medium">Uploaded ({uploadedDocs.length})</p>
              {uploadedDocs.map((doc: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm truncate">{doc.name}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveDocument(i)}
                    className="text-muted-foreground hover:text-destructive transition shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Section 4: Additional Notes */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Additional Notes
        </h3>
        <div className="space-y-2">
          <Label className="text-sm">Any special instructions or context... (optional)</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Any additional information we should know..."
            className="min-h-[100px] text-sm resize-none"
          />
        </div>
      </section>

      {/* Continue Button */}
      <button
        onClick={() => {
          if (validateStep1()) {
            onNext()
          }
        }}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-medium transition-colors"
      >
        Continue to Payment →
      </button>
    </div>
  )
}

// ─── Service Details Section (Category-specific) ────────────────────────────────

function ServiceDetailsSection({ service, formData, handleInputChange }: any) {
  const category = service.category as ServiceCategory

  if (category === 'visa') {
    return (
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Service Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Destination Country</Label>
            <Input
              value={formData.destinationCountry}
              onChange={(e) => handleInputChange('destinationCountry', e.target.value)}
              placeholder="e.g. Rwanda, France..."
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Travel Date</Label>
            <Input
              type="date"
              value={formData.travelDate}
              onChange={(e) => handleInputChange('travelDate', e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Return Date</Label>
            <Input
              type="date"
              value={formData.returnDate}
              onChange={(e) => handleInputChange('returnDate', e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Purpose of Visit</Label>
            <Select value={formData.purposeOfVisit} onValueChange={(v) => handleInputChange('purposeOfVisit', v)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select purpose" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tourism">Tourism</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="study">Study</SelectItem>
                <SelectItem value="work">Work</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>
    )
  }

  if (category === 'translation') {
    return (
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Service Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Source Language</Label>
            <Select value={formData.sourceLanguage} onValueChange={(v) => handleInputChange('sourceLanguage', v)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Target Language</Label>
            <Select value={formData.targetLanguage} onValueChange={(v) => handleInputChange('targetLanguage', v)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-sm">Document Type</Label>
            <Input
              value={formData.documentType}
              onChange={(e) => handleInputChange('documentType', e.target.value)}
              placeholder="e.g. Certificate, Contract..."
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Urgency</Label>
            <Select value={formData.urgency} onValueChange={(v) => handleInputChange('urgency', v)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="express">Express</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>
    )
  }

  if (category === 'consultancy') {
    return (
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Service Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-sm">Company / Project Name</Label>
            <Input
              value={formData.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              placeholder="Your company or project name"
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Business Stage</Label>
            <Select value={formData.businessStage} onValueChange={(v) => handleInputChange('businessStage', v)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="idea">Idea</SelectItem>
                <SelectItem value="startup">Startup</SelectItem>
                <SelectItem value="growing">Growing</SelectItem>
                <SelectItem value="established">Established</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Preferred Meeting Format</Label>
            <Select value={formData.meetingFormat} onValueChange={(v) => handleInputChange('meetingFormat', v)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in-person">In-person</SelectItem>
                <SelectItem value="video">Video Call</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-sm">
              Brief description of your needs <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Tell us about your business needs..."
              className="min-h-[100px] text-sm resize-none"
            />
          </div>
        </div>
      </section>
    )
  }

  if (category === 'accounting') {
    return (
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Service Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-sm">Business Name</Label>
            <Input
              value={formData.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              placeholder="Your business name"
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Business Type</Label>
            <Select value={formData.businessType} onValueChange={(v) => handleInputChange('businessType', v)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sole-proprietor">Sole Proprietor</SelectItem>
                <SelectItem value="partnership">Partnership</SelectItem>
                <SelectItem value="ltd-company">Ltd Company</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Fiscal Year End</Label>
            <Input
              value={formData.fiscalYearEnd}
              onChange={(e) => handleInputChange('fiscalYearEnd', e.target.value)}
              placeholder="e.g. December 31"
              className="text-sm"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-sm">
              Brief description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Tell us about your accounting needs..."
              className="min-h-[100px] text-sm resize-none"
            />
          </div>
        </div>
      </section>
    )
  }

  // Default for other categories
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Service Details
      </h3>
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">Company / Project Name (optional)</Label>
          <Input
            value={formData.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            placeholder="Your company or project name"
            className="text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Brief description of your needs</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Tell us what you need..."
            className="min-h-[100px] text-sm resize-none"
          />
        </div>
      </div>
    </section>
  )
}

// ─── Step 2: Payment ──────────────────────────────────────────────────────────

function Step2Payment({ service, formData, uploadedDocs, portal, onBack }: any) {
  const navigate = useNavigate()
  const [processing, setProcessing] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const basePrice = service.price_usd_min ?? 0
  const rwfPrice = Math.round(basePrice * 1285)

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setProcessing(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('User not authenticated')
        setProcessing(false)
        return
      }

      // Pick a random staff member with the required capability
      const capability = CAT_CAPABILITY[service.category as ServiceCategory] || 'handle_consultancy'
      const { data: staffData } = await supabase
        .from('staff_capabilities')
        .select('user_id')
        .eq('capability', capability)
        .limit(10)

      const staffId =
        staffData && staffData.length > 0
          ? staffData[Math.floor(Math.random() * staffData.length)].user_id
          : null

      // Create service request
      const { data: requestData, error: requestError } = await supabase
        .from('service_requests')
        .insert({
          client_id: user.id,
          service_id: service.id,
          service_category: service.category,
          status: 'submitted',
          progress_step: 1,
          progress_total: 5,
          assigned_staff_id: staffId,
          applicant_type: formData.applicantType,
          priority: 'normal',
          notes: formData.notes || null,
          portal_source: portal,
        })
        .select()
        .single()

      if (requestError) throw requestError
      if (!requestData) throw new Error('Failed to create service request')

      // Insert uploaded documents
      if (uploadedDocs.length > 0) {
        const documentInserts = uploadedDocs.map((doc: any) => {
          const fileExt = doc.name.split('.').pop() || 'unknown'
          return {
            service_request_id: requestData.id,
            client_id: user.id,
            uploaded_by: user.id,
            file_path: doc.path,
            file_name: doc.name,
            file_type: fileExt,
            file_size_bytes: null,
            status: 'uploaded' as const,
            is_final_delivery: false,
          }
        })

        const { error: docError } = await supabase.from('documents').insert(documentInserts)

        if (docError) console.error('Failed to insert documents:', docError)
      }

      toast.success('Service request created successfully!')
      navigate({
        to: '/dashboard/confirmation/$requestId',
        params: { requestId: requestData.id },
      })
    } catch (error) {
      console.error('Payment finalization error:', error)
      toast.error((error as Error).message || 'Failed to process payment')
      setProcessing(false)
    }
  }

  const handlePaymentError = (message: string, error?: unknown) => {
    console.error('Payment error:', error)
    toast.error(message)
    setProcessing(false)
  }

  if (basePrice === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="rounded-lg border bg-muted/30 p-6 space-y-4">
          <h2 className="font-semibold text-base">Free Service</h2>
          <p className="text-sm text-muted-foreground">
            This service is free to request. Click the button below to submit your application.
          </p>
          <button
            onClick={() => handlePaymentSuccess('free')}
            disabled={processing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-medium transition-colors disabled:opacity-50"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 inline animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Application'
            )}
          </button>
        </div>
        <button
          onClick={onBack}
          className="w-full border rounded-lg py-3 font-medium hover:bg-muted transition-colors"
        >
          ← Back to Application
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {!showPaymentForm && (
        <div className="rounded-lg border bg-muted/30 p-6 space-y-4">
          <h2 className="font-semibold text-base">Payment Summary</h2>

          {/* Service Summary Card */}
          <div className="rounded-lg border border-border/50 bg-background p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{service.name_en}</p>
                <p className="text-xs text-muted-foreground capitalize">{service.category}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">${basePrice.toFixed(2)} USD</p>
                <p className="text-xs text-muted-foreground">≈ RWF {rwfPrice.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              You will be redirected to a secure payment page to complete your payment.
            </p>
            <button
              onClick={() => setShowPaymentForm(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-medium transition-colors"
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      )}

      {showPaymentForm && (
        <StripePaymentForm
          amount={basePrice}
          serviceTitle={service.name_en}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPaymentForm(false)}
          onError={handlePaymentError}
        />
      )}

      <button
        onClick={onBack}
        disabled={showPaymentForm || processing}
        className="w-full border rounded-lg py-3 font-medium hover:bg-muted transition-colors disabled:opacity-50"
      >
        ← Back to Application
      </button>
    </div>
  )
}
