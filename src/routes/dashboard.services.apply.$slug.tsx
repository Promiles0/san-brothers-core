import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Check } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { usePortal } from '@/lib/portal-context'

export const Route = createFileRoute('/dashboard/services/apply/$slug')({
  component: ServiceApplyPage,
})

function ServiceApplyPage() {
  const { slug } = Route.useParams()
  const navigate = useNavigate()
  const { current: portal } = usePortal()
  
  const [service, setService] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [notes, setNotes] = useState('')
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([])

  useEffect(() => {
    supabase
      .from('services')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          navigate({ to: '/dashboard/services' })
          return
        }
        setService(data)
        setLoading(false)
      })
  }, [slug])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 
        border-b-2 border-blue-500" />
    </div>
  )

  if (!service) return null

  const steps = [
    { number: 1, label: 'Details' },
    { number: 2, label: 'Documents' },
    { number: 3, label: 'Payment' },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <Link 
            to="/dashboard/services"
            className="flex items-center gap-2 text-sm 
              text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Services
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">
                {service.name_en}
              </h1>
              <p className="text-sm text-muted-foreground capitalize">
                {service.category}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                ${service.price_usd_min}–${service.price_usd_max}
              </p>
              <p className="text-xs text-muted-foreground">USD</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center mt-4 gap-2">
            {steps.map((s, i) => (
              <div key={s.number} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center justify-center 
                  w-7 h-7 rounded-full text-xs font-medium
                  ${step > s.number 
                    ? 'bg-green-500 text-white' 
                    : step === s.number 
                      ? 'bg-blue-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                  {step > s.number 
                    ? <Check className="h-3 w-3" /> 
                    : s.number}
                </div>
                <span className={`text-xs hidden sm:block
                  ${step === s.number 
                    ? 'text-foreground font-medium' 
                    : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-px 
                    ${step > s.number ? 'bg-green-500' : 'bg-muted'}`} 
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {step === 1 && (
          <Step1Details
            service={service}
            notes={notes}
            setNotes={setNotes}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2Documents
            service={service}
            uploadedDocs={uploadedDocs}
            setUploadedDocs={setUploadedDocs}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <Step3Payment
            service={service}
            notes={notes}
            uploadedDocs={uploadedDocs}
            portal={portal}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  )
}

// ── Step 1: Details ──────────────────────────────
function Step1Details({ service, notes, setNotes, onNext }: any) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="font-semibold">Service Details</h2>
        <p className="text-sm text-muted-foreground">
          {service.description_en}
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Price range</p>
            <p className="font-medium">
              ${service.price_usd_min}–${service.price_usd_max} USD
            </p>
            <p className="text-xs text-muted-foreground">
              ≈ RWF {(service.price_usd_min * 1285).toLocaleString()}–
              {(service.price_usd_max * 1285).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Duration</p>
            <p className="font-medium">
              {service.estimated_days_min}–
              {service.estimated_days_max} days
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Additional notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any specific requirements or information 
for our team..."
          className="w-full min-h-[120px] rounded-md border 
            bg-background px-3 py-2 text-sm resize-none
            focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        onClick={onNext}
        className="w-full bg-blue-600 hover:bg-blue-700 
          text-white rounded-lg py-3 font-medium 
          transition-colors"
      >
        Continue to Documents →
      </button>
    </div>
  )
}

// ── Step 2: Documents ────────────────────────────
function Step2Documents({ 
  service, uploadedDocs, setUploadedDocs, onBack, onNext 
}: any) {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    const path = `${user?.id}/${Date.now()}-${file.name}`
    
    const { error } = await supabase.storage
      .from('client-documents')
      .upload(path, file)
    
    if (!error) {
      setUploadedDocs((prev: any[]) => [...prev, { 
        name: file.name, 
        path 
      }])
    }
    setUploading(false)
  }

  const requiredDocs = service.required_documents || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold mb-1">Upload Documents</h2>
        <p className="text-sm text-muted-foreground">
          {requiredDocs.length > 0 
            ? 'Please upload the required documents below.'
            : 'No specific documents required for this service.'}
        </p>
      </div>

      {requiredDocs.length > 0 && (
        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-sm font-medium">Required documents:</p>
          {requiredDocs.map((doc: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              {doc}
            </div>
          ))}
        </div>
      )}

      <label className="flex flex-col items-center justify-center 
        w-full h-32 border-2 border-dashed rounded-lg 
        cursor-pointer hover:bg-muted/50 transition-colors">
        <div className="text-center">
          <p className="text-sm font-medium">
            {uploading ? 'Uploading...' : 'Click to upload documents'}
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, JPG, PNG up to 10MB
          </p>
        </div>
        <input 
          type="file" 
          className="hidden" 
          onChange={handleUpload}
          disabled={uploading}
          accept=".pdf,.jpg,.jpeg,.png"
        />
      </label>

      {uploadedDocs.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Uploaded ({uploadedDocs.length}):
          </p>
          {uploadedDocs.map((doc: any, i: number) => (
            <div key={i} className="flex items-center gap-2 
              text-sm bg-muted rounded-lg px-3 py-2">
              <Check className="h-4 w-4 text-green-500" />
              {doc.name}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 border rounded-lg py-3 font-medium
            hover:bg-muted transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-blue-600 hover:bg-blue-700 
            text-white rounded-lg py-3 font-medium 
            transition-colors"
        >
          Continue to Payment →
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Payment ──────────────────────────────
function Step3Payment({ 
  service, notes, uploadedDocs, portal, onBack 
}: any) {
  // Import and use existing StripePaymentForm component
  // Pass amount = service.price_usd_min
  // On success: create service_request + navigate to confirmation
  
  const navigate = useNavigate()
  const [requestId, setRequestId] = useState<string | null>(null)

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('service_requests')
      .insert({
        client_id: user?.id,
        service_id: service.id,
        status: 'submitted',
        notes,
        portal_source: portal,
        payment_intent_id: paymentIntentId,
      })
      .select('id')
      .single()

    if (data) {
      // Insert uploaded documents
      if (uploadedDocs.length > 0) {
        await supabase.from('documents').insert(
          uploadedDocs.map((doc: any) => ({
            client_id: user?.id,
            service_request_id: data.id,
            file_path: doc.path,
            file_name: doc.name,
            bucket: 'client-documents',
          }))
        )
      }
      
      navigate({ 
        to: '/dashboard/confirmation/$requestId',
        params: { requestId: data.id }
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold mb-1">Payment</h2>
        <p className="text-sm text-muted-foreground">
          Complete your payment to submit the application.
        </p>
      </div>

      {/* Import existing StripePaymentForm here */}
      {/* 
        <StripePaymentForm
          amount={service.price_usd_min}
          serviceTitle={service.name_en}
          onSuccess={handlePaymentSuccess}
        />
      */}
      
      {/* Temporary placeholder until import is wired */}
      <div className="rounded-lg border p-4 text-center text-sm 
        text-muted-foreground">
        Payment form loads here
        <br/>
        Amount: ${service.price_usd_min} USD
      </div>

      <button
        onClick={onBack}
        className="w-full border rounded-lg py-3 font-medium
          hover:bg-muted transition-colors"
      >
        ← Back to Documents
      </button>
    </div>
  )
}
